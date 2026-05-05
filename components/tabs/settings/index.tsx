/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { PluginNative } from "@utils/types";
import { React, TextInput } from "@webpack/common";

import { settings } from "../../../settings";
import { ChipKind } from "../../ui/IdChipInput";
import { Note } from "../../ui/Note";
import { Setting } from "./Setting";

const Native = VencordNative.pluginHelpers.SolRadar as PluginNative<typeof import("../../../native")>;

// ─── Shared styles ────────────────────────────────────────────────────────────

const sectionTitle: React.CSSProperties = {
    color: "var(--text-muted)",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 4,
    marginTop: 20,
};

// ─── ADB section ─────────────────────────────────────────────────────────────

function AdbEntries() {
    const { ldpAdbDeviceSerial } = settings.use(["ldpAdbDeviceSerial"]);
    const [devicesOutput, setDevicesOutput] = React.useState<string | null>(null);
    const [checking, setChecking] = React.useState(false);

    const handleCheck = async () => {
        setChecking(true);
        setDevicesOutput(null);
        const result = await Native.listAdbDevices(settings.store.ldpAdbPath);
        setDevicesOutput(result.ok ? result.output : `Error: ${result.error}`);
        setChecking(false);
    };

    return (
        <>
            <Setting id="ldpAdbPath" label="ADB Path" description="Path to adb.exe." />
            <div style={{
                display: "flex",
                flexDirection: "column",
                padding: "10px 14px",
                borderRadius: 8,
                background: "var(--background-mod-subtle)",
            }}>
                <span style={{ color: "var(--control-secondary-text-default)", fontSize: 14, fontWeight: 500 }}>
                    ADB Device Serial
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.4, marginTop: 2 }}>
                    Serial of the target device. Default: emulator-5554
                </span>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                    <TextInput
                        style={{ flex: 1 }}
                        value={ldpAdbDeviceSerial ?? ""}
                        onChange={v => { settings.store.ldpAdbDeviceSerial = v; }}
                        placeholder="emulator-5554"
                    />
                    <Button
                        size="medium"
                        variant="primary"
                        onClick={handleCheck}
                        disabled={checking}
                    >
                        {checking ? "Checking…" : "Check devices"}
                    </Button>
                </div>
                {devicesOutput && (
                    <pre style={{
                        margin: "6px 0 0",
                        padding: "8px 10px",
                        background: "var(--background-mod-strong)",
                        borderRadius: "var(--radius-sm, 4px)",
                        color: "var(--text-default)",
                        fontSize: 12,
                        fontFamily: "var(--font-code)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all",
                    }}>
                        {devicesOutput}
                    </pre>
                )}
            </div>
            <Setting id="ldpAdbPackageName" label="ADB Package Name" description="Package to force-stop on the device. Default: com.roblox.client" />
        </>
    );
}

// ─── SettingsTab ──────────────────────────────────────────────────────────────

type SettingEntry = {
    id: keyof typeof settings.store;
    label: string;
    description?: string;
    chipKind?: ChipKind;
};

type Section = {
    title: string;
    note?: React.ReactNode;
    entries: SettingEntry[];
    CustomEntries?: React.FC;
};

