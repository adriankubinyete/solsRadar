/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import definePlugin from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { ChannelRouter, ChannelStore, GuildStore, Menu, NavigationRouter } from "@webpack/common";

import { initTriggers, settings, TriggerDefs } from "./settings";
import { CustomChatBarButton } from "./ui/ChatBarButton";
import { ChannelTypes, createLogger, jumpToMessage, sendNotification } from "./utils/index";
import { recentJoinStore } from "./utils/RecentJoinStore";
import { IJoinData, RobloxLinkHandler } from "./utils/RobloxLinkHandler";

const PLUGIN_NAME = "SolsRadar";
const baselogger = createLogger(PLUGIN_NAME);

const CHANNEL_TYPES_TO_SKIP = [ChannelTypes.DM, ChannelTypes.GROUP_DM] as const;
const SOLS_PLACE_ID = "15532962292"; // Hardcoded no original, mantido
const SOLS_JOIN_DATA = {
    ok: true,
    code: "",
    link: "",
    type: "public",
    placeId: SOLS_PLACE_ID,
} as const;

const joinCooldownEnds = new Map<number, number>();

// Helper to clean expired cooldowns (call periodically or on check)
const cleanupCooldowns = () => {
    const now = Date.now();
    let cleaned = 0;
    for (const [priority, end] of joinCooldownEnds.entries()) {
        if (end <= now) {
            joinCooldownEnds.delete(priority);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        baselogger.debug(`[Cooldown] Cleaned ${cleaned} expired cooldowns. Remaining: ${joinCooldownEnds.size}`);
    }
};

// Returns true if can join for this priority (not in cooldown)
const canJoinWithPriority = (priority: number): boolean => {
    cleanupCooldowns(); // Clean on check
    const end = joinCooldownEnds.get(priority) || 0;
    const now = Date.now();
    const allowed = now >= end;
    baselogger.debug(`[Cooldown] Check priority ${priority}: end=${end}, now=${now}, allowed=${allowed} (remaining: ${joinCooldownEnds.size})`);
    return allowed;
};

// Sets cooldown for priorities <= given priority
const setJoinCooldown = (priority: number, cooldownSeconds: number) => {
    const now = Date.now();
    const endTime = now + (cooldownSeconds * 1000);
    cleanupCooldowns(); // Clean before set
    let setCount = 0;
    for (let p = 1; p <= priority; p++) {
        const currentEnd = joinCooldownEnds.get(p) || 0;
        const newEnd = Math.max(currentEnd, endTime);
        joinCooldownEnds.set(p, newEnd);
        if (newEnd > currentEnd) setCount++;
    }
    baselogger.debug(`[Cooldown] Set cooldown for priorities <= ${priority}: ${cooldownSeconds}s (end=${endTime}, updated ${setCount}, total: ${joinCooldownEnds.size})`);
};

const patchChannelContextMenu: NavContextMenuPatchCallback = (children, { channel }) => {
    if (!channel) return children;

    // csv list to set
    const monitoredChannels = new Set(
        settings.store.monitorChannelList
            .split(",")
            .map(id => id.trim())
            .filter(Boolean)
    );

    const isMonitored = isMonitoredChannel(channel.id);

    const group =
        findGroupChildrenByChildId("mark-channel-read", children) ?? children;

    group.push(
        <Menu.MenuItem
            id="vc-saj-monitor-toggle"
            label={isMonitored ? `${PLUGIN_NAME} stop monitoring` : `${PLUGIN_NAME} add to monitoring`}
            color={isMonitored ? "danger" : "brand"}
            action={() => {
                if (isMonitored) {
                    monitoredChannels.delete(channel.id);
                } else {
                    monitoredChannels.add(channel.id);
                }
                settings.store.monitorChannelList = Array.from(monitoredChannels).join(",");
            }}
        />
    );

    return children;
};

export default definePlugin({
    name: "SolsRadar",
    description: "Does Sol's RNG stuff",
    authors: [{ name: "masutty", id: 188851299255713792n }],
    settings,

    contextMenus: {
        "channel-context": patchChannelContextMenu,
    },

    renderChatBarButton: CustomChatBarButton,

    /**
     * Tenta forçar a subscrição nos canais monitorados, sem abrir o histórico.
     */

    async preloadMonitoredChannels(monitored: Set<string>): Promise<void> {
        const log = baselogger.inherit("preloadMonitoredChannels");
        if (!monitored.size) return;

        for (const channelId of monitored) {
            try {
                log.trace(`Loading channel ${channelId}`);
                ChannelRouter.transitionToChannel(channelId);

                // wait a bit to let the channel load
                await new Promise(res => setTimeout(res, 100));
            } catch (err) {
                log.error(`Failed to load channel ${channelId}:`, err);
            }
        }

        NavigationRouter.transitionToGuild("@me");
    },

    sync(): void {
        const log = baselogger.inherit("sync");

        log.info("Initializing triggers");
        initTriggers(log);
    },

    start(): void {
        const log = baselogger.inherit("start");

        log.info("Syncing");
        this.sync();

        log.trace("Loading recent joins");
        recentJoinStore.load();

        if (settings.store.monitorNavigateToChannelsOnStartup) {
            log.trace("Force-loading monitored channels");
            const monitoredChannels = new Set(settings.store.monitorChannelList.split(",").map(id => id.trim()).filter(Boolean));
            this.preloadMonitoredChannels(monitoredChannels)
                .then(() => log.info("Finished force-loading monitored channels"))
                .catch(err => log.error("Error force-loading monitored channels:", err));
        }
    },

    stop(): void {
        const log = baselogger.inherit("stop");

        log.info("Saving recent joins");
        recentJoinStore.save();
    },

    flux: {
        async WINDOW_UNLOAD() {
            const log = baselogger.inherit("WINDOW_UNLOAD");
            log.info("Saving recent joins");
            recentJoinStore.save();
        },

        async MESSAGE_CREATE({ message, optimistic }: { message: Message, optimistic: boolean; }) {
            if (optimistic) return;

            const log = baselogger.inherit(`${message.id}`);

            // get author, channel and guild objects
            const channel = ChannelStore.getChannel(message.channel_id);
            if (CHANNEL_TYPES_TO_SKIP.includes(channel.type)) return; // early return: not a channel type we care

            const guild = GuildStore.getGuild(channel.guild_id);
            if (!guild) return; // this message doesnt have a guild??

            const { author } = message;

            // normalize some final stuff
            const avatarUrl = `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png`;
            const messageJumpUrl = `https://discord.com/channels/${guild.id}/${channel.id}/${message.id}`;

            // "early" ignore some stuff
            if (!author.id || isUserBlocked(message.author.id)) return; // ignore plugin-blocked users
            if (!settings.store.monitorGreedyMode && !isMonitoredChannel(channel.id)) return; // non-greedy: ignore non-monitored channels
            if (settings.store.monitorGreedyMode && isGreedyIgnoredChannel(channel.id)) return; // greedy: ignore greedy-ignored channels

            // roblox server link verification
            const ro = new RobloxLinkHandler(settings, log);
            const link = ro.extract(message.content); // TODO: make this handle embeds too
            if (!link || !link.ok) return; // message does not have a roblox server link

            // does the message contain a trigger word that is enabled?
            const match = getSingleTriggerMatch(message.content, log);
            if (!match) return; // multiple or no match
            // log.perf(`Matched trigger: ${JSON.stringify(match)}`);

            // snapshots the current config, because this will change as we go
            const shouldNotify = settings.store.notifyEnabled && match.settings.notify;
            const shouldJoin = settings.store.joinEnabled && match.settings.join && canJoinWithPriority(match.settings.priority);

            // Build context
            const ctx = {
                message,
                author,
                channel,
                guild,
                ro,
                link,
                match,
                log,
                avatarUrl,
                messageJumpUrl,
                joinData: null as IJoinData | null
            };

            let wasJoined = false;
            let isBait = false;

            if (shouldJoin) {
                const { joinData, wasJoined: joined, isBait: bait } = await handleJoin(ctx);
                ctx.joinData = joinData;
                wasJoined = joined;
                isBait = bait;

                if (isBait) {
                    handleBait(ctx);
                }

                if (wasJoined && !isBait) {
                    // Set cooldown after successful join
                    setJoinCooldown(match.settings.priority, match.settings.joinCooldown);
                }
            }

            if (shouldNotify) {
                const notif = buildNotification(ctx);
                log.debug("Sending notification");
                sendNotification(notif);
            }

        }

    },

});


function isMonitoredChannel(channelId: string) {
    return new Set(settings.store.monitorChannelList.split(",").map(id => id.trim()).filter(Boolean)).has(channelId);
}

function isGreedyIgnoredChannel(channelId: string) {
    return new Set(settings.store.monitorGreedyExceptionList.split(",").map(id => id.trim()).filter(Boolean)).has(channelId);
}

function isUserBlocked(userId: string) {
    return new Set(settings.store.monitorBlockedUserList.split(",").map(id => id.trim()).filter(Boolean)).has(userId);
}

// Returns an array of matches that fits TriggerKeywords.keywords
function findKeywords(text: string): string[] {
    const normalized = text.toLowerCase();

    let matches: string[] = [];
    matches = Object.entries(TriggerDefs)
        .filter(([_, value]) =>
            value.keywords.some(kw => {
                const pattern = new RegExp(`\\b${kw.replace(/\s+/g, "\\s+")}\\b`, "i");
                return pattern.test(normalized);
            })
        )
        .map(([key]) => key);

    return matches;
}

// extracts a single enabled TriggerKeyword match from the message content.
// - returns the TriggerKeyword object if all matched keywords resolve to exactly one unique enabled trigger
// - returns null otherwise: no matches, matches from multiple different triggers (warns and fails to avoid ambiguity)
// this ensures only unambiguous, active triggers proceed.

function getSingleTriggerMatch(
    content: string,
    log: any
): any | null {
    const matches = findKeywords(content);
    switch (matches.length) {
        case 0:
            log.info("❌ No match found");
            return null;
        case 1:
            const matchName = matches[0];
            if (!settings.store._triggers[matchName].enabled) {
                log.info(`❌ Match found but disabled: ${matchName}`);
                return null;
            }
            log.info(`✅ Match found: ${matchName}`);
            // log.perf("Data1: ", settings.store._triggers[matchName]);
            // log.perf("Data2: ", TriggerKeywords[matchName]);
            // @FIXME: this is kinda ugly
            return {
                id: matchName,
                def: TriggerDefs[matchName],
                settings: settings.store._triggers[matchName],
            };
        default:
            log.warn(`❌ Multiple keyword matches (${matches.join(", ")})`);
            return null;
    }
}

function buildNotification(ctx) {
    const { joinData, match, author, channel, guild, ro, link, message } = ctx;

    let title = `🎯 SoRa :: Sniped ${match.def.name}`;
    let content = `From user ${author.username}\nSent in ${channel.name} (${guild.name})`;

    let onClick: any = async () => await handleJoin(ctx);

    if (!joinData) {
        title += " - click to join!";
        return { title, content, icon: match.def.iconUrl, onClick };
    }

    onClick = () => jumpToMessage(message.id, channel.id, guild.id);

    if (joinData.joined) {
        title = `🎯 SoRa :: Joined ${match.def.name}`;
    }

    if (joinData.verified === false) content += "\n⚠️ Link was not verified";
    if (joinData.verified && joinData.safe) content += "\n✅ Link was verified";

    if (joinData.verified && joinData.safe === false) {
        title = `⚠️ SoRa :: Bait link detected (${match.def.name})`;

        if (joinData.joined) {
            title += " - click to go to message";
            content += `\nSafety action triggered! (${settings.store.verifyAfterJoinFailFallbackAction})`;
        }
    }

    if (joinData.message) content += `\n${joinData.message}`;

    return { title, content, icon: match.def.iconUrl, onClick };
}

function handleBait(ctx) {
    const { author, ro, log } = ctx;

    if (settings.store.monitorBlockUnsafeServerMessageAuthors) {
        settings.store.monitorBlockedUserList += `,${author.id}`;
    }

    log.warn("Bait link detected, safety action will commence soon");

    setTimeout(async () => {
        log.info("Executing safety action");

        if (settings.store.verifyAfterJoinFailFallbackAction === "joinSols") {
            await ro.executeJoin({
                ok: true,
                code: "",
                link: "",
                type: "public",
                placeId: "15532962292"
            });
        } else {
            ro.closeRoblox();
        }
    }, settings.store.verifyAfterJoinFailFallbackDelayMs);
}

async function handleJoin(ctx) {
    const { ro, link, match, author, channel, guild, avatarUrl, messageJumpUrl, log } = ctx;

    log.debug("Executing join");

    const joinData = await ro.safelyJoin(link);

    recentJoinStore.add({
        title: `${match.def.name} sniped!`,
        description: `Sent in ${channel.name} (${guild.name})`,
        iconUrl: match.def.iconUrl,
        authorName: author.username,
        authorAvatarUrl: avatarUrl,
        messageJumpUrl,
        joinStatus: joinData
    });

    const hasResponse = joinData != null;
    const wasJoined = joinData?.joined === true;
    const isBait = hasResponse && joinData.verified === true && joinData.safe === false;

    return { joinData, wasJoined, isBait };
}
