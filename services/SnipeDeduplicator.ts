/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Snipe } from "../models/Snipe";
import { settings } from "../settings";
import { formatElapsedTime } from "../utils";

const lastSeenLink = new Map<string, { link: string; timestamp: number; }>();

export function isDuplicateLink(snipe: Snipe): boolean {
    const now = Date.now();
    const key = snipe.trigger.name;
    const last = lastSeenLink.get(key);

    const isDuplicate = !!(last && last.link === snipe.link.code && now - last.timestamp < 10 * 60 * 1000);

    if (!isDuplicate) return false;

    if (!settings.store.deduplicateLinks || snipe.trigger.conditions.bypassLinkDeduplication) {
        snipe.logInfo(`Duplicate link detected (from ${formatElapsedTime(now - last!.timestamp)} ago), but deduplication is bypassed. Executing anyways.`);
        return false;
    }

    snipe.logInfo(`Duplicate link detected (from ${formatElapsedTime(now - last!.timestamp)} ago). This snipe will be ignored`);
    snipe.markAsIgnored();

    return true;
}

export function markAsSeen(snipe: Snipe): void {
    lastSeenLink.set(snipe.trigger.name, {
        link: snipe.link.code,
        timestamp: Date.now(),
    });
}
