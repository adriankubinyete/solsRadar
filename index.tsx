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
import { Snipe } from "./models/Snipe";
import { BiomeDetector } from "./services/BiomeDetector";
import { closeGameIfNeeded, extractServerLink, getPlaceId, joinSolsPublicServer, joinUri, RobloxLink, stripRobloxLinks } from "./services/RobloxService";
import { getMatchingTrigger } from "./services/TriggerMatcher";
import { settings } from "./settings";
import { JoinLockStore } from "./stores/JoinLockStore";
import { SnipeMetrics, SnipeStore } from "./stores/SnipeStore";
import { getActiveTriggers, Trigger, TriggerType } from "./stores/TriggerStore";
import { formatElapsedTime, parseCsv, sendWebhook } from "./utils";

const logger = new Logger("SolRadar");
const Native = VencordNative.pluginHelpers.SolRadar as PluginNative<typeof import("./native")>;

// ─── pre processing ────────────────────────────────────────────────────────

function flattenEmbeds(message: Message): void {
    if (!settings.store.flattenEmbeds || !message.embeds.length) return;
    let flattened = message.content;
    for (const embed of message.embeds) {
        if (embed.type !== "rich") continue; // only flatten rich embeds

        // @ts-ignore
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

// ─── channel validation ───────────────────────────────────────────────────────

function isMessageAllowed({ channel, message, trigger }: { channel: Channel; message: Message; trigger: Trigger; }, log: Logger): boolean {
    // Guild-level ignore (com bypass por trigger)
    if (!trigger.conditions.bypassIgnoredGuilds) {
        const ignoredGuilds = parseCsv(settings.store.ignoredGuilds);
        if (ignoredGuilds.has(channel.guild_id)) {
            log.debug(`[${trigger.name}] Guild ${channel.guild_id} is ignored — skipping.`);
            return false;
        }
    }

    // Trigger-level guild ignore
    if (trigger.conditions.ignoredGuilds.includes(channel.guild_id)) {
        log.debug(`[${trigger.name}] Guild ${channel.guild_id} is ignored by trigger — skipping.`);
        return false;
    }

    // Channel-level ignore (com bypass por trigger)
    if (!trigger.conditions.bypassIgnoredChannels) {
        const ignoredChannels = parseCsv(settings.store.ignoredChannels);
        if (ignoredChannels.has(channel.id)) {
            log.debug(`[${trigger.name}] Channel #${channel.name} is ignored — skipping.`);
            return false;
        }
    }

    // Trigger-level channel ignore
    if (trigger.conditions.ignoredChannels.includes(channel.id)) {
        log.debug(`[${trigger.name}] Channel #${channel.name} is ignored by trigger — skipping.`);
        return false;
    }

    // User-level ignore (sem bypass)
    const ignoredUsers = parseCsv(settings.store.ignoredUsers);
    if (ignoredUsers.has(message.author.id)) {
        log.debug(`[${trigger.name}] User ${message.author.id} is ignored — skipping.`);
        return false;
    }

    // Monitored channels whitelist
    if (!trigger.conditions.bypassMonitoredOnly) {
        const monitored = parseCsv(settings.store.monitoredChannels);
        if (monitored.size > 0 && !monitored.has(channel.id)) {
            log.debug(`[${trigger.name}] Channel #${channel.name} is not monitored — skipping.`);
            return false;
        }
    }

    return true;
}

// ─── join ─────────────────────────────────────────────────────────────────────

export interface JoinResult {
    joined: boolean;
    metrics: SnipeMetrics | null;
    linkSafe: boolean | undefined;
}

async function executeBadLinkAction(): Promise<void> {
    switch (settings.store.onBadLink) {
        case "nothing": return;
        case "public": await joinSolsPublicServer(); return;
        case "close": await closeGameIfNeeded(); return;
    }
}

type VerifyLinkResult =
    | { ok: true; placeId: string; }
    | { ok: false; reason: "no-token" | "place-not-allowed" | "resolve-failed"; detail?: string; };

async function verifyLink(link: RobloxLink, log: Logger): Promise<VerifyLinkResult> {
    if (!settings.store.robloxToken) {
        log.warn("Link verification enabled but robloxToken is missing.");
        showNotification({
            title: "⚠️ SoRa :: Link verification warning",
            body: "Link verification is enabled but robloxToken is missing.\nPlease configure a valid token or disable link verification to stop getting this notification.\nClick on this message to disable link verification.",
            onClick: () => settings.store.linkVerification = "disabled",
        });
        return { ok: false, reason: "no-token" };
    }

    log.debug(`Verifying link ${JSON.stringify(link)}`);
    const placeId = await getPlaceId(link);

    if (placeId === null) {
        log.warn(`Failed to resolve link: ${link.code}`);
        await executeBadLinkAction();
        return { ok: false, reason: "resolve-failed", detail: link.code };
    }

    const allowedPlaceIds = parseCsv(settings.store.allowedPlaceIds);
    if (allowedPlaceIds.size === 0 || allowedPlaceIds.has(String(placeId))) {
        log.debug(`Place ID ${placeId} is allowed.`);
        return { ok: true, placeId: String(placeId) };
    }

    await executeBadLinkAction();
    return { ok: false, reason: "place-not-allowed", detail: String(placeId) };
}

// ─── post-join ─────────────────────────────────────────────────────────────────

/** Tipos de trigger que suportam detecção de bioma via log. */
const BIOME_DETECTABLE_TYPES = new Set<TriggerType>(["RARE_BIOME", "EVENT_BIOME", "BIOME", "WEATHER"]);

function activateJoinLock(snipe: Snipe, log: Logger): void {
    const { trigger } = snipe;
    if (!trigger.state.joinlock || trigger.state.joinlockDuration <= 0) return;

    const activated = JoinLockStore.activate(
        trigger.state.priority,
        trigger.state.joinlockDuration,
        trigger.name,
    );

    if (activated) {
        log.info(
            `[${trigger.name}] Join lock activated — ` +
            `priority: ${trigger.state.priority}, ` +
            `duration: ${trigger.state.joinlockDuration}s`
        );
        snipe.logInfo(`Join lock activated — priority ${trigger.state.priority}, duration ${trigger.state.joinlockDuration}s.`);
    } else {
        log.debug(`[${trigger.name}] Join lock NOT updated — existing lock has higher priority.`);
        snipe.logInfo("Join lock not updated — existing lock has higher priority.");
    }
}

function isJoinLocked(trigger: Trigger) {
    return JoinLockStore.isBlocked(trigger.state.priority);
}

// Active biome detection cancel function — cancels previous detection when a new join happens
let _unsubscribeBiomeDetection: (() => void) | null = null;

function _watchForBiomeEnd(snipe: Snipe, log: Logger): void {
    const biomeStartedAt = performance.now();
    const activeBiome = (snipe.trigger.biome?.detectionKeyword || snipe.trigger.name).toLowerCase();
    log.info(`[${snipe.trigger.name}] Watching for biome to end.`);
    snipe.logInfo(`Watching for biome "${activeBiome}" to end.`);

    const finish = (reason: string, to?: string) => {
        const duration = Math.round(performance.now() - biomeStartedAt);
        const formattedDuration = formatElapsedTime(duration);
        snipe.setBiomeDuration(duration);
        snipe.logInfo(`Biome ended (${reason}) - duration: ${formattedDuration}${to ? ` (now "${to}")` : ""}.`);
        JoinLockStore.release();
        unsubChange();
        unsubClear();
    };

    const unsubChange = BiomeDetector.on("biomeChanged", ({ from, to }) => {
        if (from?.toLowerCase() !== activeBiome) {
            log.debug(`[${snipe.trigger.name}] Biome changed from "${from}" to "${to}" — skipping because it's not the expected trigger biome (${activeBiome}).`);
            return;
        }
        finish("biome changed", to);
    });

    const unsubClear = BiomeDetector.on("biomeCleared", ({ from }) => {
        if (from.toLowerCase() !== activeBiome) return;
        finish("disconnected");
    });
}

function startBiomeDetection(snipe: Snipe, log: Logger): void {
    _unsubscribeBiomeDetection?.();

    if (!BIOME_DETECTABLE_TYPES.has(snipe.trigger.type)) {
        return;
    }
    if (!snipe.trigger.biome?.detectionEnabled) {
        snipe.markAsBiomeNotVerified();
        snipe.logInfo("Biome detection disabled for this trigger.");
        return;
    }
    if (!settings.store.detectorEnabled) {
        log.debug(`[${snipe.trigger.name}] Biome detector globally disabled.`);
        snipe.markAsBiomeNotVerified();
        snipe.logWarn("Biome detector is globally disabled.");
        return;
    }

    const expected = (snipe.trigger.biome.detectionKeyword || snipe.trigger.name).toLowerCase();
    const startDelayMs = settings.store.closeGameBeforeJoin ? 6_000 : 0;
    const t0 = performance.now();

    log.info(`[${snipe.trigger.name}] Awaiting biome — expecting "${expected}" (delay: ${startDelayMs}ms).`);
    snipe.logInfo(`Awaiting biome — expecting "${expected}"${startDelayMs > 0 ? ` (delay: ${startDelayMs}ms)` : ""}.`);

    let detecting = true;

    const unsubChange = BiomeDetector.on("biomeChanged", ({ to }) => {
        if (!detecting) return;
        if (startDelayMs > 0 && performance.now() - t0 < startDelayMs) return;

        const elapsed = Math.round(performance.now() - t0);
        const detected = to.toLowerCase();
        detecting = false;
        _unsubscribeBiomeDetection = null;

        log.info(`[${snipe.trigger.name}] Biome verdict: ${detected === expected ? "real" : "bait"} (${elapsed}ms)`);

        if (detected === expected) {
            snipe.markAsBiomeReal();
            snipe.logInfo(`Biome confirmed — "${to}" matched in ${elapsed}ms.`);
            _watchForBiomeEnd(snipe, log);
            showNotification({
                title: `✅ SoRa :: Real — ${snipe.trigger.name}`,
                body: `Detected in ${elapsed}ms`,
                icon: snipe.trigger.iconUrl,
            });
            if (snipe.trigger.forwarding.onDetection.enabled) {
                log.info(`[${snipe.trigger.name}] Forwarding on detection...`);
                snipe.logInfo("Forwarding on detection...");
                forwardSnipe(snipe, log, "detection").catch(err => {
                    log.error(`[${snipe.trigger.name}] Forward on detection failed: ${(err as Error).message}`);
                    snipe.logError(`Forward on detection failed: ${(err as Error).message}`);
                });
            }
        } else {
            snipe.markAsBiomeBait();
            snipe.logWarn(`Biome bait — got "${to}" instead of "${expected}" (${elapsed}ms).`);
            unsubChange();
            if (JoinLockStore.isLocked) {
                log.warn(`[${snipe.trigger.name}] Bait — releasing lock.`);
                snipe.logWarn("Releasing join lock — bait detected.");
                JoinLockStore.release();
            }
            showNotification({
                title: `❌ SoRa :: Fake — ${snipe.trigger.name}`,
                body: `Got "${to}" instead (${elapsed}ms)`,
                icon: snipe.trigger.iconUrl,
            });
        }
    });

    const timer = setTimeout(() => {
        if (!detecting) return;
        detecting = false;
        unsubChange();
        _unsubscribeBiomeDetection = null;
        snipe.markAsBiomeTimeout();
        snipe.logWarn(`Biome detection timed out after ${((settings.store.detectorTimeoutMs ?? 30_000) + startDelayMs) / 1000}s.`);
        log.warn(`[${snipe.trigger.name}] Biome detection timed out.`);
        if (JoinLockStore.isLocked) JoinLockStore.release();
        showNotification({
            title: `⌛ SoRa :: Timeout — ${snipe.trigger.name}`,
            body: "Biome detection timed out.",
            icon: snipe.trigger.iconUrl,
        });
    }, (settings.store.detectorTimeoutMs ?? 30_000) + startDelayMs);

    _unsubscribeBiomeDetection = () => {
        snipe.logWarn("Biome detection cancelled... another snipe probably happened");
        detecting = false;
        clearTimeout(timer);
        unsubChange();
    };
}

// ─── join stuff ────────────────────────────────────────────────────────────────

function isRedundantJoin(snipe: Snipe, log: Logger): boolean {
    if (!snipe.trigger.biome?.skipRedundantJoin) return false;

    const expected = snipe.trigger.biome.detectionKeyword || snipe.trigger.name;
    if (!BiomeDetector.isAnyAccountInBiome(expected)) return false;

    const freshKeywords = parseCsv("start,fresh");
    if (freshKeywords.size > 0) {
        const content = snipe.getRawMessageContent().toLowerCase() ?? "";
        if ([...freshKeywords].some(kw => content.includes(kw.toLowerCase()))) {
            snipe.markAsRedundancyBypassed();
            snipe.logInfo("Redundant biome bypassed — fresh keyword detected in message.");
            return false;
        }
    }

    snipe.logWarn(`Redundant join skipped — already in biome "${expected}".`);
    return true;
}

function shouldJoin(snipe: Snipe, log: Logger): boolean {
    if (!settings.store.autoJoinEnabled) {
        log.debug(`[${snipe.trigger.name}] Auto-join globally disabled.`);
        snipe.logInfo("Auto-join is globally disabled.");
        return false;
    }

    if (!snipe.trigger.state.autojoin) {
        log.debug(`[${snipe.trigger.name}] Auto-join is disabled for this trigger.`);
        snipe.logInfo("Auto-join is disabled for this trigger.");
        return false;
    }

    if (isRedundantJoin(snipe, log)) {
        log.info(`[${snipe.trigger.name}] Already in biome and no fresh keywords — skipping join.`);
        snipe.markAsRedundantBiome();
        return false;
    }

    return true;
}

async function verifySnipeSafety(snipe: Snipe, log: Logger): Promise<void> {
    if (snipe.trigger.conditions.bypassLinkVerification) {
        snipe.logInfo("Link verification bypassed by trigger.");
        return;
    }
    if (settings.store.linkVerification === "disabled") {
        snipe.logInfo("Link verification disabled — skipping.");
        return;
    }

    snipe.logInfo("Verifying link...");
    const result = await verifyLink(snipe.link, log);

    if (result.ok) {
        snipe.markAsLinkSafe();
        snipe.logInfo(`Link verified — Place ID ${result.placeId} is allowed.`);
    } else if (result.reason === "no-token") {
        snipe.markAsLinkUnsafe();
        snipe.logError("Link verification failed — no Roblox token configured.");
    } else if (result.reason === "resolve-failed") {
        snipe.markAsLinkNotVerified();
        snipe.logWarn(`Link verification failed — could not resolve place ID for code "${result.detail}".`);
    } else {
        snipe.markAsLinkUnsafe();
        snipe.logWarn(`Link unsafe — Place ID ${result.detail} is not in the allowed list.`);
    }
}

async function join(snipe: Snipe, log: Logger): Promise<void> {
    if (settings.store.linkVerification === "before") {
        await verifySnipeSafety(snipe, log);
        if (!snipe.isSafe()) {
            snipe.logWarn("Join aborted — link failed verification (before).");
            return;
        }
    }

    const uri = snipe.getJoinUri();
    if (!uri) {
        snipe.markAsFailed();
        snipe.logError("Join failed — no URI available.");
        return;
    }

    snipe.logInfo("Attempting to join...");
    const result = await joinServer(uri, snipe.tMessageReceived, log);
    if (!result.ok) {
        snipe.markAsFailed();
        snipe.logError(`Join failed — ${result.detail ?? result.reason}`);
        return;
    }

    snipe.setMetrics(result.metrics);
    snipe.logInfo(`Joined in ${result.metrics.joinDurationMs.toFixed(1)}ms (overhead: ${result.metrics.overheadMs.toFixed(1)}ms)`);

    if (settings.store.linkVerification === "after") {
        await verifySnipeSafety(snipe, log);
        if (!snipe.isSafe()) {
            snipe.logWarn("Link failed verification (after join).");
            return;
        }
    }

    activateJoinLock(snipe, log);
    startBiomeDetection(snipe, log);
}

type JoinServerResult =
    | { ok: true; metrics: SnipeMetrics; }
    | { ok: false; reason: "link-unsafe" | "no-uri" | "native-failed"; detail?: string; };

async function joinServer(uri: string, tMessageReceived: number, log: Logger): Promise<JoinServerResult> {
    log.info(`Joining: ${uri}`);

    const KILL_DELAY_MS = settings.store.closeGameDelay;

    const tJoinStart = performance.now();

    const tKillStart = performance.now();
    let killDurationMs: number | null = null;
    try {
        if (settings.store.closeGameBeforeJoin) {
            Native.killProcess({ pname: "RobloxPlayerBeta.exe" }); // sem await
            await new Promise(res => setTimeout(res, KILL_DELAY_MS));
        }
        killDurationMs = performance.now() - tKillStart;
    } catch (err) {
        const detail = (err as Error).message;
        log.error(`killProcess failed: ${detail}`);
        return { ok: false, reason: "native-failed", detail };
    }

    const tOpenStart = performance.now();
    try {
        await Native.openUri(uri);
    } catch (err) {
        const detail = (err as Error).message;
        log.error(`Native.openUri failed: ${detail}`);
        return { ok: false, reason: "native-failed", detail };
    }
    const openUriDurationMs = performance.now() - tOpenStart;

    const tJoinEnd = performance.now();

    return {
        ok: true,
        metrics: {
            joinDurationMs: tJoinEnd - tJoinStart,
            timeToJoinMs: tJoinEnd - tMessageReceived,
            overheadMs: (tJoinEnd - tMessageReceived) - (tJoinEnd - tJoinStart),
            killDurationMs,
            openUriDurationMs,
        },
    };
}

// ─── notify stuff ──────────────────────────────────────────────────────────────

function shouldNotify(snipe: Snipe): boolean {
    if (!settings.store.notificationEnabled) return false;
    if (!snipe.trigger.state.notify) return false;
    return true;
}

function notify(snipe: Snipe, log: Logger): void {
    const entry = SnipeStore.getById(snipe.id)!;
    const tags = new Set(entry.tags);
    const onClick = entry.joinUri
        ? () => joinUri(entry.joinUri)
        : undefined;

    if (tags.has("link-verified-unsafe")) {
        showNotification({
            title: `⚠️ SoRa :: ${snipe.trigger.name} :: Unsafe link!`,
            body: `In: "${snipe.channel.name}" ("${snipe.guild.name}")`,
            icon: snipe.trigger.iconUrl,
            onClick,
        });
        snipe.logWarn("Notification sent — unsafe link.");
        return;
    }

    if (tags.has("failed")) {
        showNotification({
            title: `❌ SoRa :: Failed — ${snipe.trigger.name}`,
            body: `In: "${snipe.channel.name}" ("${snipe.guild.name}")`,
            icon: snipe.trigger.iconUrl,
        });
        snipe.logWarn("Notification sent — join failed.");
        return;
    }

    showNotification({
        title: entry.joinUri
            ? `🎯 SoRa :: Sniped — ${snipe.trigger.name}!`
            : `✅ SoRa :: Matched — ${snipe.trigger.name}!`,
        body: `In: "${snipe.channel.name}" ("${snipe.guild.name}")`,
        icon: snipe.trigger.iconUrl,
        onClick,
    });

    snipe.logInfo("Notification sent.");
    log.info(`[${snipe.trigger.name}] Notified: #${snipe.channel.name} @ ${snipe.guild.name}`);
}

// ─── forward stuff ──────────────────────────────────────────────────────────────

function isValidMessage(message: Message, log: Logger): boolean {

    // @ts-ignore - ts is drunk, I think the type is not updated
    const webhook_id = message.webhook_id ?? message.author.id ?? undefined;
    const isASelfForward = getActiveTriggers().some(t => {
        const url = t.forwarding.webhookUrl || settings.store.globalWebhookUrl;
        return url && webhook_id && url.includes(webhook_id);
    });

    if (isASelfForward) {
        log.warn("This message is a self-forward!");
        return false;
    }

    const isReforward = message.embeds.some(e =>
        e.type === "rich" && (e as any).footer?.text?.toLowerCase() === "solradar"
    );

    if (isReforward && settings.store.ignoreWebhookForwards) {
        log.warn("This message is a re-forward! Protection against forward loops is enabled.");
        return false;
    }

    return true;
}

type ForwardKind = "match" | "detection";

function canForward(snipe: Snipe, log: Logger): boolean {
    const webhookUrl = snipe.trigger.forwarding.webhookUrl || settings.store.globalWebhookUrl;
    if (!webhookUrl) {
        log.warn(`[${snipe.trigger.name}] Forwarding enabled but no webhook URL configured (trigger or global).`);
        snipe.logWarn("Forward skipped — no webhook URL configured.");
        return false;
    }

    const excludedGuilds = snipe.trigger.forwarding.excludedGuilds ?? [];
    if (excludedGuilds.includes(snipe.guild.id)) {
        log.info(`[${snipe.trigger.name}] Skipping forward — guild ${snipe.guild.id} is excluded.`);
        snipe.logInfo(`Forward skipped — guild "${snipe.guild.name}" is excluded.`);
        return false;
    }

    const excludedChannels = snipe.trigger.forwarding.excludedChannels ?? [];
    if (excludedChannels.includes(snipe.channel.id)) {
        log.info(`[${snipe.trigger.name}] Skipping forward — channel ${snipe.channel.id} is excluded.`);
        snipe.logInfo(`Forward skipped — channel "#${snipe.channel.name}" is excluded.`);
        return false;
    }

    const bypassForwardIgnoredGuilds = snipe.trigger.conditions?.bypassForwardIgnoredGuilds ?? false;
    if (!bypassForwardIgnoredGuilds) {
        const ignoredGuilds = parseCsv(settings.store.forwardIgnoredGuilds);

        if (ignoredGuilds.has(snipe.guild.id)) {
            log.info(`[${snipe.trigger.name}] Skipping forward — guild ${snipe.guild.id} is globally ignored.`);
            snipe.logInfo(`Forward skipped — guild "${snipe.guild.name}" is globally ignored.`);
            return false;
        }
    }

    return true;
}

async function forwardSnipe(snipe: Snipe, log: Logger, kind: ForwardKind = "match"): Promise<void> {
    if (!canForward(snipe, log)) return;

    const webhookUrl = snipe.trigger.forwarding.webhookUrl || settings.store.globalWebhookUrl;
    const isDetection = kind === "detection";
    const hasBiome = snipe.trigger.type !== "MERCHANT";
    const censor = settings.store.censorWebhooks;

    const customMessageContent = snipe.trigger.forwarding.webhookContent;
    const customEmbedDescription = snipe.trigger.forwarding.webhookEmbedDescription;

    const serverLink = `[🔗 Server Link](${snipe.link.link})`;
    const embedDescription = customEmbedDescription
        ? `${customEmbedDescription}\n${serverLink}`
        : serverLink;

    const body = JSON.stringify({
        content: customMessageContent || null,
        embeds: [{
            title: isDetection
                ? `✅ ${snipe.trigger.name} — Biome Confirmed`
                : `🎯 ${snipe.trigger.name} (click to join)`,
            description: embedDescription,
            url: snipe.link.link,
            thumbnail: { url: snipe.trigger.iconUrl ?? undefined },
            fields: [
                {
                    name: "Sent by",
                    value: censor ? "```[REDACTED]```" : `<@${snipe.message.author.id}>`,
                    inline: true
                },
                {
                    name: "Sent in",
                    value: censor
                        ? "```[REDACTED]```"
                        : `https://discord.com/channels/${snipe.guild.id}/${snipe.channel.id}/${snipe.message.id}`,
                    inline: true
                },
                ...(hasBiome ? [{
                    name: "Biome",
                    value: isDetection ? "```✅ Verified```" : "```⚠️ Not verified```",
                    inline: false
                }] : []),
            ],
            color: isDetection ? 0x57f287 : 0x5865f2,
            timestamp: new Date().toISOString(),
            footer: { text: "SolRadar" },
        }],
    });

    try {
        await sendWebhook(webhookUrl, body);
        log.info(`[${snipe.trigger.name}] Forward successful (${kind}).`);
        snipe.logInfo(`Forwarded (${kind}).`);
    } catch (err) {
        const { message } = (err as Error);
        log.error(`[${snipe.trigger.name}] Forward failed: ${message}`);
        snipe.logError(`Forward failed: ${message}`);
    }
}

// ─── orchestration ─────────────────────────────────────────────────────────────

async function handleMessage(message: Message, channel: Channel, guild: Guild, tMessageReceived: number): Promise<void> {
    const log = new Logger(`SolRadar:${message.id}`);

    if (!isValidMessage(message, log)) return;

    flattenEmbeds(message);

    const link = extractLink(message);
    if (!link) return;

    sanitizeContent(message);

    const trigger = resolveTrigger({ message, channel, guild }, log);
    if (!trigger) return;

    log.info(`Match: "${trigger.name}" (p${trigger.state.priority}) — #${channel.name} @ ${guild.name}`);

    if (!isMessageAllowed({ channel, message, trigger }, log)) return;
    if (isJoinLocked(trigger)) return;

    const snipe = Snipe.create(message, link, trigger, channel, guild, tMessageReceived);
    snipe.logDebug("snipe created");

    // early forward
    if (snipe.trigger.forwarding.onMatch.enabled && snipe.trigger.forwarding.onMatch.early) {
        log.info(`[${snipe.trigger.name}] Forwarding early...`);
        snipe.logInfo("Forwarding early...");
        await forwardSnipe(snipe, log);
    }

    if (shouldJoin(snipe, log)) await join(snipe, log);
    if (shouldNotify(snipe)) notify(snipe, log);

    // late forward
    if (snipe.trigger.forwarding.onMatch.enabled && !snipe.trigger.forwarding.onMatch.early) {
        log.info(`[${snipe.trigger.name}] Forwarding late...`);
        snipe.logInfo("Forwarding late...");
        await forwardSnipe(snipe, log);
    }
}

// ─── plugin ───────────────────────────────────────────────────────────────────

export default definePlugin({
    name: "SolRadar",
    description: "Does Sols RNG stuff",
    authors: [{ name: "masutty", id: 188851299255713792n }],
    settings,

    patches: [
        {
            find: '?"BACK_FORWARD_NAVIGATION":',
            replacement: {
                match: /(?<=trailing:.{0,50})\i\.Fragment,(?=\{children:\[)/,
                replace: "$self.TitlebarWrapper,"
            },
            predicate: () => settings.store.pluginIconLocation === "titlebar",
        }
    ],

    TitlebarWrapper({ children }: PropsWithChildren) {
        logger.debug("TitlebarWrapper");
        return (
            <>
                {children}
                <ErrorBoundary noop>
                    <SolsRadarTitleBarButton />
                </ErrorBoundary>
            </>
        );
    },

    chatBarButton: {
        icon: SolsRadarIcon,
        render: SolsRadarChatBarButton,
    },

    async start() {
        logger.info("Starting");

        if (settings.store.detectorEnabled) {
            const accounts = (settings.store.detectorAccounts as string ?? "")
                .split(",").map(s => s.trim()).filter(Boolean);

            if (accounts.length) {
                await BiomeDetector.configure(accounts);
                BiomeDetector.start(settings.store.detectorIntervalMs ?? 1_000);
            } else {
                logger.info("Biome detector enabled but no accounts configured.");
            }
        }
    },

    stop() {
        logger.info("Stopping");
        BiomeDetector.stop();
        _unsubscribeBiomeDetection?.();
        _unsubscribeBiomeDetection = null;
    },

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