export function SettingsTab() {
    const { linkVerification, robloxToken, onBiomeFalse, onBiomeEnd } = settings.use([
        "linkVerification",
        "robloxToken",
        "onBiomeFalse",
        "onBiomeEnd",
    ]);
    const [search, setSearch] = React.useState("");

    const verificationEnabled = linkVerification !== "disabled";
    const hasToken = !!robloxToken;

    const sections: Section[] = [
        {
            title: "General",
            entries: [
                { id: "autoJoinEnabled", label: "Auto-joins", description: "Allow triggers to auto-join servers. Disable this to quickly pause all auto-joins without touching individual triggers." },
                { id: "notificationEnabled", label: "Notifications", description: "Show a desktop notification when a trigger matches." },
                { id: "flattenEmbeds", label: "Interpret Embeds", description: "Include embed titles and descriptions when matching triggers. Enable this if you monitor macro servers that post biomes inside embeds rather than plain messages." },
                { id: "deduplicateLinks", label: "Deduplicate Links", description: "Prevents duplicate links from being sniped. If a link is seen twice within 10 minutes, the second snipe will be ignored." },
                { id: "privateServerLink", label: "Private Server Link", description: "Your private server link. Some actions require a private server link to use." },
            ],
        },
        {
            title: "Game Launch",
            entries: [
                { id: "closeGameBeforeJoin", label: "Close Game Before Joining", description: "Closes any running Roblox instance before launching a new one. Prevents silent join failures at the cost of extra latency. Only disable if you always close the game yourself before sniping." },
                { id: "killMode", label: "Close Mode", description: "How to close Roblox before joining. 'Await' waits for the process to fully die before launching (reliable, slower). 'Fire and forget' sends the kill signal and waits a fixed delay (faster, may fail if delay is too low)." },
                { id: "closeGameDelay", label: "Close Game Delay (ms)", description: "Delay between kill signal and launch when using fire-and-forget mode. Increase if joins are failing." },
                { id: "useBrowserLaunch", label: "Browser Launch", description: "Launch the Roblox URI via window.open() instead of Native exec. May be faster, but openURI metrics become unreliable." },
            ],
        },
        {
            title: "ADB",
            note: (
                <>
                    {settings.store.killMode !== "ldp-adb" && (
                        <Note variant="warning">
                            "LDPlayer ADB" is not selected as the close mode. These settings will have no effect.
                        </Note>
                    )}
                    <Note>
                        ADB launch keeps the game open on the home screen. When a snipe triggers, the plugin instantly launches the join URI while sending a close signal via ADB.
                    </Note>
                </>
            ),
            entries: [],
            CustomEntries: AdbEntries,
        },
        {
            title: "Interface",
            entries: [
                { id: "hideInactiveIndicator", label: "Hide Inactive Indicator", description: "Hide the red dot on the menu button when auto-join is disabled." },
            ],
        },
        {
            title: "Forwarding",
            entries: [
                { id: "globalWebhookUrl", label: "Global Webhook URL" },
                { id: "censorWebhooks", label: "Censor Webhooks", description: "Redact sender and channel info from forwarded webhook messages." },
                { id: "forwardIgnoredGuilds", label: "Forward Ignored Guilds", chipKind: "guild", description: "Messages from these servers are NEVER forwarded." },
            ],
        },
        {
            title: "Channel Monitoring",
            entries: [
                { id: "monitoredChannels", label: "Monitored Channels", chipKind: "channel", description: "When set, only messages in these channels are considered. Leave empty to watch all channels." },
                { id: "ignoredGuilds", label: "Ignored Guilds", chipKind: "guild", description: "Messages from these servers are always ignored, regardless of trigger settings." },
                { id: "ignoredChannels", label: "Ignored Channels", chipKind: "channel", description: "Messages in these channels are always ignored, regardless of trigger settings." },
                { id: "ignoredUsers", label: "Ignored Users", chipKind: "user", description: "Messages from these users are always ignored, regardless of trigger settings." },
            ],
        },
        {
            title: "Link Verification",
            entries: [
                { id: "linkVerification", label: "Verification Mode" },
                ...(verificationEnabled ? [
                    { id: "allowedPlaceIds" as const, label: "Allowed Place IDs", description: "Comma-separated. Only links pointing to these Place IDs will be accepted. Leave empty to allow any place." },
                    { id: "onBadLink" as const, label: "Action on Bad Link" },
                ] : []),
            ],
            note: verificationEnabled ? (
                <>
                    {!hasToken && (
                        <Note variant="danger">
                            No Roblox token configured — link verification won't work without one.
                            Open Vencord's plugin settings to add your token.
                        </Note>
                    )}
                    <Note variant="warning">
                        Your Roblox token is sensitive — treat it like a password and never share it.
                        It is strongly recommended to use an alt account's token instead of your main account's.
                    </Note>
                </>
            ) : (
                <Note variant="danger">
                    Link verification is disabled. The plugin will join any link without checking if it's valid.
                </Note>
            ),
        },
        {
            title: "Biome Detection",
            note: (
                <Note variant="warning">
                    Biome detection settings are managed on the plugin page in Vencord's plugin menu.
                    Any changes there require a Discord restart to take effect.
                </Note>
            ),
            entries: [
                { id: "onBiomeFalse", label: "Action on Fake Biome", description: "What to do when the biome you joined doesn't match what was announced." },
                ...(onBiomeFalse !== "nothing" ? [
                    { id: "biomeFalseActionTimeout" as const, label: "Fake Biome Action Delay (ms)", description: "Time to wait before executing the action. A cancellation prompt is shown during this window." },
                ] : []),
                { id: "onBiomeEnd", label: "Action on Biome End", description: "What to do when a confirmed biome ends (biome changed or disconnected)." },
                ...(onBiomeEnd !== "nothing" ? [
                    { id: "biomeEndActionTimeout" as const, label: "Biome End Action Delay (ms)", description: "Time to wait before executing the action. A cancellation prompt is shown during this window." },
                ] : []),
                ...((onBiomeFalse !== "nothing" || onBiomeEnd !== "nothing") ? [
                    { id: "skipActionConfirmation" as const, label: "Skip Action Confirmation", description: "Execute biome actions immediately, without showing the cancellation prompt." },
                ] : []),
            ],
        },
        {
            title: "Advanced",
            note: <Note variant="danger">Do <strong>NOT</strong> change these unless you know what you're doing.</Note>,
            entries: [
                { id: "ignoreWebhookForwards", label: "Ignore Webhook Forwards", description: 'Ignore any message whose embed footer contains "solradar". Prevents the plugin from acting on its own forwarded webhooks.' },
                { id: "customNotificationSoundDelay", label: "Custom Notification Sound Delay (ms)", description: "Delay in milliseconds before playing the trigger's defined custom notification sound." },
                { id: "omitAdbErrorNotifications", label: "Omit ADB error notifications", description: "Omits the notification sent when an ADB kill signal fails. Will still get logged to the console." },
                { id: "interpretJoinguardLinks", label: "Interpret Joinguard Links", description: "Interpret links from Sol's Stat Tracker Joinguard. Joinguard links will open your browser to handle cloudflare verification (we cannot bypass that!), also, we cannot verify the game from joinguard links!" },
            ],
        },
    ];

    const q = search.trim().toLowerCase();
    const filtered = q
        ? sections
            .map(s => {
                if (s.CustomEntries) return s.title.toLowerCase().includes(q) ? s : null;
                return { ...s, entries: s.entries.filter(e => e.label.toLowerCase().includes(q)) };
            })
            .filter((s): s is Section => s !== null && (!!s.CustomEntries || s.entries.length > 0))
        : sections;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingBottom: 20 }}>

            <TextInput
                value={search}
                onChange={setSearch}
                placeholder="Search settings…"
                style={{ marginBottom: 4 }}
            />

            {filtered.length === 0 && (
                <Note>No settings found for "{search}".</Note>
            )}

            {filtered.map(section => (
                <React.Fragment key={section.title}>
                    <p style={sectionTitle}>{section.title}</p>
                    {section.note}
                    {section.CustomEntries
                        ? <section.CustomEntries />
                        : section.entries.map(e => (
                            <Setting key={e.id} id={e.id} label={e.label} description={e.description} chipKind={e.chipKind} />
                        ))
                    }
                </React.Fragment>
            ))}

        </div>
    );
}
