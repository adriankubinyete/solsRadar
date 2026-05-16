/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { Channel, Guild, Message } from "@vencord/discord-types";

import { settings } from "../settings";
import { getActiveTriggers } from "../stores/TriggerStore";
import { Trigger } from "../types";
import { extractComponentUrls } from "../utils";
import { extractServerLink, RobloxLink, stripRobloxLinks } from "./RobloxService";
import { getMatchingTrigger } from "./TriggerMatcher";

export function flattenEmbeds(message: Message): void {
    if (!settings.store.flattenEmbeds || !message.embeds.length) return;
    let flattened = message.content;
    for (const embed of message.embeds) {
        if (embed.type !== "rich") continue;

        // @ts-ignore
        if (embed.title) flattened += ` ${embed.title}`;
        // @ts-ignore
        if (embed.description) flattened += ` ${embed.description}`;

        if (settings.store.advancedEmbedFlattening) {
            if (embed.fields?.length) {
                for (const field of embed.fields) {
                    // @ts-ignore
                    if (field.name) flattened += ` ${field.name}`;
                    // @ts-ignore
                    if (field.value) flattened += ` ${field.value}`;
                }
            }

            if (message.components?.length) {
                const urls = extractComponentUrls(message.components);
                for (const url of urls) {
                    flattened += ` ${url}`;
                }
            }
        }
    }
    message.content = flattened;
    message.embeds = [];
}

export function extractLink(message: Message): RobloxLink | null {
    const result = extractServerLink(message.content);
    return result.ok ? result.result! : null;
}

export function sanitizeContent(message: Message): void {
    message.content = stripRobloxLinks(message.content);
}

export function resolveTrigger(
    { message, channel, guild }: { message: Message; channel: Channel; guild: Guild; },
    log: Logger,
): Trigger | null {
    const activeTriggers = getActiveTriggers();
    if (!activeTriggers.length) return null;

    const { trigger, status } = getMatchingTrigger(message, activeTriggers, log);

    if (status === "ambiguous") return null;

    return trigger;
}
