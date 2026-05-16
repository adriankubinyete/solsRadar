/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { Logger } from "@utils/Logger";

import { Snipe } from "../models/Snipe";
import { settings } from "../settings";
import { JoinLockStore } from "../stores/JoinLockStore";
import { SnipeMetrics } from "../stores/SnipeStore";
import { Trigger } from "../types";
import { Native, parseCsv } from "../utils";
import { executeAction } from "./ActionExecutor";
import { BiomeDetector } from "./BiomeDetector";
import { startBiomeDetection } from "./BiomeWatcher";
import { closeGame, getPlaceId, RobloxLink } from "./RobloxService";

const logger = new Logger("SolRadar:Join");

// ─── Types ────────────────────────────────────────────────────────────────────

type VerifyLinkResult =
    | { ok: true; placeId: string; }
    | { ok: false; reason: "no-token" | "place-not-allowed" | "resolve-failed"; detail?: string; };

type JoinServerResult =
    | { ok: true; metrics: SnipeMetrics; }
    | { ok: false; reason: "link-unsafe" | "no-uri" | "native-failed"; detail?: string; };

// ─── Join lock ────────────────────────────────────────────────────────────────

export function isJoinLocked(trigger: Trigger): boolean {
    return JoinLockStore.isBlocked(trigger.state.priority);
}

function activateJoinLock(snipe: Snipe): void {
    const { trigger } = snipe;
    if (!trigger.state.joinlock || trigger.state.joinlockDuration <= 0) return;

    const activated = JoinLockStore.activate(
        trigger.state.priority,
        trigger.state.joinlockDuration,
        trigger.name,
    );

    if (activated) {
        snipe.logInfo(`Join lock activated — priority ${trigger.state.priority}, duration ${trigger.state.joinlockDuration}s.`);
    } else {
        snipe.logInfo("Join lock not updated — existing lock has higher priority.");
    }
}

// ─── Redundancy ───────────────────────────────────────────────────────────────

