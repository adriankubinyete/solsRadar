/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CodeBlock } from "@components/CodeBlock";
import { Divider } from "@components/Divider";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, ModalSize, openModal } from "@utils/modal";
import { Channel, Guild, Message } from "@vencord/discord-types";
import { React } from "@webpack/common";

import { flattenEmbeds, getSnipableLink, isMessageAllowed, isValidMessage, resolveTrigger, sanitizeContent } from "../../services/MessageProcessor";
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

interface AnalysisResult {
    steps: DebugStep[];
    interpretedContent: string;
}

function analyze(_message: Message, channel: Channel, guild: Guild): AnalysisResult {
    const steps: DebugStep[] = [];
    const message = { ..._message, embeds: [..._message.embeds] } as Message; // me when i lie

    const valid = isValidMessage(message);
    steps.push({
        label: "Message validity",
        ok: valid,
        detail: valid
            ? "Not a self-forward or re-forward."
            : "Matches the self-forward or re-forward filter — would be silently ignored.",
    });
    if (!valid) return { steps, interpretedContent: message.content };

    const contentBefore = message.content;
    flattenEmbeds(message);
    if (message.content !== contentBefore) {
        steps.push({
            label: "Interpret Embeds",
            ok: true,
            detail: "Embed content merged into message.",
        });
    }

    const interpretedContent = message.content;

    const link = getSnipableLink(message.content);
    steps.push({
        label: "Link detection",
        ok: !!link,
        detail: link
            ? `${link.type.toUpperCase()} link — code: ${link.code}${link.type === "private" ? `, place: ${link.placeId}` : ""}`
            : settings.store.resolveAmbiguousLinks
                ? "No Roblox link found in this message."
                : "No Roblox link found - it either contains multiple different link types or, most likely, no link at all. If the message contains multiple links, enable 'Force Match on Multiple Links' in General settings to force a join.",
    });
    if (!link) return { steps, interpretedContent };

    sanitizeContent(message);

    const trigger = resolveTrigger({ message, channel, guild });
    steps.push({
        label: "Trigger match",
        ok: !!trigger,
        detail: trigger
            ? `Matched "${trigger.name}" (priority ${trigger.state.priority})`
            : "No active trigger matched this message.",
    });
    if (!trigger) return { steps, interpretedContent };

    const allowed = isMessageAllowed({ channel, message, trigger });
    steps.push({
        label: "Message filters",
        ok: allowed,
        detail: allowed
            ? "Not blocked by any global filter."
            : "Blocked - check ignored guilds, channels, users, or monitored channels.",
    });
    if (!allowed) return { steps, interpretedContent };

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

    return { steps, interpretedContent };
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function DebugModal({ props, message, channel, guild }: {
    props: ModalProps;
    message: Message;
    channel: Channel;
    guild: Guild;
}) {
    const { steps, interpretedContent } = React.useMemo(() => analyze(message, channel, guild), []);
    const detectionSteps = steps.filter(s => s.label !== "Auto-join");
    const wouldSnipe = detectionSteps.length > 0 && detectionSteps.every(s => s.ok);

    return (
        <ModalRoot {...props} size={ModalSize.SMALL}>
            <ModalHeader>
                <span style={headerTitle}>Message Debug</span>
                <ModalCloseButton onClick={props.onClose} />
            </ModalHeader>
            <Divider />
            <ModalContent style={{ padding: "0.75rem", paddingBottom: "1.25rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>

                <span style={sectionLabel}>Interpreted Content (max 300 chars)</span>
                <div style={{ marginBottom: 4 }}>
                    <CodeBlock content={interpretedContent?.slice(0, 300) || "(no content)"} lang="" />
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
                    marginBottom: "0.75rem",
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
