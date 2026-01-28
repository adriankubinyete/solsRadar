/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import ErrorBoundary from "@components/ErrorBoundary";
import definePlugin from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { ChannelRouter, ChannelStore, GuildStore, Menu, NavigationRouter } from "@webpack/common";
import { PropsWithChildren } from "react";

import { createLogger, LogLevel } from "./CustomLogger";
import { BiomeDetectedEvent, BiomeDetector, CancelledError, ClientDisconnectedEvent, DetectorEvents } from "./Detector";
import { JoinStore } from "./JoinStore";
import { initTriggers, isBiomeTriggerType, settings, TriggerDefs, TriggerTypes } from "./settings";
import { TitlebarButton } from "./TitlebarButton";
import { ChannelTypes, jumpToMessage, sendNotification } from "./utils/index";
import { IJoinData, RobloxLinkHandler } from "./utils/RobloxLinkHandler";

const PLUGIN_NAME = "SolsRadar";
const DETECTION_SCOPES = {
    PERMANENT: "biome-detector-permanent",
    DETECTION: "biome-detector-temporary",
};

const baselogger = createLogger(PLUGIN_NAME, () => (settings.store.loggingLevel as LogLevel) ?? "info");

const CHANNEL_TYPES_TO_SKIP = [ChannelTypes.DM, ChannelTypes.GROUP_DM] as const;