function isRedundantJoin(snipe: Snipe): boolean {
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

export function shouldJoin(snipe: Snipe): boolean {
    if (!settings.store.autoJoinEnabled) {
        snipe.logInfo("Auto-join is globally disabled.");
        return false;
    }

    if (!snipe.trigger.state.autojoin) {
        snipe.logInfo("Auto-join is disabled for this trigger.");
        return false;
    }

    if (isRedundantJoin(snipe)) {
        snipe.markAsRedundantBiome();
        return false;
    }

    return true;
}

// ─── Link verification ────────────────────────────────────────────────────────

async function verifyLink(link: RobloxLink): Promise<VerifyLinkResult> {
    if (!settings.store.robloxToken) {
        showNotification({
            title: "⚠️ SoRa :: Link verification warning",
            body: "Link verification is enabled but robloxToken is missing.\nPlease configure a valid token or disable link verification to stop getting this notification.\nClick on this message to disable link verification.",
            onClick: () => settings.store.linkVerification = "disabled",
        });
        return { ok: false, reason: "no-token" };
    }

    const placeId = await getPlaceId(link);

    if (placeId === null) {
        await executeAction(settings.store.onBadLink);
        return { ok: false, reason: "resolve-failed", detail: link.code };
    }

    const allowedPlaceIds = parseCsv(settings.store.allowedPlaceIds);
    if (allowedPlaceIds.size === 0 || allowedPlaceIds.has(String(placeId))) {
        return { ok: true, placeId: String(placeId) };
    }

    await executeAction(settings.store.onBadLink);
    return { ok: false, reason: "place-not-allowed", detail: String(placeId) };
}

async function verifySnipeSafety(snipe: Snipe): Promise<void> {
    if (snipe.trigger.conditions.bypassLinkVerification) {
        snipe.logInfo("Link verification bypassed by trigger.");
        return;
    }
    if (settings.store.linkVerification === "disabled") {
        snipe.logInfo("Link verification disabled — skipping.");
        return;
    }

    if (snipe.link.type === "joinguard" && settings.store.interpretJoinguardLinks) {
        snipe.logWarn("Joinguard links are unverifiable due to cf turnstile.");
        snipe.markAsLinkNotVerified();
        return;
    }

    snipe.logInfo("Verifying link...");
    const result = await verifyLink(snipe.link);

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

// ─── Join execution ───────────────────────────────────────────────────────────

async function joinServer(uri: string, snipe: Snipe): Promise<JoinServerResult> {
    const tJoinStart = performance.now();

    const tKillStart = performance.now();
    let killDurationMs: number | null = null;
    try {
        if (settings.store.closeGameBeforeJoin) {
            if (settings.store.killMode === "ldp-adb") {
                snipe.logWarn("closeGameBeforeJoin has no effect in ldp method");
            } else if (settings.store.killMode === "fire-and-forget") {
                Native.killProcess({ pname: "RobloxPlayerBeta.exe" });
                await new Promise(res => setTimeout(res, settings.store.closeGameDelay));
            } else {
                await closeGame();
            }
        }
        killDurationMs = performance.now() - tKillStart;
    } catch (err) {
        return { ok: false, reason: "native-failed", detail: (err as Error).message };
    }

    const tOpenStart = performance.now();
    try {
        if (settings.store.useBrowserLaunch) {
            window.open(uri, "_blank", "noopener,noreferrer");
        } else {
            await Native.openUri(uri);
        }
    } catch (err) {
        return { ok: false, reason: "native-failed", detail: (err as Error).message };
    }
    const openUriDurationMs = performance.now() - tOpenStart;

    const tJoinEnd = performance.now();

    if (settings.store.killMode === "ldp-adb") {
        if (!settings.store.ldpAdbPath?.trim()) {
            snipe.logWarn("LDPlayer adb path not configured!");
        } else {
            // @NOTE(masutty)!IMPORTANT:
            // if the emulator IS OPEN but NOT RUNNING ROBLOX. this signal will get sent
            // and do nothing

            const adbResult = await Native.closeRobloxOnEmulator(
                settings.store.ldpAdbPath,
                settings.store.ldpAdbDeviceSerial || "emulator-5554",
                settings.store.ldpAdbPackageName || "com.roblox.client"
            );
            if (!adbResult.ok) {
                snipe.logWarn(`ADB close failed: ${adbResult.error}`);
                if (!settings.store.omitAdbErrorNotifications) {
                    showNotification({
                        title: "⚠️ SoRa :: Plugin issues!",
                        body: `Emulator failed to process close signal.\n> ${adbResult.error}`,
                    });
                }
            }
        }
    }

    return {
        ok: true,
        metrics: {
            joinDurationMs: tJoinEnd - tJoinStart,
            timeToJoinMs: tJoinEnd - snipe.tMessageReceived,
            overheadMs: (tJoinEnd - snipe.tMessageReceived) - (tJoinEnd - tJoinStart),
            killDurationMs,
            openUriDurationMs,
        },
    };
}

export async function join(snipe: Snipe): Promise<void> {
    if (settings.store.linkVerification === "before") {
        await verifySnipeSafety(snipe);
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

    snipe.logInfo(`Attempting to join: ${uri}`);
    logger.info(`Joining: ${uri}`);
    const result = await joinServer(uri, snipe);
    if (!result.ok) {
        snipe.markAsFailed();
        snipe.logError(`Join failed — ${result.detail ?? result.reason}`);
        return;
    }

    snipe.setMetrics(result.metrics);
    snipe.logInfo(`Joined in ${result.metrics.joinDurationMs.toFixed(1)}ms (overhead: ${result.metrics.overheadMs.toFixed(1)}ms)`);

    if (settings.store.linkVerification === "after") {
        await verifySnipeSafety(snipe);
        if (!snipe.isSafe()) {
            snipe.logWarn("Link failed verification (after join).");
            return;
        }
    }

    activateJoinLock(snipe);
    startBiomeDetection(snipe);
}
