/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { FormSwitch } from "@components/FormSwitch";
import { Heading } from "@components/Heading";
import { ModalCloseButton, ModalContent, ModalFooter, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { React, Select, showToast, TextInput, Toasts, useEffect, useState } from "@webpack/common";

import { settings } from "../../../../settings";
import {
    addTrigger,
    DEFAULT_BIOME,
    deleteTrigger,
    makeDefaultTrigger,
    Trigger,
    TriggerBiome,
    TriggerConditions,
    TriggerForwarding,
    TriggerType,
    updateTrigger,
} from "../../../../stores/TriggerStore";
import { IdChipInput } from "../../../IdChipInput";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type InnerTab = "general" | "conditions" | "biome" | "forwarding" | "advanced";

const TRIGGER_TYPE_OPTIONS = [
    { label: "Rare Biome", value: "RARE_BIOME" },
    { label: "Event Biome", value: "EVENT_BIOME" },
    { label: "Biome", value: "BIOME" },
    { label: "Weather", value: "WEATHER" },
    { label: "Merchant", value: "MERCHANT" },
    { label: "Custom", value: "CUSTOM" },
];

const needsBiomeTab = (type: TriggerType) =>
    type === "RARE_BIOME" || type === "EVENT_BIOME" || type === "BIOME" || type === "WEATHER" || type === "CUSTOM";

const arrToStr = (arr: string[]) => arr.join(", ");
const strToArr = (str: string): string[] => str.split(",").map(s => s.trim()).filter(Boolean);

// ─── Shared styles ────────────────────────────────────────────────────────────

const S = {
    sectionTitle: {
        color: "var(--control-secondary-text-default)",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginBottom: 4,
        marginTop: 20,
    } as React.CSSProperties,

    sectionDescription: {
        color: "var(--text-muted)",
        fontSize: 13,
        margin: "8px 0",
        lineHeight: 1.4,
    } as React.CSSProperties,

    row: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 8,
        background: "var(--background-mod-subtle)",
    } as React.CSSProperties,

    rowStacked: {
        display: "flex",
        flexDirection: "column",
        gap: 0,
        padding: "10px 14px",
        borderRadius: 8,
        background: "var(--background-mod-subtle)",
    } as React.CSSProperties,

    rowLeft: {
        display: "flex",
        flexDirection: "column",
        gap: 3,
        flex: 1,
        minWidth: 0,
    } as React.CSSProperties,

    label: {
        color: "var(--control-secondary-text-default)",
        fontSize: 14,
        fontWeight: 500,
    } as React.CSSProperties,

    hint: {
        color: "var(--text-muted)",
        fontSize: 12,
        lineHeight: 1.4,
        marginTop: 2,
    } as React.CSSProperties,

    select: {
        background: "var(--background-tertiary)",
        border: "1px solid var(--background-mod-subtle)",
        borderRadius: 4,
        color: "var(--text-default)",
        fontSize: 13,
        padding: "5px 8px",
        cursor: "pointer",
        flexShrink: 0,
        maxWidth: 220,
    } as React.CSSProperties,

    note: {
        color: "var(--text-muted)",
        background: "var(--background-mod-subtle)",
        fontSize: 12,
        lineHeight: 1.5,
        padding: "8px 12px",
        borderRadius: 6,
        margin: 0,
    } as React.CSSProperties,

    noteWarning: {
        color: "var(--status-warning)",
        background: "hsl(38deg 95% 54% / 10%)",
        border: "1px solid hsl(38deg 95% 54% / 25%)",
        fontSize: 12,
        lineHeight: 1.5,
        padding: "8px 12px",
        borderRadius: 6,
        margin: 0,
    } as React.CSSProperties,

    noteDanger: {
        color: "var(--text-feedback-critical)",
        background: "hsl(359deg 87% 54% / 10%)",
        border: "1px solid hsl(359deg 87% 54% / 25%)",
        fontSize: 12,
        lineHeight: 1.5,
        padding: "8px 12px",
        borderRadius: 6,
        margin: 0,
    } as React.CSSProperties,

    noteSuccess: {
        color: "hsl(140deg 50% 50%)",
        background: "hsl(140deg 50% 50% / 10%)",
        border: "1px solid hsl(140deg 50% 50% / 25%)",
        fontSize: 12,
        lineHeight: 1.5,
        padding: "8px 12px",
        borderRadius: 6,
        margin: 0,
    } as React.CSSProperties,
};

