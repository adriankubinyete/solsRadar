/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React, TextInput } from "@webpack/common";

import { settings } from "../../../../settings";
import { ChipKind } from "../../../IdChipInput";
import { Setting } from "./Setting";

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

const note = (variant: "default" | "warning" | "danger" = "default"): React.CSSProperties => ({
    color: variant === "default" ? "var(--text-muted)"
        : variant === "warning" ? "var(--status-warning)"
            : "var(--text-feedback-critical)",
    background: variant === "default" ? "var(--background-mod-subtle)"
        : variant === "warning" ? "hsl(38deg 95% 54% / 10%)"
            : "hsl(359deg 87% 54% / 10%)",
    border: `1px solid ${variant === "default" ? "transparent"
        : variant === "warning" ? "hsl(38deg 95% 54% / 25%)"
            : "hsl(359deg 87% 54% / 25%)"
        }`,
    fontSize: 12,
    lineHeight: 1.5,
    padding: "8px 12px",
    borderRadius: 6,
});

const noteBaseStyle: React.CSSProperties = {
    color: "var(--text-muted)",
    fontSize: 12,
    lineHeight: 1.5,
    padding: "8px 12px",
    borderRadius: 6,
    background: "var(--background-modifier-accent)",
};

const warningNote: React.CSSProperties = {
    ...noteBaseStyle,
    color: "var(--status-warning)",
    background: "hsl(38deg 95% 54% / 10%)",
};
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
};

export function SettingsTab() {
    const { linkVerification, robloxToken } = settings.use([
        "linkVerification",
        "robloxToken",
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
                        <p style={note("danger")}>
                            No Roblox token configured — link verification won't work without one.
                            Open Vencord's plugin settings to add your token.
                        </p>
                    )}
                    <p style={note("warning")}>
                        Your Roblox token is sensitive — treat it like a password and never share it.
                        It is strongly recommended to use an alt account's token instead of your main account's.
                    </p>
                </>
            ) : (
                <p style={note("danger")}>
                    Link verification is disabled. The plugin will join any link without checking if it's valid.
                </p>
            ),
        },
        {
            title: "Biome Detection",
            note: (
                <p style={note("warning")}>
                    Biome detection settings are managed on the plugin page in Vencord's plugin menu.
                    Any changes there require a Discord restart to take effect.
                </p>
            ),
            entries: [],
        },
        {
            title: "Advanced",
            note: <p style={note("danger")}>Do <strong>NOT</strong> change these unless you know what you're doing.</p>,
            entries: [
                { id: "ignoreWebhookForwards", label: "Ignore Webhook Forwards", description: 'Ignore any message whose embed footer contains "solradar". Prevents the plugin from acting on its own forwarded webhooks.' },
            ],
        },
    ];

    const q = search.trim().toLowerCase();
    const filtered = q
        ? sections
            .map(s => ({ ...s, entries: s.entries.filter(e => e.label.toLowerCase().includes(q)) }))
            .filter(s => s.entries.length > 0)
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
                <p style={note("default")}>No settings found for "{search}".</p>
            )}

            {filtered.map(section => (
                <React.Fragment key={section.title}>
                    <p style={sectionTitle}>{section.title}</p>
                    {section.note}
                    {section.entries.map(e => (
                        <Setting key={e.id} id={e.id} label={e.label} description={e.description} chipKind={e.chipKind} />
                    ))}
                </React.Fragment>
            ))}

        </div>
    );
}
