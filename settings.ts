/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// @useful: get unique biomes from logs:
// grep -h -oP '"largeImage"\s*:\s*\{[^}]*"hoverText"\s*:\s*"\K[^"]+' *.log | sort | uniq

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { createLogger } from "./CustomLogger";
import { BiomeDetector } from "./Detector";

function debounce<T extends (...args: any[]) => void>(fn: T, wait: number) {
    let timeout: any;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), wait);
    };
}

// @TODO: maybe add keywords here too so user can change it?
// @TODO (farther away): maybe add a way to add custom triggers????
export const DEFAULT_TRIGGER_SETTING: TriggerSetting = {
    enabled: false,
    join: true,
    notify: true,
    priority: 0,
    joinCooldown: 0,
};

export const TriggerTypes = {
    RARE_BIOME: "rare_biome",
    EVENT_BIOME: "event_biome",
    NORMAL_BIOME: "normal_biome",
    WEATHER: "weather",
    MERCHANT: "merchant",
    SPECIAL: "special",
};

export type TriggerType = typeof TriggerTypes[keyof typeof TriggerTypes];

export interface TriggerDefinition {
    type: TriggerType;
    name: string; // note: for biome detection, this has to match the RPC's hoverText entry!
    keywords: string[];
    iconUrl: string;
}

export interface TriggerSetting {
    enabled: boolean;
    join: boolean;
    notify: boolean;
    priority: number;
    joinCooldown: number;
}