// ─── Primitive field components ───────────────────────────────────────────────

function TextField({ label, hint, value, placeholder, onChange, type, maxLength }: {
    label: string; hint?: string; value: string;
    placeholder?: string; onChange: (v: string) => void; type?: string; maxLength?: number;
}) {
    return (
        <div style={S.rowStacked}>
            <span style={S.label}>{label}</span>
            {hint && <span style={S.hint}>{hint}</span>}
            <TextInput value={value} placeholder={placeholder} onChange={onChange} maxLength={maxLength} style={{ marginTop: 8 }} />
        </div>
    );
}

function TextAreaField({ label, hint, value, placeholder, onChange, maxLength }: {
    label: string; hint?: string; value: string;
    placeholder?: string; onChange: (v: string) => void; maxLength?: number;
}) {
    return (
        <div style={S.rowStacked}>
            <span style={S.label}>{label}</span>
            {hint && <span style={S.hint}>{hint}</span>}
            <textarea
                value={value}
                placeholder={placeholder}
                onChange={e => onChange(e.target.value)}
                maxLength={maxLength}
                style={{
                    marginTop: 8,
                    width: "100%",
                    resize: "vertical",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "1px solid var(--background-mod-subtle)",
                    background: "var(--background-tertiary)",
                    color: "var(--text-default)",
                    fontSize: 13,
                    fontFamily: "var(--font-primary)",
                    lineHeight: 1.5,
                    minHeight: 80,
                    boxSizing: "border-box",
                    outline: "none",
                    scrollbarWidth: "thin",
                }}
            />
        </div>
    );
}

function SwitchField({ label, hint, value, onChange }: {
    label: string; hint?: string; value: boolean; onChange: (v: boolean) => void;
}) {
    return (
        <div style={S.row}>
            <div style={S.rowLeft}>
                <span style={S.label}>{label}</span>
                {hint && <span style={S.hint}>{hint}</span>}
            </div>
            <FormSwitch title="" value={value} onChange={onChange} hideBorder />
        </div>
    );
}

function SelectField({ label, hint, options, value, onChange }: {
    label: string; hint?: string;
    options: { label: string; value: string; }[];
    value: string; onChange: (v: string) => void;
}) {
    return (
        <div style={S.row}>
            <div style={S.rowLeft}>
                <span style={S.label}>{label}</span>
                {hint && <span style={S.hint}>{hint}</span>}
            </div>
            <Select
                // style={S.select}
                options={options}
                select={selected => onChange(selected as string)}
                isSelected={opt => opt === value}
                serialize={String}
                closeOnSelect={true}
            />
        </div>
    );
}
// ─── KeywordsInput ────────────────────────────────────────────────────────────

function KeywordsInput({ label, hint, value, onChange, placeholder }: {
    label: string; hint?: string; value: string[];
    onChange: (v: string[]) => void; placeholder?: string;
}) {
    const [raw, setRaw] = React.useState(() => arrToStr(value));
    const prevRef = React.useRef(value);

    React.useEffect(() => {
        if (prevRef.current !== value) { prevRef.current = value; setRaw(arrToStr(value)); }
    }, [value]);

    const commit = () => {
        const arr = strToArr(raw);
        prevRef.current = arr;
        onChange(arr);
        setRaw(arrToStr(arr));
    };

    return (
        <div style={S.rowStacked}>
            <span style={S.label}>{label}</span>
            {hint && <span style={S.hint}>{hint}</span>}
            <TextInput
                value={raw}
                placeholder={placeholder ?? "keyword1, keyword2, keyword3"}
                onChange={setRaw}
                onBlur={commit}
                style={{ marginTop: 8 }}
            />
        </div>
    );
}

// ─── IdChipInput ──────────────────────────────────────────────────────────────

