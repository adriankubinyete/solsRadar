/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import ErrorBoundary from "@components/ErrorBoundary";
import { Logger } from "@utils/Logger";
import definePlugin, { PluginNative } from "@utils/types";
import { Channel, Guild, Message } from "@vencord/discord-types";
import { ChannelType } from "@vencord/discord-types/enums";
import { ChannelStore, GuildStore } from "@webpack/common";
import { PropsWithChildren } from "react";

import { SolsRadarChatBarButton } from "./components/buttons/SolsRadarChatBarButton";
import { SolsRadarTitleBarButton } from "./components/buttons/SolsRadarTitleBarButton";
import { SolsRadarIcon } from "./components/ui/SolsRadarIcon";
import { buildJoinUri, closeGameIfNeeded, extractServerLink, getPlaceId, joinSolsPublicServer, RobloxLink, stripRobloxLinks } from "./services/RobloxService";
import { getMatchingTrigger } from "./services/TriggerMatcher";
import { settings } from "./settings";
import { getActiveTriggers, Trigger } from "./stores/TriggerStore";

const logger = new Logger("SolRadar");
const Native = VencordNative.pluginHelpers.SRadar as PluginNative<typeof import("./native")>;

// ─── settings helpers ──────────────────────────────────────────────────────

/** CSV "123,456,789" → Set<string> */
function parseCsv(csv: string | undefined): Set<string> {
    if (!csv?.trim()) return new Set();
    return new Set(csv.split(",").map(s => s.trim()).filter(Boolean));
}

// ─── pre processing ────────────────────────────────────────────────────────

/**
 * Compacts embeds into the message content.
 */
function flattenEmbeds(message: Message): void {
    if (!settings.store.flattenEmbeds || !message.embeds.length) return;
    let flattened = message.content;
    for (const embed of message.embeds) {
        // @ts-ignore — campos sem prefixo "raw" no tipo, mas presentes em runtime
        if (embed.title) flattened += ` ${embed.title}`;
        // @ts-ignore
        if (embed.description) flattened += ` ${embed.description}`;
    }
    message.content = flattened;
    message.embeds = [];
}

function extractLink(message: Message): RobloxLink | null {
    const result = extractServerLink(message.content);
    return result.ok ? result.result! : null;
}

/**
 * Mainly intended to clear the links off the message content.
 */
function sanitizeContent(message: Message): void {
    message.content = stripRobloxLinks(message.content);
}

function resolveTrigger({ message, channel, guild }: { message: Message; channel: Channel; guild: Guild; }, log: Logger): Trigger | null {
    const activeTriggers = getActiveTriggers();
    if (!activeTriggers.length) return null;

    const { trigger, status, allMatched } = getMatchingTrigger(message, activeTriggers);

    if (status === "ambiguous") {
        log.debug(
            `Ambiguous — ${allMatched.length} triggers matched: ${allMatched.map(t => t.name).join(", ")} ` +
            `(#${channel.name} @ ${guild.name})`
        );
        return null;
    }

    return trigger;
}

// ─── channel validation ───────────────────────────────────────────────────────

/**
 * Decides if a channel is allowed to be scanned.
 */
function isMessageAllowed({ channel, trigger }: { channel: Channel; trigger: Trigger; }, log: Logger): boolean {

    // glitch hunting servers with "dont use snipers" policy
    const blacklist = parseCsv(settings.store.NEVER_MONITOR_THESE_GUILDS);
    if (blacklist.has(channel.guild_id)) {
        log.debug(`[${trigger.name}] Guild ${channel.guild_id} is blacklisted — skipping.`);
        return false;
    }

    if (trigger.conditions.bypassChannelRestriction) {
        log.debug(`[${trigger.name}] Channel restriction bypassed.`);
        return true;
    }

    const whitelist = parseCsv(settings.store.monitoredChannels);
    if (whitelist.size > 0 && !whitelist.has(channel.id)) {
        log.debug(`[${trigger.name}] Channel #${channel.name} is not monitored — skipping.`);
        return false;
    }

    return true;
}

// ─── join ─────────────────────────────────────────────────────────────────────

/** Métricas de performance do join, em ms. */
export interface JoinMetrics {
    /** Tempo desde o recebimento da mensagem até o openUri ser chamado. */
    timeToJoinMs: number;
    /** Tempo que o openUri levou para retornar. */
    joinDurationMs: number;
    /** timeToJoinMs - joinDurationMs: quanto tempo "perdemos" antes de chamar o join. */
    overheadMs: number;
}

