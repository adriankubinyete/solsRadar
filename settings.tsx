/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// settings.tsx
/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { createLogger } from "./utils";

// @TODO: maybe add keywords here too so user can change it?
// @TODO (farther away): maybe add a way to add custom triggers????
export const DEFAULT_TRIGGER_SETTING: TriggerSetting = {
    enabled: false,
    join: true,
    notify: true,
    priority: 0,
    joinCooldown: 0,
};

export interface TriggerDefinition {
    type: "biome" | "merchant"; // ou string, se quiser aberto
    name: string;
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
        type: "biome",
        name: "Glitched",
        keywords: ["glitch", "glitched", "glich", "glith"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/GLITCHED.png",
    },
    CYBERSPACE: {
        type: "biome",
        name: "Cyberspace",
        keywords: ["cyber", "cyberspace", "cybers", "cyberspce", "cyber space", "cyber-space"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/CYBERSPACE.png",
    },
    DREAMSPACE: {
        type: "biome",
        name: "Dreamspace",
        keywords: ["dream", "dream space", "dreamspace"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/DREAMSPACE.png",
    },
    // BLOODRAIN: {
    //     type: "biome",
    //     name: "Blood Rain",
    //     keywords: ["blood rain", "blood", "bloodrain"],
    //     iconUrl: "https://maxstellar.github.io/biome_thumb/BLOOD_RAIN.png",
    // },
    // PUMPKINMOON: {
    //     type: "biome",
    //     name: "Pumpkin Moon",
    //     keywords: ["pump", "pumpkin", "pmoon"],
    //     iconUrl: "https://maxstellar.github.io/biome_thumb/PUMPKIN_MOON.png",
    // },
    // GRAVEYARD: {
    //     type: "biome",
    //     name: "Graveyard",
    //     keywords: ["grave", "graveyard", "grave yard"],
    //     iconUrl: "https://maxstellar.github.io/biome_thumb/GRAVEYARD.png",
    // },
    NULL: {
        type: "biome",
        name: "Null",
        keywords: ["null"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/NULL.png",
    },
    CORRUPTION: {
        type: "biome",
        name: "Corruption",
        keywords: ["corruption", "corrupt"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/CORRUPTION.png",
    },
    HELL: {
        type: "biome",
        name: "Hell",
        keywords: ["hell"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/HELL.png",
    },
    STARFALL: {
        type: "biome",
        name: "Starfall",
        keywords: ["starfall", "star fall"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/STARFALL.png",
    },
    SANDSTORM: {
        type: "biome",
        name: "Sandstorm",
        keywords: ["sand", "sand storm", "sandstorm"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/SAND%20STORM.png",
    },
    SNOWY: {
        type: "biome",
        name: "Snowy",
        keywords: ["snowy"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/SNOWY.png",
    },
    WINDY: {
        type: "biome",
        name: "Windy",
        keywords: ["windy"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/WINDY.png",
    },
    RAINY: {
        type: "biome",
        name: "Rainy",
        keywords: ["rainy"],
        iconUrl: "https://maxstellar.github.io/biome_thumb/RAINY.png",
    },
    MARI: {
        type: "merchant",
        name: "Mari",
        keywords: ["mari", "voidcoin", "void coin"],
        iconUrl: "https://raw.githubusercontent.com/vexthecoder/OysterDetector/refs/heads/main/assets/mari.png",
    },
    JESTER: {
        type: "merchant",
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
    uiShowChatBarIcon: {
        type: OptionType.BOOLEAN,
        description: "Shows an icon in the chat bar for quick access to the plugin's settings.",
        default: true
    },
    uiShortcutAction: {
        type: OptionType.SELECT,
        description: "What happens when you right-click the chat bar button.",
        default: "toggleAutoJoin",
        options: [
            { label: "No action", value: "none" },
            { label: "Toggle AutoJoin", value: "toggleJoin" },
            { label: "Toggle AutoJoin and Notifications", value: "toggleJoinAndNotifications" },
        ]
    },
    uiShowTagsInInactiveTriggers: {
        type: OptionType.BOOLEAN,
        description: "Show trigger tags even on inactive triggers on the trigger list.",
        default: true
    },

    /*
    * Monitoring
    */
    monitorChannelList: {
        type: OptionType.STRING,
        description: "Comma-separated channel IDs that will be monitored for private server links.",
        default: ""
    },
    monitorNavigateToChannelsOnStartup: {
        type: OptionType.BOOLEAN,
        description: "Whenever you start Vencord, it will quickly navigate to each monitored channel to ensure they are loaded.",
        default: false
    },
    monitorBlockedUserList: {
        type: OptionType.STRING,
        description: "Comma-separated user IDs that will be ignored when monitoring for private server links.",
        default: ""
    },
    monitorBlockUnsafeServerMessageAuthors: {
        type: OptionType.BOOLEAN,
        description: "Automatically put users who sends server links which leads to non-allowed places into the monitorBlockedUserList. This will only work if you are verifying links.",
        default: false
    },
    monitorGreedyMode: {
        type: OptionType.BOOLEAN,
        description: "Ignore monitorChannelList and simply monitor all possible channels. Not recommended.",
        default: false
    },
    monitorGreedyExceptionList: {
        type: OptionType.STRING,
        description: "Comma-separated channel IDs to ignore when using greedy mode.",
        default: ""
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
        ]
    },
    verifyAllowedPlaceIds: {
        type: OptionType.STRING,
        description: "Comma-separated list of allowed place IDs. If empty, all place IDs are allowed.",
        default: "15532962292"
    },
    verifyBlockedPlaceIds: {
        type: OptionType.STRING,
        description: "Comma-separated list of blocked place IDs. If empty, no place IDs are blocked.",
        default: ""
    },
    verifyAfterJoinFailFallbackDelayMs: {
        type: OptionType.NUMBER,
        description: "If the place ID verification after joining fails, wait this many milliseconds before executing the safety action.",
        default: 5000
    },
    verifyAfterJoinFailFallbackAction: {
        type: OptionType.SELECT,
        description: "Action to execute when place ID verification fails after you already joined the server.",
        default: "joinSols",
        options: [
            { label: "Join Sol's RNG public server", value: "joinSols" },
            { label: "Quit game", value: "quit" },
        ]
    },

    /*
    * Developer options
    */
    loggingLevel: {
        type: OptionType.SELECT,
        description: "Console logging level",
        default: "info",
        options: [
            { label: "Trace", value: "trace" },
            { label: "Debug", value: "debug" },
            { label: "Performance", value: "perf" },
            { label: "Info", value: "info" },
            { label: "Warn", value: "warn" },
            { label: "Error", value: "error" },
        ]
    },
    _dev_verification_fail_fallback_delay_ms: {
        type: OptionType.NUMBER,
        description: "If verification after joining fails, wait this many milliseconds before executing the safety action.",
        default: 5000
    },
    _triggers: {
        type: OptionType.CUSTOM,
        default: {} as Record<string, TriggerSetting>,
        hidden: true,
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