function RoleChipInput({ roles, onChange }: {
    roles: { id: string; label: string; }[];
    onChange: (roles: { id: string; label: string; }[]) => void;
}) {
    const [newId, setNewId] = useState("");
    const [newLabel, setNewLabel] = useState("");

    const add = () => {
        const id = newId.trim();
        const label = newLabel.trim();
        if (!id || roles.some(r => r.id === id)) return;
        onChange([...roles, { id, label }]);
        setNewId("");
        setNewLabel("");
    };

    return (
        <div style={S.rowStacked}>
            <span style={S.label}>Mention roles</span>
            {/* <span style={S.hint}>Match if the message pings any of these roles. Description is optional just to keep track of what you've added.</span> */}

            {roles.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
                    {roles.map(r => (
                        <div key={r.id} style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 12px",
                            borderRadius: 6,
                            background: "var(--background-mod-strong)",
                        }}>
                            <div style={{
                                width: 28, height: 28, borderRadius: 6,
                                background: "var(--brand-500)",
                                color: "#fff", fontSize: 13, fontWeight: 700,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0,
                            }}>@</div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, color: "var(--text-default)", fontWeight: 500 }}>
                                    {r.label || r.id}
                                </div>
                                {r.label && (
                                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-code)" }}>
                                        {r.id}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => onChange(roles.filter(x => x.id !== r.id))}
                                style={{
                                    background: "none", border: "none", cursor: "pointer",
                                    color: "var(--text-muted)", fontSize: 18, padding: 0,
                                    lineHeight: 1, flexShrink: 0,
                                }}
                            >×</button>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                <div style={{ width: 160, flexShrink: 0 }}>
                    <TextInput
                        value={newId}
                        placeholder="Role ID"
                        onChange={setNewId}
                        onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && add()}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <TextInput
                        value={newLabel}
                        placeholder="Description (optional)"
                        onChange={setNewLabel}
                        onKeyDown={(e: React.KeyboardEvent) => e.key === "Enter" && add()}
                    />
                </div>
                <Button
                    size="small"
                    variant="primary"
                    disabled={!newId.trim() || roles.some(r => r.id === newId.trim())}
                    onClick={add}
                >
                    Add
                </Button>
            </div>
        </div>
    );
}

// ─── Tab: General ──────────────────────────────────────────────────────────