/** Resultado de uma tentativa de join. */
export interface JoinResult {
    joined: boolean;
    metrics: JoinMetrics | null;
    /** undefined = verificação desativada, true = seguro, false = bait */
    linkSafe: boolean | undefined;
}

async function executeBadLinkAction(): Promise<void> {
    switch (settings.store.onBadLink) {
        case "nothing": return;
        case "public": return await joinSolsPublicServer();
        case "close": return await closeGameIfNeeded();
    }
}

/**
 * Resolves a Roblox link and checks if it's safe to join based on allowed place ids.
 * can be skipped based on trigger conditions.
 * will be ignored if theres not a roblox token to resolve links with.
 * true: link was checked, is allowed
 * false: link was checked, is not allowed
 */
async function verifyLink(link: RobloxLink, trigger: Trigger, log: Logger): Promise<boolean | undefined> {
    if (trigger.conditions.bypassLinkVerification) {
        log.debug(`[${trigger.name}] Link verification bypassed.`);
        return undefined;
    }
    const mode = settings.store.linkVerification as "disabled" | "before" | "after" | undefined ?? "disabled";
    const action = settings.store.onBadLink as "nothing" | "public" | "close" | undefined ?? "public";
    if (mode === "disabled") return undefined;
    if (!settings.store.robloxToken) {
        log.warn("Link verification is enabled but robloxToken is missing. Please configure a valid token or disable link verification.");
        showNotification({
            title: "⚠️ SoRa :: Link verification warning",
            body: "Link verification is enabled but robloxToken is missing.\nPlease configure a valid token or disable link verification to stop getting this notification.\nClick on this message to disable link verification.",
            onClick: () => settings.store.linkVerification = "disabled"
        });
        return false; // user wants link verification but he didnt set a token
    }

    log.debug(`[${trigger.name}] Verifying link ${JSON.stringify(link)}`);

    const placeId = await getPlaceId(link);

    const allowedPlaceIds = parseCsv(settings.store.allowedPlaceIds);
    if (allowedPlaceIds.size === 0 || allowedPlaceIds.has(String(placeId))) {
        log.debug(`[${trigger.name}] Place ID ${placeId} is allowed.`);
        return true;
    }

    if (placeId === null) log.warn(`[${trigger.name}] Failed to resolve link: ${link.code}`);

    await executeBadLinkAction();
    return false;
}

/**
 * Do the actual joining.
 * tMessageReceived should be the performance.now() captured at the start of MESSAGE_CREATE.
 */
async function tryJoin(
    link: RobloxLink,
    trigger: Trigger,
    log: Logger,
    tMessageReceived: number
): Promise<JoinResult> {
    const noJoin: JoinResult = { joined: false, metrics: null, linkSafe: undefined };

    if (!settings.store.autoJoinEnabled) {
        log.debug(`[${trigger.name}] Auto-join globally disabled.`);
        return noJoin;
    }
    if (!trigger.state.autojoin) {
        log.debug(`[${trigger.name}] Auto-join disabled on this trigger.`);
        return noJoin;
    }

    // Verificação BEFORE: bloqueia se bait
    if ((settings.store.linkVerification as string) === "before") {
        const safe = await verifyLink(link, trigger, log);
        if (safe === false) {
            log.warn(`[${trigger.name}] Link flagged as unsafe — aborting join.`);
            return { joined: false, metrics: null, linkSafe: false };
        }
    }

    const uri = buildJoinUri(link);
    log.info(`[${trigger.name}] Joining: ${uri}`);

    const tJoinStart = performance.now();
    try {
        await closeGameIfNeeded();
        await Native.openUri(uri);
    } catch (err) {
        log.error(`[${trigger.name}] openUri failed: ${(err as Error).message}`);
        return noJoin;
    }
    const tJoinEnd = performance.now();

    const joinDurationMs = tJoinEnd - tJoinStart;
    const timeToJoinMs = tJoinEnd - tMessageReceived;
    const overheadMs = timeToJoinMs - joinDurationMs;

    const metrics: JoinMetrics = { timeToJoinMs, joinDurationMs, overheadMs };
    log.info(
        `[${trigger.name}] Join complete — ` +
        `total: ${timeToJoinMs.toFixed(1)}ms | ` +
        `openUri: ${joinDurationMs.toFixed(1)}ms | ` +
        `overhead: ${overheadMs.toFixed(1)}ms`
    );

    let linkSafe: boolean | undefined = undefined;
    if ((settings.store.linkVerification as string) === "after") {
        verifyLink(link, trigger, log).then(safe => {
            linkSafe = safe;
        });
    }

    return { joined: true, metrics, linkSafe };
}

