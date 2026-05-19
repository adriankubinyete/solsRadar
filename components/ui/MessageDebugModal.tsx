/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Divider } from "@components/Divider";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Channel, Guild, Message } from "@vencord/discord-types";
import { React } from "@webpack/common";

import { flattenEmbeds, getSnipableLink, isMessageAllowed, isValidMessage, resolveTrigger } from "../../services/MessageProcessor";
import { settings } from "../../settings";

// ─── Icon ─────────────────────────────────────────────────────────────────────

export function SolRadarDebugIcon({ width = 20, height = 20 }: { width?: number; height?: number; }) {
    return (
        <svg width={width} height={height} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const headerTitle: React.CSSProperties = { fontWeight: 700, fontSize: "1rem", flex: 1, color: "var(--text-default)" };
const sectionLabel: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" };

// ─── Analysis ─────────────────────────────────────────────────────────────────

interface DebugStep {
    label: string;
    ok: boolean;
    detail: string;
}

function analyze(message: Message, channel: Channel, guild: Guild): DebugStep[] {
    const steps: DebugStep[] = [];
    const msg = { ...message, content: message.content, embeds: [...message.embeds] };

    const valid = isValidMessage(msg);
    steps.push({
        label: "Message validity",
        ok: valid,
        detail: valid
            ? "Not a self-forward or re-forward."
            : "Matches the self-forward or re-forward filter — would be silently ignored.",
    });
    if (!valid) return steps;

    if (settings.store.flattenEmbeds && msg.embeds.length > 0) {
        const before = msg.content;
        flattenEmbeds(msg);
        steps.push({
            label: "Interpret Embeds",
            ok: true,
            detail: msg.content !== before
                ? "Embed content merged into message."
                : "Embeds present but nothing to merge.",
        });
    }

    const link = getSnipableLink(msg.content);
    steps.push({
        label: "Link detection",
        ok: !!link,
        detail: link
            ? `${link.type.toUpperCase()} link — code: ${link.code}${link.type === "private" ? `, place: ${link.placeId}` : ""}`
            : "No Roblox link found in this message.",
    });
    if (!link) return steps;

    const trigger = resolveTrigger({ message: msg, channel, guild });
    steps.push({
        label: "Trigger match",
        ok: !!trigger,
        detail: trigger
            ? `Matched "${trigger.name}" (priority ${trigger.state.priority})`
            : "No active trigger matched this message.",
    });
    if (!trigger) return steps;

    const allowed = isMessageAllowed({ channel, message: msg, trigger });
    steps.push({
        label: "Message filters",
        ok: allowed,
        detail: allowed
            ? "Not blocked by any global filter."
            : "Blocked — check ignored guilds, channels, users, or monitored channels.",
    });
    if (!allowed) return steps;

    const globalJoin = settings.store.autoJoinEnabled;
    const triggerJoin = trigger.state.autojoin;
    steps.push({
        label: "Auto-join",
        ok: globalJoin && triggerJoin,
        detail: !globalJoin
            ? "Globally disabled. Enable Auto-joins in General settings."
            : !triggerJoin
                ? `Disabled on trigger "${trigger.name}".`
                : "Enabled.",
    });

    return steps;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function DebugModal({ props, message, channel, guild }: {
    props: ModalProps;
    message: Message;
    channel: Channel;
    guild: Guild;
}) {
    const steps = React.useMemo(() => analyze(message, channel, guild), []);
    const wouldSnipe = steps.length > 0 && steps.every(s => s.ok);

    return (
        <ModalRoot {...props} size={ModalSize.SMALL}>
            <ModalHeader>
                <span style={headerTitle}>Message Debug</span>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>
            <Divider />
            <ModalContent style={{ padding: "0.75rem", paddingBottom: "1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>

                <span style={sectionLabel}>Message Content</span>
                <div style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "var(--background-mod-subtle)",
                    fontFamily: "var(--font-code)",
                    fontSize: 11,
                    color: "var(--text-muted)",
                    wordBreak: "break-all",
                    marginBottom: 4,
                }}>
                    {message.content?.slice(0, 300) || <em>No content</em>}
                    {(message.content?.length ?? 0) > 300 && "…"}
                </div>

                <span style={{ ...sectionLabel, marginTop: 4 }}>Pipeline</span>
                {steps.map((step, i) => (
                    <div key={i} style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: "var(--background-mod-subtle)",
                    }}>
                        <span style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: step.ok ? "var(--status-positive)" : "var(--status-danger)",
                            flexShrink: 0,
                            marginTop: 1,
                        }}>
                            {step.ok ? "✓" : "✗"}
                        </span>
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-default)" }}>
                                {step.label}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                                {step.detail}
                            </div>
                        </div>
                    </div>
                ))}

                <div style={{
                    marginTop: 4,
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: wouldSnipe ? "hsl(139deg 47% 43% / 15%)" : "hsl(359deg 82% 58% / 12%)",
                    border: `1px solid ${wouldSnipe ? "hsl(139deg 47% 43% / 30%)" : "hsl(359deg 82% 58% / 25%)"}`,
                    color: wouldSnipe ? "var(--status-positive)" : "var(--status-danger)",
                    fontSize: 13,
                    fontWeight: 600,
                }}>
                    {wouldSnipe ? "✓ This message would trigger a snipe." : "✗ This message would not trigger a snipe."}
                </div>

            </ModalContent>
        </ModalRoot>
    );
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export function openMessageDebugModal(message: Message, channel: Channel, guild: Guild) {
    openModal(props => (
        <DebugModal props={props} message={message} channel={channel} guild={guild} />
    ));
}