export const joinCooldownEnds = new Map<number, number>();

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

    patches: [
        {
            // this breaks if another plugin that messes with the titlebar is enabled
            // i have no clue, but it has something to do with multiple patches being applied
            // UPDATE: i THINK this is caused because theres no "titlebar" api or something, and everyone is trying to patch the same thing
            // i am too dumb and lazy to fix this! oh well
            // known conflicting plugins: ["VencordToolbox"]
            find: '?"BACK_FORWARD_NAVIGATION":',
            replacement: {
                match: /(?<=trailing:.{0,50})\i\.Fragment,\{(?=.+?className:(\i))/,
                replace: "$self.TriggerWrapper,{className:$1,"
            },
            predicate: () => settings.store.uiShowPluginIcon
        }
    ],

    TriggerWrapper({ children, className }: PropsWithChildren<{ className: string; }>) {
        return (
            <>
                {children}
                <ErrorBoundary noop>
                    <TitlebarButton buttonClass={className} />
                </ErrorBoundary>
            </>
        );
    },

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

    async start(): Promise<void> {
        const log = baselogger.inherit("start");

        log.info("Syncing");
        this.sync();

        log.info("Loading recent joins");
        JoinStore.load();

        if (settings.store.biomeDetectorEnabled) {
            log.trace("Starting detector");
            const accounts = settings.store.biomeDetectorAccounts.split(",");
            if (accounts.length) {
                await BiomeDetector.setAccounts(accounts);
                BiomeDetector.start(settings.store.biomeDetectorPoolingRateMs);
            } else {
                log.info("No accounts configured for biome detector");
            }
        }

        // detector.on(DetectorEvents.BIOME_DETECTED, (event: BiomeDetectedEvent) => {
        //     const { username, biome } = event;
        //     log.perf(`Detected biome for ${username}: ${biome}`);
        // }, DETECTION_SCOPES.PERMANENT);

        // detector.on(DetectorEvents.BIOME_CHANGED, (event: BiomeChangedEvent) => {
        //     const { username, from, to } = event;
        //     log.perf(`Detected biome change for ${username}: ${from} -> ${to}`);
        // }, DETECTION_SCOPES.PERMANENT);

        BiomeDetector.on(DetectorEvents.CLIENT_DISCONNECTED, (event: ClientDisconnectedEvent) => {
            const { username } = event;
            log.perf(`Detected client disconnect for ${username}`);
        }, DETECTION_SCOPES.PERMANENT);

        log.trace("Loading recent joins");

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
        JoinStore.save();

        log.info("Stopping detector");
        BiomeDetector.stop();
        BiomeDetector.removeAllListeners();
    },

    flux: {
        async WINDOW_UNLOAD() {
            const log = baselogger.inherit("WINDOW_UNLOAD");
            log.info("Saving recent joins");
            JoinStore.save();
        },

        async MESSAGE_CREATE({ message, optimistic }: { message: Message, optimistic: boolean; }) {
            if (optimistic) return;
            const tMessageReceived = performance.now();

            const log = baselogger.inherit(`MESSAGE_CREATE:${message.id}`);

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

            let { content } = message;
            if (settings.store.monitorInterpretEmbeds && message.embeds.length > 0) {
                // log.debug(`Appending contents of ${message.embeds.length} embeds to message.content`);
                for (const embed of message.embeds) {
                    log.verbose("Embed found:", embed);

                    // for some reason theres no "raw" prefix here?
                    // checking with messagedata cmd shows "rawDescription" and "rawTitle"
                    // but the names here are different...? why?
                    // @ts-ignore // yeah i know
                    if (embed.title) content += ` ${embed.title}`;
                    // @ts-ignore // yeah i know
                    if (embed.description) content += ` ${embed.description}`;
                }
                // log.trace("Final content for trigger matching:", content);
            }

            const link = ro.extract(content);
            if (!link || !link.ok) return; // message does not have a roblox server link

            // does the message contain a trigger word that is enabled?
            const match = getSingleTriggerMatch(content, log);
            if (!match) return; // multiple or no match
            // log.perf(`Matched trigger: ${JSON.stringify(match)}`);

            // snapshots the current config, because this will change as we go

            const isAlreadyInBiome = settings.store.biomeDetectorEnabled
                && settings.store.biomeDetectorAccounts.split(",").length > 0
                && isBiomeTriggerType(match.def.type)
                && BiomeDetector.isAnyAccountInBiome(match.def.name);

            const BYPASS_KEYWORDS_REGEX = /(\bfresh\b|\bpopping\b|\bstarted\b)/i;

            const stopRedundantJoins = settings.store.biomeDetectorStopRedundantJoins;
            let skipRedundantJoin = false;
            if (isAlreadyInBiome && stopRedundantJoins) {
                const hasBypass = BYPASS_KEYWORDS_REGEX.test(message.content);
                if (!hasBypass) {
                    skipRedundantJoin = true;
                    log.info(`Skipping join because we are already in ${match.def.name.toUpperCase()}`);
                } else {
                    // Bypass ativado: continua pro join mesmo já estando no bioma
                    log.debug(`Bypassing "already in biome" check for ${match.def.name.toUpperCase()} due to keywords in message`);
                }
            }

            const shouldNotify = settings.store.notifyEnabled && match.settings.notify;
            const shouldJoin = settings.store.joinEnabled
                && match.settings.join
                && canJoinWithPriority(match.settings.priority)
                && !skipRedundantJoin;

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
                tMessageReceived,
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
                    handleFakeLink(ctx);
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

    const matches: string[] = [];

    for (const [id, def] of Object.entries(TriggerDefs)) {
        for (const rawKw of def.keywords) {
            const kw = rawKw.toLowerCase();

            // se o keyword é UMA PALAVRA sem espaços:
            if (!kw.includes(" ")) {
                // ex: glitch → \bglitch[a-z]*\b
                const pattern = new RegExp(`\\b${kw}[a-z]*\\b`, "i"); // loose match ("GLITCHHHHHHH" for instance)
                if (pattern.test(normalized)) {
                    matches.push(id);
                    break;
                }
            } else {
                // keyword com mais de uma palavra → regex exato com espaços
                const phrase = kw.replace(/\s+/g, "\\s+");
                const pattern = new RegExp(`\\b${phrase}\\b`, "i");
                if (pattern.test(normalized)) {
                    matches.push(id);
                    break;
                }
            }
        }
    }

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

    // remove url slug from serverlinks before matching (roblox.com/games/123456789/slug_here?query=stuff -> roblox.com/games/123456789?query=stuff)
    const cleanedContent = content.replace(
        /(?:https?:\/\/)?(?:[\w.-]+\.)?roblox\.com\/games\/(\d+)\/[^?\s]+/gi,
        "https://roblox.com/games/$1"
    );

    const matches = findKeywords(cleanedContent);
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
        title = `⚠️ SoRa :: Fake link detected (${match.def.name})`;

        if (joinData.joined) {
            title += " - click to go to message";
            content += `\nSafety action triggered! (${settings.store.verifyAfterJoinFailFallbackAction})`;
        }
    }

    if (joinData.message) content += `\n${joinData.message}`;

    return { title, content, icon: match.def.iconUrl, onClick };
}

function handleFakeLink(ctx) {
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
    const { message, ro, link, match, author, channel, guild, avatarUrl, messageJumpUrl, log, tMessageReceived } = ctx;

    log.info("Executing join sequence...");

    const t0 = performance.now();
    const joinData = await ro.safelyJoin(link);
    const t1 = performance.now();

    const timeJoinSequence = t1 - t0;
    const timeSinceMessage = t1 - tMessageReceived;
    const efficiencyMs = timeSinceMessage - timeJoinSequence;

    log.perf(`Join took ${timeJoinSequence.toFixed(1)}ms (since message: ${timeSinceMessage.toFixed(1)}ms / efficiency: ${efficiencyMs.toFixed(1)}ms)`);

    const joinCardId = JoinStore.add({
        title: match.def.name,
        description: `Sent in ${channel.name} (${guild.name})`,
        authorName: author.username,
        authorAvatarUrl: avatarUrl,
        authorId: author.id,
        iconUrl: match.def.iconUrl,
        messageJumpUrl,
        metadata: {
            originalMessageContent: message.content,
            link,
            match,

            // clocks brutos (debug)
            messageTimestamp: message.timestamp,
            tMessageReceived,

            // tempos consistentes
            timeSinceMessageMs: timeSinceMessage.toFixed(1),
            timeTakenJoiningMs: timeJoinSequence.toFixed(1),
            efficiencyMs: (timeSinceMessage - timeJoinSequence).toFixed(1),
        }
    });

    log.debug(`Processing joinCardId ${joinCardId}`);

    const hasResponse = joinData != null;
    const wasJoined = joinData?.joined === true;
    const isBait = hasResponse && joinData.verified === true && joinData.safe === false;

    if (isBait) {
        JoinStore.addTags(joinCardId, "link-verified-unsafe");
    } else if (joinData.safe === true) {
        JoinStore.addTags(joinCardId, "link-verified-safe");
    } else {
        JoinStore.addTags(joinCardId, "link-not-verified");
    }

    if (!settings.store.biomeDetectorEnabled || settings.store.biomeDetectorAccounts.split(",").length === 0) {
        JoinStore.addTags(joinCardId, "biome-not-verified");
        return { joinData, wasJoined, isBait }; // biome detection is disabled OR no accounts configured
    }

    // biome detection below here
    BiomeDetector.clearScope(DETECTION_SCOPES.DETECTION); // clear the scope even if its not the correct trigger
    if ([TriggerTypes.RARE_BIOME, TriggerTypes.EVENT_BIOME, TriggerTypes.NORMAL_BIOME, TriggerTypes.WEATHER].includes(match.def.type) && wasJoined && !isBait) {
        log.warn("Real Sol's Server detected. Initiating detection");

        const t0 = performance.now();

        const { promise } = BiomeDetector.waitFor(DetectorEvents.BIOME_DETECTED, 30_000, DETECTION_SCOPES.DETECTION);
        promise
            .then((result: BiomeDetectedEvent) => {
                if (!result) {
                    /**
                     * This means either:
                     * 1. we got queue'd (too slow)
                     * 2. user closed the game while it was opening
                     * 3. game simply not launched (??) or launched with a disconnected account
                     * 4. roblox started to update LOL
                     */
                    log.warn("Biome detection timed out.");
                    log.trace("Clearing join cooldowns due to detection time out");
                    joinCooldownEnds.clear(); // clear all cooldowns on bait detection
                    sendNotification({ title: "Detector", content: "Biome detection timed out." });
                    JoinStore.addTags(joinCardId, "biome-verified-timeout");
                    return;
                }

                log.info(`Biome detection took ${Math.round(performance.now() - t0)}ms`);
                log.warn(`Biome detected: ${JSON.stringify(result)}`);

                const EXPECTED_BIOME = match.def.name.toUpperCase();
                const DETECTED_BIOME = result.biome.toUpperCase();

                if (EXPECTED_BIOME === DETECTED_BIOME) {
                    sendNotification({ title: `✅ SoRa :: Real (${DETECTED_BIOME})`, content: `Detection took ${Math.round(performance.now() - t0)}ms since link sniped` });
                    JoinStore.addTags(joinCardId, "biome-verified-real");

                    // the biome is real, lets wait until a biome change happens to automatically clear the joinCooldown
                    const { promise } = BiomeDetector.waitFor(DetectorEvents.BIOME_CHANGED, 1800_000, DETECTION_SCOPES.DETECTION);
                    promise
                        .then(changeResult => {
                            if (!changeResult) {
                                log.error("Biome change detection timed out after 30 minutes."); // wow, this should not happen in a normal use-case
                                return;
                            }

                            // log.info(`Biome change detection took ${Math.round(performance.now() - t0)}ms`);
                            // log.warn(`Biome change detected: ${JSON.stringify(changeResult)}`);
                            // log.warn(`Match info: ${JSON.stringify(match)}`);
                            log.perf("It seems that our current biome ended. Clearing join cooldowns.");
                            joinCooldownEnds.clear(); // clear all cooldowns on biome change
                        })
                        .catch(err => {
                            if (err instanceof CancelledError) {
                                log.trace(`The biome change event for joinCardId ${joinCardId} was cancelled, most likely due to a new join taking place.`);
                                return;
                            }
                            log.error(`Biome CHANGE detection error for joinCardId ${joinCardId}:`, err);
                        });
                    // do something cool?
                    // - update joinCard and set biomeBait to false?
                } else {
                    sendNotification({ title: "❌ SoRa :: Fake", content: `Expected: ${EXPECTED_BIOME}, Detected: ${DETECTED_BIOME}\nDetection took ${Math.round(performance.now() - t0)}ms since link sniped` });
                    JoinStore.addTags(joinCardId, "biome-verified-bait");

                    log.info("Clearing join cooldowns due to bait detection");
                    joinCooldownEnds.clear(); // clear all cooldowns on bait detection
                    // do something uncool?
                    // - update joinCard and set biomeBait to true?
                }

            })
            .catch(err => {
                if (err instanceof CancelledError) {
                    log.warn(`Biome detection cancelled for joinCardId ${joinCardId}`);
                    return;
                }
                log.error(`Biome detection error for joinCardId ${joinCardId}:`, err);
            });
    }

    return { joinData, wasJoined, isBait };
}

