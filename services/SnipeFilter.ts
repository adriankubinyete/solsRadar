/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { Channel, Message } from "@vencord/discord-types";

import { Snipe } from "../models/Snipe";
import { settings } from "../settings";
import { getActiveTriggers } from "../stores/TriggerStore";
import { Trigger } from "../types";
import { formatElapsedTime, parseCsv } from "../utils";

const lastSeenLink = new Map<string, { link: string; timestamp: number; }>();

export function isValidMessage(message: Message, log: Logger): boolean {
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

export function isMessageAllowed(
    { channel, message, trigger }: { channel: Channel; message: Message; trigger: Trigger; },
    log: Logger,
): boolean {
    if (!trigger.conditions.bypassIgnoredGuilds) {
        const ignoredGuilds = parseCsv(settings.store.ignoredGuilds);
        if (ignoredGuilds.has(channel.guild_id)) {
            log.debug(`[${trigger.name}] Guild ${channel.guild_id} is ignored — skipping.`);
            return false;
        }
    }

    if (trigger.conditions.ignoredGuilds.includes(channel.guild_id)) {
        log.debug(`[${trigger.name}] Guild ${channel.guild_id} is ignored by trigger — skipping.`);
        return false;
    }

    if (!trigger.conditions.bypassIgnoredChannels) {
        const ignoredChannels = parseCsv(settings.store.ignoredChannels);
        if (ignoredChannels.has(channel.id)) {
            log.debug(`[${trigger.name}] Channel #${channel.name} is ignored — skipping.`);
            return false;
        }
    }

    if (trigger.conditions.ignoredChannels.includes(channel.id)) {
        log.debug(`[${trigger.name}] Channel #${channel.name} is ignored by trigger — skipping.`);
        return false;
    }

    const ignoredUsers = parseCsv(settings.store.ignoredUsers);
    if (ignoredUsers.has(message.author.id)) {
        log.debug(`[${trigger.name}] User ${message.author.id} is ignored — skipping.`);
        return false;
    }

    if (!trigger.conditions.bypassMonitoredOnly) {
        const monitored = parseCsv(settings.store.monitoredChannels);
        if (monitored.size > 0 && !monitored.has(channel.id)) {
            log.debug(`[${trigger.name}] Channel #${channel.name} is not monitored — skipping.`);
            return false;
        }
    }

    return true;
}

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
