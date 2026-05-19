/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";

import { Snipe } from "../models/Snipe";
import { settings } from "../settings";
import { JoinLockStore } from "../stores/JoinLockStore";
import { TriggerType } from "../stores/TriggerStore";
import { formatElapsedTime } from "../utils";
import { scheduleCancelableAction } from "./ActionExecutor";
import { BiomeDetector } from "./BiomeDetector";
import { forwardSnipe } from "./ForwardingService";

const BIOME_DETECTABLE_TYPES = new Set<TriggerType>(["RARE_BIOME", "EVENT_BIOME", "BIOME", "WEATHER"]);

let _unsubscribeBiomeDetection: (() => void) | null = null;

export function cancelBiomeDetection(): void {
    _unsubscribeBiomeDetection?.();
    _unsubscribeBiomeDetection = null;
}

function _watchForBiomeEnd(snipe: Snipe): void {
    const biomeStartedAt = performance.now();
    const activeBiome = (snipe.trigger.biome?.detectionKeyword || snipe.trigger.name).toLowerCase();
    snipe.logInfo(`Watching for biome "${activeBiome}" to end.`);

    const finish = (reason: string, to?: string) => {
        const duration = Math.round(performance.now() - biomeStartedAt);
        const formattedDuration = formatElapsedTime(duration);
        snipe.setBiomeDuration(duration);
        snipe.logInfo(`Biome ended (${reason}) - duration: ${formattedDuration}${to ? ` (now "${to}")` : ""}.`);
        JoinLockStore.release();
        unsubChange();
        unsubClear();
        scheduleCancelableAction(
            settings.store.onBiomeEnd,
            settings.store.biomeEndActionTimeout ?? 10_000,
            `Biome ended — ${snipe.trigger.name}`,
            snipe.trigger.iconUrl,
        );
    };

    const unsubChange = BiomeDetector.on("biomeChanged", ({ from, to }) => {
        if (from?.toLowerCase() !== activeBiome) {
            snipe.logDebug(`Biome changed "${from}" → "${to}" — not "${activeBiome}", skipping.`);
            return;
        }
        finish("biome changed", to);
    });

    const unsubClear = BiomeDetector.on("biomeCleared", ({ from }) => {
        if (from.toLowerCase() !== activeBiome) return;
        finish("disconnected");
    });
}

export function startBiomeDetection(snipe: Snipe): void {
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
        snipe.markAsBiomeNotVerified();
        snipe.logWarn("Biome detector is globally disabled.");
        return;
    }

    const expected = (snipe.trigger.biome.detectionKeyword || snipe.trigger.name).toLowerCase();
    const startDelayMs = settings.store.joinMode === "safe" ? 6_000 : 0;
    const t0 = performance.now();

    snipe.logInfo(`Awaiting biome — expecting "${expected}"${startDelayMs > 0 ? ` (delay: ${startDelayMs}ms)` : ""}.`);

    let detecting = true;

    const unsubChange = BiomeDetector.on("biomeChanged", ({ to }) => {
        if (!detecting) return;
        if (startDelayMs > 0 && performance.now() - t0 < startDelayMs) return;

        const elapsed = Math.round(performance.now() - t0);
        const detected = to.toLowerCase();
        detecting = false;
        _unsubscribeBiomeDetection = null;

        if (detected === expected) {
            snipe.markAsBiomeReal();
            snipe.logInfo(`Biome confirmed — "${to}" matched in ${elapsed}ms.`);
            _watchForBiomeEnd(snipe);
            showNotification({
                title: `✅ SoRa :: Real — ${snipe.trigger.name}`,
                body: `Detected in ${elapsed}ms`,
                icon: snipe.trigger.iconUrl,
            });
            if (snipe.trigger.forwarding.onDetection.enabled) {
                snipe.logInfo("Forwarding on detection...");
                forwardSnipe(snipe, "detection").catch(err => {
                    snipe.logError(`Forward on detection failed: ${(err as Error).message}`);
                });
            }
        } else {
            snipe.markAsBiomeBait();
            snipe.logWarn(`Biome bait — got "${to}" instead of "${expected}" (${elapsed}ms).`);
            unsubChange();
            if (JoinLockStore.isLocked) {
                snipe.logWarn("Releasing join lock — bait detected.");
                JoinLockStore.release();
            }
            showNotification({
                title: `❌ SoRa :: Fake — ${snipe.trigger.name}`,
                body: `Got "${to}" instead (${elapsed}ms)`,
                icon: snipe.trigger.iconUrl,
            });

            snipe.logWarn("Sending cancelable notification");
            scheduleCancelableAction(
                settings.store.onBiomeFalse,
                settings.store.biomeFalseActionTimeout ?? 10_000,
                `Fake biome — ${snipe.trigger.name}`,
                snipe.trigger.iconUrl,
            );
        }
    });

    const timer = setTimeout(() => {
        if (!detecting) return;
        detecting = false;
        unsubChange();
        _unsubscribeBiomeDetection = null;
        snipe.markAsBiomeTimeout();
        snipe.logWarn(`Biome detection timed out after ${((settings.store.detectorTimeoutMs ?? 30_000) + startDelayMs) / 1000}s.`);
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