export const TriggerDefs = {
    GLITCHED: {
        // 1/30000 per biome change
        type: TriggerTypes.RARE_BIOME,
        name: "Glitched",
        keywords: ["glitch", "glitched", "glich", "glith"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/GLITCHED.png",
    },
    CYBERSPACE: {
        // 1/5000 per device use
        type: TriggerTypes.RARE_BIOME,
        name: "Cyberspace",
        keywords: ["cyber", "cyberspace", "cybers", "cyberspce", "cyber space", "cyber-space"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/CYBERSPACE.png",
    },
    DREAMSPACE: {
        // 1/3500000 per second
        type: TriggerTypes.RARE_BIOME,
        name: "Dreamspace",
        keywords: ["dream", "dream space", "dreamspace"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/DREAMSPACE.png",
    },
    // BLOODRAIN: {
    //     type: TriggerTypes.EVENT_BIOME,
    //     name: "Blood Rain",
    //     keywords: ["blood rain", "blood", "bloodrain"],
    //     iconUrl: "https://maxstellar.github.io/biome_thumb/BLOOD_RAIN.png",
    // },
    // PUMPKINMOON: {
    //     type: TriggerTypes.EVENT_BIOME,
    //     name: "Pumpkin Moon",
    //     keywords: ["pump", "pumpkin", "pmoon"],
    //     iconUrl: "https://maxstellar.github.io/biome_thumb/PUMPKIN_MOON.png",
    // },
    // GRAVEYARD: {
    //     type: TriggerTypes.EVENT_BIOME,
    //     name: "Graveyard",
    //     keywords: ["grave", "graveyard", "grave yard"],
    //     iconUrl: "https://maxstellar.github.io/biome_thumb/GRAVEYARD.png",
    // },
    AURORA: {
        type: TriggerTypes.EVENT_BIOME,
        name: "Aurora",
        keywords: ["aurora", "globe"],
        iconUrl: "https://raw.githubusercontent.com/vexthecoder/OysterDetector/main/assets/aurora.png",
    },
    NULL: {
        // 1/10100 per second
        type: TriggerTypes.NORMAL_BIOME,
        name: "Null",
        keywords: ["null"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/NULL.png",
    },
    CORRUPTION: {
        // 1/9000 per second
        type: TriggerTypes.NORMAL_BIOME,
        name: "Corruption",
        keywords: ["corruption", "corrupt"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/CORRUPTION.png",
    },
    HEAVEN: {
        // 1/7777 per second
        type: TriggerTypes.NORMAL_BIOME,
        name: "Heaven",
        keywords: ["heaven"], // bruh (heavenly potion)
        iconUrl: "https://maxstellar.github.io/biome_thumb/HEAVEN.png",
    },
    STARFALL: {
        // 1/7500 per second
        type: TriggerTypes.NORMAL_BIOME,
        name: "Starfall",
        keywords: ["starfall", "star fall"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/STARFALL.png",
    },
    HELL: {
        // 1/6666 per second
        type: TriggerTypes.NORMAL_BIOME,
        name: "Hell",
        keywords: ["hell"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/HELL.png",
    },
    SANDSTORM: {
        // 1/3000 per second
        type: TriggerTypes.NORMAL_BIOME,
        name: "Sand Storm",
        keywords: ["sand", "sand storm", "sandstorm"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/SAND%20STORM.png",
    },
    RAINY: {
        // 1/750 per second
        type: TriggerTypes.WEATHER,
        name: "Rainy",
        keywords: ["rainy"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/RAINY.png",
    },
    SNOWY: {
        // 1/600 per second
        type: TriggerTypes.WEATHER,
        name: "Snowy",
        keywords: ["snowy"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/SNOWY.png",
    },
    WINDY: {
        // 1/500 per second
        type: TriggerTypes.WEATHER,
        name: "Windy",
        keywords: ["windy"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/WINDY.png",
    },
    MARI: {
        type: TriggerTypes.MERCHANT,
        name: "Mari",
        keywords: ["mari", "voidcoin", "void coin"],
        iconUrl: "https://raw.githubusercontent.com/vexthecoder/OysterDetector/refs/heads/main/assets/mari.png",
    },
    JESTER: {
        type: TriggerTypes.MERCHANT,
        name: "Jester",
        keywords: ["jester", "oblivion"],
        iconUrl: "https://raw.githubusercontent.com/vexthecoder/OysterDetector/refs/heads/main/assets/jester.png",
    },
} as const;


export const settings = definePluginSettings({
    /*
    * Main Settings
    */
    joinEnabled: {
        type: OptionType.BOOLEAN,
        description: "Automatically join private server links which matches an enabled trigger.",
        default: false
    },
    notifyEnabled: {
        type: OptionType.BOOLEAN,
        description: "Send a desktop notification when a server link that matches an enabled trigger is detected.",
        default: false
    },
    joinCloseGameBefore: {
        type: OptionType.BOOLEAN,
        description: "Close any open Roblox game before joining. Makes you join slightly slower.",
        default: true
    },

    /*
    * UI and shortcut
    */
    uiShowPluginIcon: {
        type: OptionType.BOOLEAN,
        description: "Shows an icon in the title bar for quick access to the plugin's settings.",
        default: true,
        restartNeeded: true
    },
    uiShortcutAction: {
        type: OptionType.SELECT,
        description: "What happens when you right-click the chat bar button.",
        default: "toggleAutoJoin",
        options: [
            { label: "No action", value: "none" },
            { label: "Toggle AutoJoin", value: "toggleJoin" },
            { label: "Toggle AutoJoin and Notifications", value: "toggleJoinAndNotifications" },
        ],
        hidden: true
    },
    uiShowTagsInInactiveTriggers: {
        type: OptionType.BOOLEAN,
        description: "Show trigger tags even on inactive triggers on the trigger list.",
        default: true,
        hidden: true
    },

    /*
    * Monitoring
    */
    monitorChannelList: {
        type: OptionType.STRING,
        description: "Comma-separated channel IDs that will be monitored for private server links.",
        default: "",
        hidden: true
    },
    monitorNavigateToChannelsOnStartup: {
        type: OptionType.BOOLEAN,
        description: "Whenever you start Vencord, it will quickly navigate to each monitored channel to ensure they are loaded.",
        default: false
    },
    monitorBlockedUserList: {
        type: OptionType.STRING,
        description: "Comma-separated user IDs that will be ignored when monitoring for private server links.",
        default: "",
        hidden: true
    },
    monitorBlockUnsafeServerMessageAuthors: {
        type: OptionType.BOOLEAN,
        description: "Automatically put users who sends server links which leads to non-allowed places into the monitorBlockedUserList. This will only work if you are verifying links.",
        default: false,
        hidden: true
    },
    monitorGreedyMode: {
        type: OptionType.BOOLEAN,
        description: "Ignore monitorChannelList and simply monitor all possible channels. Not recommended.",
        default: false,
        hidden: true
    },
    monitorGreedyExceptionList: {
        type: OptionType.STRING,
        description: "Comma-separated channel IDs to ignore when using greedy mode.",
        default: "",
        hidden: true
    },
    monitorInterpretEmbeds: {
        type: OptionType.BOOLEAN,
        description: "Append embed descriptions to the message content when searching for valid trigger messages.",
        default: true,
        hidden: true
    },

    /*
    * Link verification
    */

    verifyRoblosecurityToken: {
        type: OptionType.STRING,
        description: ".ROBLOSECURITY token used for verifying place IDs when joining. It is required for any place ID verification to work. If it's not set, no verification will be done no matter what settings you have. This is totally optional if you don't want to use place ID verification. (Recommendation: create a fresh throwaway account for this purpose)",
        default: ""
    },
    verifyMode: {
        type: OptionType.SELECT,
        description: "When to verify Roblox place IDs.",
        default: "none",
        options: [
            { label: "No verification", value: "none" },
            { label: "Verify before joining (may slow your join time)", value: "before" },
            { label: "Verify after joining (riskier but won't slow your join time)", value: "after" },
        ],
        hidden: true
    },
    verifyAllowedPlaceIds: {
        type: OptionType.STRING,
        description: "Comma-separated list of allowed place IDs. If empty, all place IDs are allowed.",
        default: "15532962292",
        hidden: true
    },
    verifyBlockedPlaceIds: {
        type: OptionType.STRING,
        description: "Comma-separated list of blocked place IDs. If empty, no place IDs are blocked.",
        default: "",
        hidden: true
    },
    verifyAfterJoinFailFallbackDelayMs: {
        type: OptionType.NUMBER,
        description: "If the place ID verification after joining fails, wait this many milliseconds before executing the safety action.",
        default: 5000,
        hidden: true
    },
    verifyAfterJoinFailFallbackAction: {
        type: OptionType.SELECT,
        description: "Action to execute when place ID verification fails after you already joined the server.",
        default: "joinSols",
        options: [
            { label: "Join Sol's RNG public server", value: "joinSols" },
            { label: "Quit game", value: "quit" },
        ],
        hidden: true
    },

    /*
    * Autojoin
    */
    biomeDetectorEnabled: {
        type: OptionType.BOOLEAN,
        description: "Enable the biome detector for biome validation.",
        default: false,
        onChange: (value: boolean) => {
            if (value) {
                BiomeDetector.setAccounts(settings.store.biomeDetectorAccounts.split(","));
                BiomeDetector.start(settings.store.biomeDetectorPoolingRateMs);
            } else {
                BiomeDetector.stop();
                BiomeDetector.removeAllListeners();
            }
        }
    },
    biomeDetectorPoolingRateMs: {
        type: OptionType.NUMBER,
        description: "How often to 'refresh' biome detection, in milliseconds.",
        default: 1000,
        /**
         * i am so sorry for what im about to do :husk:
         */
        min: 250,
        max: 9999,
        onChange: (() =>
            debounce((value: number) => {
                // console.log(`[SolsRadar] test debouncedChangeRate: ${value}`);
                // NOTE: handle this elsewhere, not my job!!!!!
                // if (value < 250) {
                //     value = 250;
                //     settings.store.biomeDetectorPoolingRateMs = 250;
                //     showToast("Do NOT set it under 250ms", Toasts.Type.FAILURE);
                // }

                if (settings.store.biomeDetectorEnabled) {
                    BiomeDetector.stop();
                    BiomeDetector.start(value);
                }
            }, 500)
        )(),
        hidden: true
    },
    biomeDetectorAccounts: {
        type: OptionType.STRING,
        description: "Comma-separated list of Roblox accounts to monitor. If empty, biome detection is disabled.",
        default: "",
        /**
         * NOTE: I actually have made this work with runtime changes (see below),
         * but I dont want user messing with this so I'll just set restartNeeded on this
         */
        restartNeeded: true,
        // onChange: (() => {
        //     const fn = debounce((value: string) => {
        //         console.log(`[SolsRadar] test debouncedUpdateAccounts: ${value}`);
        //         const accounts = value.split(",").map(v => v.trim()).filter(Boolean);
        //         if (settings.store.biomeDetectorEnabled) {
        //             BiomeDetector.stop();
        //             BiomeDetector.setAccounts(accounts);
        //             BiomeDetector.start(settings.store.biomeDetectorPoolingRateMs);
        //         } else {
        //             BiomeDetector.setAccounts(accounts);
        //         }
        //     }, 500);
        //     return fn;
        // })()
    },

    /*
    * Developer options
    */
    loggingLevel: {
        type: OptionType.SELECT,
        description: "Console logging level",
        default: "info",
        options: [
            { label: "Verbose", value: "verbose" },
            { label: "Trace", value: "trace" },
            { label: "Debug", value: "debug" },
            { label: "Performance", value: "perf" },
            { label: "Info", value: "info" },
            { label: "Warn", value: "warn" },
            { label: "Error", value: "error" },
        ],
        hidden: true
    },
    biomeDetectorLoggingLevel: {
        type: OptionType.SELECT,
        description: "Biome detector logging level",
        default: "info",
        options: [
            { label: "Verbose", value: "verbose" },
            { label: "Trace", value: "trace" },
            { label: "Debug", value: "debug" },
            { label: "Performance", value: "perf" },
            { label: "Info", value: "info" },
            { label: "Warn", value: "warn" },
            { label: "Error", value: "error" },
        ],
        hidden: true
    },
    _dev_verification_fail_fallback_delay_ms: {
        type: OptionType.NUMBER,
        description: "If verification after joining fails, wait this many milliseconds before executing the safety action.",
        default: 5000,
        hidden: true
    },
    _triggers: {
        type: OptionType.CUSTOM,
        default: {} as Record<string, TriggerSetting>,
        hidden: true,
        // onChange: initTriggers // will this cause a loop??
    },

});

export function initTriggers(logger?: ReturnType<typeof createLogger>) {
    const log = logger?.inherit("initTriggers");
    const validKeys = new Set(Object.keys(TriggerDefs));

    // missing triggers
    for (const key of validKeys) {
        if (!settings.store._triggers[key]) {
            log?.info(`+ ADDED NEW TRIGGER "${key}"`);
            settings.store._triggers[key] = { ...DEFAULT_TRIGGER_SETTING };
        }
    }

    // remove stale
    for (const key in settings.store._triggers) {
        if (!validKeys.has(key)) {
            log?.info(`- REMOVED STALE TRIGGER "${key}"`);
            delete settings.store._triggers[key];
        }
    }
}