function GeneralTab({ draft, patch }: { draft: Omit<Trigger, "id">; patch: (p: Partial<Omit<Trigger, "id">>) => void; }) {
    const { name, description, iconUrl, type, state } = draft;
    const [iconAllowed, setIconAllowed] = useState<boolean | null>(null);

    const ALWAYS_ALLOWED_DOMAINS = [
        "github.io",
        "githubusercontent.com",
        "cdn.discordapp.com",
    ];

    useEffect(() => {
        if (!iconUrl) return void setIconAllowed(null);
        try {
            const { origin, hostname } = new URL(iconUrl);
            const hardcoded = ALWAYS_ALLOWED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`));
            if (hardcoded) return void setIconAllowed(true);
            VencordNative.csp.isDomainAllowed(origin, ["img-src"]).then(setIconAllowed);
        } catch {
            setIconAllowed(null);
        }
    }, [iconUrl]);

    const patchState = (p: Partial<typeof state>) => patch({ state: { ...state, ...p } });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>

            {/* ── Identity ── */}
            <p style={S.sectionTitle}>Identity</p>

            <SelectField
                label="Type *"
                hint="Controls what kind of event this trigger watches for."
                options={TRIGGER_TYPE_OPTIONS}
                value={type}
                onChange={v => patch({
                    type: v as TriggerType,
                    biome: needsBiomeTab(v as TriggerType)
                        ? (draft.biome ?? { ...DEFAULT_BIOME })
                        : undefined,
                })}
            />
            <TextField
                label="Name *"
                value={name}
                placeholder="e.g. Glitch"
                onChange={v => patch({ name: v })}
            />
            <TextField
                label="Description"
                value={description}
                placeholder="Optional — just for your own reference"
                onChange={v => patch({ description: v })}
            />
            <TextField
                label="Icon URL"
                value={iconUrl}
                hint="Optional. Paste a direct link to an image (must end in .png, .jpg, etc.)."
                placeholder="https://i.imgur.com/example.png"
                onChange={v => patch({ iconUrl: v })}
            />
            {iconAllowed === false && (
                <p style={{ ...S.noteDanger, fontSize: 14 }}>
                    This image probably won't load — Discord blocks external images that aren't on its allowlist.
                    Use an image from <strong>cdn.discordapp.com</strong>, <strong>imgur.com</strong> or <strong>githubusercontent.com</strong> instead.<br />
                    <strong>This doesn't affect how the trigger works, only the icon display.</strong>
                </p>
            )}
            {iconAllowed === true && (
                <p style={{ ...S.noteSuccess, fontSize: 14 }}>✅ This image should load correctly.</p>
            )}

            {/* ── Behavior ── */}
            <p style={S.sectionTitle}>Behavior</p>

            <SwitchField
                label="Enabled"
                hint="Turn this trigger on or off without deleting it."
                value={state.enabled}
                onChange={v => patchState({ enabled: v })}
            />
            <SwitchField
                label="Auto Join"
                hint="Automatically join the Roblox server when this trigger fires."
                value={state.autojoin}
                onChange={v => patchState({ autojoin: v })}
            />
            <SwitchField
                label="Notification"
                hint="Show a desktop notification when this trigger matches."
                value={state.notify}
                onChange={v => patchState({ notify: v })}
            />

            {/* ── Join Lock ── */}
            <p style={S.sectionTitle}>Join Lock</p>
            <p style={S.sectionDescription}>
                After this trigger fires, join lock temporarily blocks other auto-joins of equal or higher priority.
                Useful when the same biome gets posted multiple times in a row — without this, you'd get sent to the queue repeatedly.
            </p>

            <SwitchField
                label="Enable join lock"
                hint="Block other auto-joins for a short time after this trigger fires."
                value={state.joinlock}
                onChange={v => patchState({ joinlock: v })}
            />
            {state.joinlock && (
                <>
                    <TextField
                        label="Priority"
                        hint="Triggers with a lower number have higher priority. The join lock only blocks triggers at this priority level or higher. Default is 10."
                        value={String(state.priority)}
                        placeholder="10"
                        type="number"
                        onChange={v => patchState({ priority: Number(v) })}
                    />
                    <TextField
                        label="Lock Duration (seconds)"
                        hint="How many seconds to block auto-joins after this trigger fires."
                        value={String(state.joinlockDuration)}
                        placeholder="e.g. 30"
                        type="number"
                        onChange={v => patchState({ joinlockDuration: Number(v) })}
                    />
                </>
            )}

        </div>
    );
}

// ─── Tab: Conditions ──────────────────────────────────────────────────────────

function ConditionsTab({ conditions, onChange }: { conditions: TriggerConditions; onChange: (c: TriggerConditions) => void; }) {
    const { keywords } = conditions;

    const patchKeywords = (side: "match" | "exclude", p: Partial<typeof keywords.match>) =>
        onChange({ ...conditions, keywords: { ...keywords, [side]: { ...keywords[side], ...p } } });

    const strictHint = (example: string) =>
        `When enabled, "${example}" only matches the word "${example}" by itself — not "${example}s" or "${example}ing".`;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>

            <p style={S.sectionTitle}>Match Keywords</p>
            <p style={S.sectionDescription}>Message must contain at least one of these. Separate with commas.</p>
            <KeywordsInput label="Keywords" value={keywords.match.value} onChange={v => patchKeywords("match", { value: v })} placeholder="cyber, cyberspace, cyber space" />
            <SwitchField
                label="Strict match"
                hint={strictHint(keywords.match.value[0] ?? "cyber")}
                value={keywords.match.strict}
                onChange={v => patchKeywords("match", { strict: v })}
            />

            <p style={S.sectionTitle}>Exclude Keywords</p>
            <p style={S.sectionDescription}>Message must <strong>NOT</strong> contain any of these. Separate with commas.</p>
            <KeywordsInput label="Keywords" value={keywords.exclude.value} onChange={v => patchKeywords("exclude", { value: v })} placeholder="hunt, help" />
            <SwitchField
                label="Strict match"
                hint={strictHint(keywords.exclude.value[0] ?? "hunt")}
                value={keywords.exclude.strict}
                onChange={v => patchKeywords("exclude", { strict: v })}
            />

            <p style={S.sectionTitle}>Mention Roles</p>
            <p style={S.sectionDescription}>
                Match if the message pings any of these roles. Leave empty to skip this check.<br />
                <strong>If both keywords and roles are configured, either one is enough to match.</strong>
            </p>
            <RoleChipInput roles={conditions.mentionRoles} onChange={roles => onChange({ ...conditions, mentionRoles: roles })} />

        </div>
    );
}

// ─── Tab: Biome ───────────────────────────────────────────────────────────────

function BiomeTab({ biome, onChange }: { biome: TriggerBiome; onChange: (b: TriggerBiome) => void; }) {
    const { detectorEnabled, detectorAccounts } = settings.use(["detectorEnabled", "detectorAccounts"]);
    const patch = (p: Partial<TriggerBiome>) => onChange({ ...biome, ...p });

    const globallyDisabled = !detectorEnabled;
    const noAccounts = !detectorAccounts;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>

            {globallyDisabled && (
                <p style={S.noteDanger}>
                    Biome detection is disabled in the plugin settings. Enable it there first.
                </p>
            )}
            {!globallyDisabled && noAccounts && (
                <p style={S.noteDanger}>
                    No accounts configured. Biome detection will not work until you add one in the plugin settings.
                </p>
            )}

            <p style={S.sectionTitle}>Detection</p>

            <SwitchField
                label="Enable biome detection"
                hint="Verify the biome after joining by reading Roblox log files."
                value={biome.detectionEnabled}
                onChange={v => patch({ detectionEnabled: v })}
            />

            {biome.detectionEnabled ? (
                <>
                    <TextField
                        label="RPC Keyword"
                        hint='Matches the BloxstrapRPC "hoverText" field in the Roblox log. Case-insensitive.'
                        value={biome.detectionKeyword}
                        placeholder="e.g. GLITCHED"
                        onChange={v => patch({ detectionKeyword: v })}
                    />

                    <p style={S.sectionTitle}>Behavior</p>

                    <SwitchField
                        label="Skip redundant join"
                        hint="If already in the detected biome, skip the join. Will still notify."
                        value={biome.skipRedundantJoin}
                        onChange={v => patch({ skipRedundantJoin: v })}
                    />
                </>
            ) : (
                <p style={S.note}>Enable biome detection above to configure keyword and behavior options.</p>
            )}

        </div>
    );
}

// ─── Tab: Advanced ────────────────────────────────────────────────────────────

function AdvancedTab({ draft, patch }: { draft: Omit<Trigger, "id">; patch: (p: Partial<Omit<Trigger, "id">>) => void; }) {
    const { ignoredGuilds: settingIgnoredGuilds, ignoredChannels: settingIgnoredChannels } = settings.use([
        "ignoredGuilds", "ignoredChannels"
    ]);
    const { conditions } = draft;
    const {
        bypassMonitoredOnly, bypassIgnoredChannels, bypassIgnoredGuilds, bypassForwardIgnoredGuilds,
        bypassMatchAmbiguity, bypassLinkVerification, bypassLinkDeduplication,
        fromUser, ignoredChannels, ignoredGuilds, inChannel,
    } = conditions;

    const qtyIgnoredChannelsGlobal = settingIgnoredChannels.split(",").length;
    const qtyIgnoredGuildsGlobal = settingIgnoredGuilds.split(",").length;

    const patchConditions = (p: Partial<typeof conditions>) =>
        patch({ conditions: { ...conditions, ...p } });

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>

            {/* ── Filters ── */}
            <p style={S.sectionTitle}>Filters</p>
            <p style={S.sectionDescription}>
                Narrow down when this trigger fires. All active filters must pass for a match.
            </p>

            <IdChipInput
                kind="user"
                label="Allowed Users"
                hint="Only match messages from these users. Leave empty to allow any user."
                ids={fromUser}
                onChange={ids => patchConditions({ fromUser: ids })}
            />
            <IdChipInput
                kind="channel"
                label="Allowed Channels"
                hint="Only match in these channels, in addition to monitored channels. Leave empty for any channel."
                ids={inChannel}
                onChange={ids => patchConditions({ inChannel: ids })}
            />
            <IdChipInput
                kind="channel"
                label="Ignored Channels"
                hint={`Never match in these channels, even if other conditions pass.${qtyIgnoredChannelsGlobal ? ` (${qtyIgnoredChannelsGlobal} globally ignored)` : ""}`}
                ids={ignoredChannels}
                onChange={ids => patchConditions({ ignoredChannels: ids })}
            />
            <IdChipInput
                kind="guild"
                label="Ignored Guilds"
                hint={`Never match in these guilds. Useful for servers with no-sniper policies.${qtyIgnoredGuildsGlobal ? ` (${qtyIgnoredGuildsGlobal} globally ignored)` : ""}`}
                ids={ignoredGuilds}
                onChange={ids => patchConditions({ ignoredGuilds: ids })}
            />

            {/* ── Bypasses ── */}
            <p style={S.sectionTitle}>Bypasses</p>
            <p style={{ ...S.noteDanger, fontSize: 14 }}>
                These options disable global safety checks. Only enable them if you know what you're doing.
            </p>

            <SwitchField
                label="Bypass monitored channels"
                hint="Allows this trigger to search for matches in any channel."
                value={bypassMonitoredOnly}
                onChange={v => patchConditions({ bypassMonitoredOnly: v })}
            />
            <SwitchField
                label="Bypass ignored channels"
                hint="Allows matching even in globally ignored channels."
                value={bypassIgnoredChannels}
                onChange={v => patchConditions({ bypassIgnoredChannels: v })}
            />
            <SwitchField
                label="Bypass ignored guilds"
                hint="Allows matching even in globally ignored guilds."
                value={bypassIgnoredGuilds}
                onChange={v => patchConditions({ bypassIgnoredGuilds: v })}
            />
            <SwitchField
                label="Bypass forward ignored guilds"
                hint="Allows forwarding even from globally forward-ignored guilds."
                value={bypassForwardIgnoredGuilds}
                onChange={v => patchConditions({ bypassForwardIgnoredGuilds: v })}
            />
            <SwitchField
                label="Bypass match ambiguity"
                hint="Always treat this trigger as unambiguous, even if multiple triggers match simultaneously."
                value={bypassMatchAmbiguity}
                onChange={v => patchConditions({ bypassMatchAmbiguity: v })}
            />
            <SwitchField
                label="Bypass link verification"
                hint="Skip Place ID verification for this trigger."
                value={bypassLinkVerification}
                onChange={v => patchConditions({ bypassLinkVerification: v })}
            />
            <SwitchField
                label="Bypass link deduplication"
                hint="Skip the duplication check for this trigger."
                value={bypassLinkDeduplication}
                onChange={v => patchConditions({ bypassLinkDeduplication: v })}
            />

        </div>
    );
}

// ─── Tab: Forwarding ─────────────────────────────────────────────────────────

function ForwardingTab({ forwarding, onChange, showBiome }: {
    forwarding: TriggerForwarding;
    onChange: (f: TriggerForwarding) => void;
    showBiome: boolean;
}) {
    const { globalWebhookUrl, forwardIgnoredGuilds } = settings.use([
        "globalWebhookUrl", "forwardIgnoredGuilds"
    ]);

    const globalWebhook = globalWebhookUrl || "";
    const qtyIgnoredGuilds = forwardIgnoredGuilds.split(",").length;

    const patch = (p: Partial<TriggerForwarding>) => onChange({ ...forwarding, ...p });
    const hasEffectiveWebhook = forwarding.webhookUrl.trim() || globalWebhook.trim();

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <p style={{ ...S.noteWarning, fontSize: 14 }}>
                ⚠️ This section is intended for advanced users only. Forwarding is <strong>not required</strong> for
                normal use — most users should leave this unconfigured. Sending webhooks on every match can trigger
                Discord's rate limits and get your webhook permanently disabled. Only set this up if you know exactly
                what you are doing.
            </p>

            {/* ── Webhook ── */}
            <p style={S.sectionTitle}>Webhook</p>
            <p style={S.sectionDescription}>
                Where to send forwarded messages. Leave blank to use the global webhook configured in the plugin settings.
            </p>

            <TextField
                label="Webhook URL"
                hint={
                    globalWebhook
                        ? `Leave empty to use global webhook: ${globalWebhook.slice(0, 48)}…`
                        : "No global webhook configured. Set one in plugin settings, or provide one here."
                }
                value={forwarding.webhookUrl}
                placeholder="https://discord.com/api/webhooks/…"
                onChange={v => patch({ webhookUrl: v })}
            />

            <TextAreaField
                label="Message content"
                hint="Text sent outside the embed. Leave empty for none. Max 2000 characters."
                value={forwarding.webhookContent}
                onChange={v => patch({ webhookContent: v })}
                maxLength={2000}
            />

            <TextAreaField
                label="Embed description"
                hint="Text to prepended to the embed description. Leave empty for default. Max 2000 characters."
                value={forwarding.webhookEmbedDescription}
                onChange={v => patch({ webhookEmbedDescription: v })}
                maxLength={2000}
            />

            {!hasEffectiveWebhook && (
                <p style={S.noteWarning}>
                    No webhook is configured. Forwarding will do nothing even when enabled. Set a webhook here or in plugin settings.
                </p>
            )}

            {/* ── On Match ── */}
            <p style={S.sectionTitle}>On Match</p>

            <SwitchField
                label="Enabled"
                hint="Sends a message to the webhook when the trigger matches."
                value={forwarding.onMatch.enabled}
                onChange={v => patch({ onMatch: { ...forwarding.onMatch, enabled: v } })}
            />

            {forwarding.onMatch.enabled && (
                <SwitchField
                    label="Early forward"
                    hint="Forward as early as possible. Can slightly impact join speed."
                    value={forwarding.onMatch.early}
                    onChange={v => patch({ onMatch: { ...forwarding.onMatch, early: v } })}
                />
            )}

            {/* ── On Detection (biome types only) ── */}
            {showBiome && <>
                <p style={S.sectionTitle}>On Detection</p>

                <SwitchField
                    label="Enabled"
                    hint="Sends a message to the webhook when the biome is detected."
                    value={forwarding.onDetection.enabled}
                    onChange={v => patch({ onDetection: { enabled: v } })}
                />
                <p style={S.note}>
                    For this to work, you obviously need to have biome detection set up in settings, and you need to join the biome to actually do the detection. It is impossible to verify if a biome is real or not without joining it.
                </p>
            </>}

            {!showBiome && (
                <p style={S.note}>
                    On-detection forwarding is only available for trigger types that support biome detection
                    (Rare Biome, Event Biome, Biome, Weather, Custom).
                </p>
            )}

            {/* ── Forwarding Filters ── */}
            <p style={S.sectionTitle}>Forwarding Filters</p>
            <p style={S.sectionDescription}>
                Messages originating from these will <strong>never</strong> be forwarded. Useful for guilds with no-sharing policies, or other reasons you might have to not want a forward.
            </p>
            <IdChipInput
                kind="guild"
                label="Excluded Guilds"
                hint={`Add any server you don't want to forward matches from.${qtyIgnoredGuilds > 0 ? ` (${qtyIgnoredGuilds} globally ignored)` : ""}`}
                ids={forwarding.excludedGuilds ?? []}
                onChange={ids => patch({ excludedGuilds: ids })}
            />
            <IdChipInput
                kind="channel"
                label="Excluded Channels"
                hint="Add any channel you don't want to forward matches from."
                ids={forwarding.excludedChannels ?? []}
                onChange={ids => patch({ excludedChannels: ids })}
            />

        </div>
    );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const tabBarStyles = {
    bar: {
        display: "flex",
        gap: 2,
        borderBottom: "2px solid var(--background-modifier-accent)",
        padding: "0 16px",
        flexShrink: 0,
    } as React.CSSProperties,
    btn: (active: boolean): React.CSSProperties => ({
        background: "none",
        border: "none",
        borderBottom: active ? "2px solid var(--brand-500)" : "2px solid transparent",
        marginBottom: -2,
        padding: "8px 14px",
        color: active ? "var(--text-default)" : "var(--text-muted)",
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        fontSize: 14,
    }),
};

// ─── Modal ────────────────────────────────────────────────────────────────────

interface TriggerModalProps { modalProps: ModalProps; trigger?: Trigger; }

function TriggerModal({ modalProps, trigger }: TriggerModalProps) {
    const isEditing = trigger !== undefined;
    const [innerTab, setInnerTab] = useState<InnerTab>("general");
    const [draft, setDraft] = useState<Omit<Trigger, "id">>(
        trigger ? (({ id, ...rest }) => rest)(trigger) : makeDefaultTrigger("BIOME")
    );

    const patch = (p: Partial<Omit<Trigger, "id">>) => setDraft(prev => ({ ...prev, ...p }));
    const isValid = draft.name.trim().length > 0;

    const showBiome = needsBiomeTab(draft.type);
    const tabs: { id: InnerTab; label: string; }[] = [
        { id: "general", label: "General" },
        { id: "conditions", label: "Conditions" },
        ...(showBiome ? [{ id: "biome" as InnerTab, label: "Biome" }] : []),
        { id: "forwarding", label: "Forwarding" },
        { id: "advanced", label: "Advanced" },
    ];
    if (innerTab === "biome" && !showBiome) setInnerTab("general");

    const handleSave = async () => {
        if (!isValid) return;
        if (isEditing) await updateTrigger(trigger.id, draft);
        else await addTrigger(draft);
        showToast(isEditing ? `Trigger "${draft.name}" updated!` : "Trigger added!", Toasts.Type.SUCCESS);
        modalProps.onClose();
    };

    const handleDelete = async () => {
        if (!isEditing) return;
        await deleteTrigger(trigger.id);
        showToast("Trigger deleted.", Toasts.Type.MESSAGE);
        modalProps.onClose();
    };

    const handleCopy = () => {
        try {
            const { id, ...rest } = trigger!;
            navigator.clipboard.writeText(JSON.stringify([rest], null, 2));
            showToast("Trigger copied to clipboard!", Toasts.Type.SUCCESS);
        } catch (e) {
            showToast(`Failed to copy trigger: ${e}`, Toasts.Type.FAILURE);
        }
    };

    const handleExportAsFile = () => {
        try {
            const { id, ...rest } = trigger!;
            const blob = new Blob([JSON.stringify([rest], null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `solsradar-trigger-${draft.name.trim().replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast("Trigger exported!", Toasts.Type.SUCCESS);
        } catch (e) {
            showToast(`Failed to export trigger: ${e}`, Toasts.Type.FAILURE);
        }
    };

    return (
        <ModalRoot {...modalProps} size={ModalSize.MEDIUM}>

            <ModalHeader>
                <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                    <Heading tag="h5">{isEditing ? `Edit — ${trigger.name}` : "Add Trigger"}</Heading>
                    <ModalCloseButton onClick={modalProps.onClose} />
                </div>
            </ModalHeader>

            <div style={tabBarStyles.bar}>
                {tabs.map(t => (
                    <button key={t.id} style={tabBarStyles.btn(innerTab === t.id)} onClick={() => setInnerTab(t.id)}>
                        {t.label}
                    </button>
                ))}
            </div>

            <ModalContent separator>
                {innerTab === "general" && <GeneralTab draft={draft} patch={patch} />}
                {innerTab === "conditions" && <ConditionsTab conditions={draft.conditions} onChange={c => patch({ conditions: c })} />}
                {innerTab === "biome" && draft.biome && <BiomeTab biome={draft.biome} onChange={b => patch({ biome: b })} />}
                {innerTab === "advanced" && <AdvancedTab draft={draft} patch={patch} />}
                {innerTab === "forwarding" && <ForwardingTab forwarding={draft.forwarding} onChange={f => patch({ forwarding: f })} showBiome={showBiome} />}
            </ModalContent>

            <ModalFooter separator>
                <Button size="small" variant="positive" disabled={!isValid} onClick={handleSave} style={{ marginLeft: "8px" }}>
                    {isEditing ? "Save" : "Create"}
                </Button>
                {isEditing && (
                    <>
                        <Button size="small" variant="dangerPrimary" onClick={handleDelete} style={{ marginLeft: "8px" }}>
                            Delete
                        </Button>
                        <Button size="small" variant="secondary" onClick={handleCopy} style={{ marginLeft: "8px" }}>
                            Copy to clipboard
                        </Button>
                        <Button size="small" variant="link" onClick={handleExportAsFile} style={{ marginLeft: "8px" }}>
                            Export as file
                        </Button>
                    </>
                )}
            </ModalFooter>

        </ModalRoot>
    );
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const openAddTriggerModal = () => openModal(p => <TriggerModal modalProps={p} />);
export const openEditTriggerModal = (t: Trigger) => openModal(p => <TriggerModal modalProps={p} trigger={t} />);