// ─── post-join ─────────────────────────────────────────────────────────────────

function activateJoinLock(trigger: Trigger, log: Logger): void {
    if (!trigger.state.joinlock) return;
    // TODO: persistir timestamp do lock + duration
    log.info(`[${trigger.name}] Join lock activated for ${trigger.state.joinlockDuration}s.`);
}

async function runBiomeDetection(trigger: Trigger, log: Logger): Promise<void> {
    if (!trigger.biome?.detectionEnabled) return;
    // TODO: ler log do Roblox e verificar detectionKeyword
    log.debug(`[${trigger.name}] Biome detection pending.`);
}

// Note: notifications are not necessarily bound to "post-join"...
function tryNotify({ trigger, channel, guild, joined }: { trigger: Trigger; channel: Channel; guild: Guild; joined: boolean; }, log: Logger): void {
    if (!settings.store.notificationEnabled) {
        log.debug(`[${trigger.name}] Notifications globally disabled.`);
        return;
    }
    if (!trigger.state.notify) {
        log.debug(`[${trigger.name}] Notifications disabled on this trigger.`);
        return;
    }

    showNotification({
        title: (joined) ? `🎯 SoRa >> Joined "${trigger.name}"!` : `✅ SoRa >> Matched "${trigger.name}"!`,
        body: `In: "${channel.name}" ("${guild.name}")`,
        icon: trigger.iconUrl
    });

    log.info(`[${trigger.name}] Notify: matched in #${channel.name} @ ${guild.name}.`);
}

// ─── orchestration ─────────────────────────────────────────────────────────────

async function handleMessage(message: Message, channel: Channel, guild: Guild, tMessageReceived: number): Promise<void> {
    const log = new Logger(`SolRadar:${message.id}`);

    flattenEmbeds(message);

    const link = extractLink(message);
    if (!link) return;

    sanitizeContent(message);

    const trigger = resolveTrigger({ message, channel, guild }, log);
    if (!trigger) return;

    log.info(`Match: "${trigger.name}" (p${trigger.state.priority}) — #${channel.name} @ ${guild.name}`);

    if (!isMessageAllowed({ channel, trigger }, log)) return;

    const { joined, metrics } = await tryJoin(link, trigger, log, tMessageReceived);

    tryNotify({ trigger, channel, guild, joined }, log);

    if (!joined) return;

    // activateJoinLock(trigger, log);
    // await runBiomeDetection(trigger, log);
}

// ─── plugin ───────────────────────────────────────────────────────────────────

export default definePlugin({
    name: "SRadar",
    description: "Does Sols RNG stuff",
    authors: [{ name: "masutty", id: 188851299255713792n }],
    settings,

    patches: [
        {
            find: '?"BACK_FORWARD_NAVIGATION":',
            replacement: {
                match: /(?<=trailing:.{0,50})\i\.Fragment,\{(?=.+?className:(\i))/,
                replace: "$self.TitlebarWrapper,{className:$1,"
            },
            predicate: () => settings.store.pluginIconLocation === "titlebar",
        }
    ],

    TitlebarWrapper({ children, className }: PropsWithChildren<{ className: string; }>) {
        return (
            <>
                {children}
                <ErrorBoundary noop>
                    <SolsRadarTitleBarButton className={className} />
                </ErrorBoundary>
            </>
        );
    },

    chatBarButton: {
        icon: SolsRadarIcon,
        render: SolsRadarChatBarButton,
    },

    async start() { logger.info("Starting"); },
    async stop() { logger.info("Stopping"); },

    flux: {
        async MESSAGE_CREATE({ message, optimistic }: { message: Message; optimistic: boolean; }) {
            const tMessageReceived = performance.now();
            if (optimistic) return;

            const channel = ChannelStore.getChannel(message.channel_id);
            if (!channel) return;
            if (channel.type === ChannelType.DM || channel.type === ChannelType.GROUP_DM) return;

            const guild = GuildStore.getGuild(channel.guild_id!);
            if (!guild) return;

            await handleMessage(message, channel, guild, tMessageReceived);
        }
    }
});
