/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { OpenPluginButton } from "./components/buttons/OpenPluginButton";

export const settings = definePluginSettings({

    _openPlugin: {
        type: OptionType.COMPONENT,
        description: "Use this button to open the plugin's menu if the button is hidden or not showing up.",
        component: OpenPluginButton,
    },

    // main ui stuff
    pluginIconLocation: {
        type: OptionType.SELECT,
        description: "Where to place the menu button",
        options: [
            { label: "Chat Bar (default)", value: "chatbar", default: true }, // this is the most stable place
            { label: "Title Bar", value: "titlebar" },
            { label: "Hidden (not recommended)", value: "hide" }
        ],
        restartNeeded: true
    },
    pluginIconShortcutAction: {
        type: OptionType.SELECT,
        description: "What to do when right-clicking the menu button",
        options: [
            { label: "Toggle global auto-join", value: "toggle_join" },
            { label: "Toggle global notifications", value: "toggle_notification" },
            { label: "Toggle both (default)", value: "toggle_both", default: true },
            { label: "Do nothing", value: "none" }
        ],
        hidden: true,
    },

    // main behavior
    autoJoinEnabled: {
        type: OptionType.BOOLEAN,
        description: "Global auto-join state. Takes precedence over the trigger-specific setting.",
        default: false,
        hidden: true,
    },
    notificationEnabled: {
        type: OptionType.BOOLEAN,
        description: "Global notification state. Takes precedence over the trigger-specific setting.",
        default: false,
        hidden: true,
    },
    closeGameBeforeJoin: {
        type: OptionType.BOOLEAN,
        description: "Close Roblox before joining a server. Prevents silent join failures at the cost of extra latency.",
        default: true,
        hidden: true,
    },
    killMode: {
        type: OptionType.SELECT,
        description: "How to close Roblox before joining. 'await' waits for the process to fully die before launching (reliable, slower). 'fire-and-forget' sends the kill signal and waits a fixed delay (faster, may fail if delay is too low).",
        options: [
            { label: "Await (default)", value: "await", default: true },
            { label: "Fire and forget (faster, may fail if delay is too low)", value: "fire-and-forget" },
            { label: "LDPlayer adb.exe (requires setup)", value: "ldp-adb" },
        ],
        hidden: true,
    },
    closeGameDelay: {
        type: OptionType.NUMBER,
        description: "Delay (ms) between kill signal and launch, when using fire-and-forget mode. Increase if joins are failing. Default: 100",
        default: 100,
        min: 0,
        max: 5000,
        hidden: true,
    },
    useBrowserLaunch: {
        type: OptionType.BOOLEAN,
        description: "Launch the Roblox URI via window.open() instead of Native exec. Faster but metrics become unreliable (fire-and-forget).",
        default: false,
        hidden: true,
    },

    // others
    flattenEmbeds: {
        type: OptionType.BOOLEAN,
        description: "Whether to merge embeds into the message content when checking for triggers. If you're monitoring a Macro server, you might want to enable this.",
        default: true,
        hidden: true,
    },
    deduplicateLinks: {
        type: OptionType.BOOLEAN,
        description: "Prevent duplicate links within a short period from being processed.",
        default: true,
        hidden: true,
    },
    customNotificationSoundDelay: {
        type: OptionType.NUMBER,
        description: "Delay in milliseconds before playing the trigger's defined custom notification sound. Default: 0",
        default: 0,
        min: 0,
        max: 5000,
        hidden: true,
    },
    privateServerLink: {
        type: OptionType.STRING,
        description: "Your private server URL, for actions which require it.",
        default: "",
        hidden: true,
    },

    // advanced, tryhard sniping stuff
    ldpAdbPath: {
        type: OptionType.STRING,
        description: "Path to adb.exe (e.g. C:\\LDPlayer\\LDPlayer9\\adb.exe)",
        default: "C:\\LDPlayer\\LDPlayer9\\adb.exe",
        hidden: true,
    },
    ldpAdbDeviceSerial: {
        type: OptionType.STRING,
        description: "ADB device serial (run 'adb devices' to check). Default: emulator-5554",
        default: "emulator-5554",
        hidden: true,
    },
    ldpAdbPackageName: {
        type: OptionType.STRING,
        description: "Package name to force-stop on the emulator.",
        default: "com.roblox.client",
        hidden: true,
    },


    // @NOTE
    // there is already forward-loop prevention for self-webhooks
    // but with this enabled, we EXPLICITLY ignore ANY forwards from solradar, just in case.
    ignoreWebhookForwards: {
        type: OptionType.BOOLEAN,
        description: "With this enabled, if an embed footer contains the text 'solradar', it will be ignored. Only disable this if you know what you're doing!",
        default: true,
        hidden: true,
    },
    globalWebhookUrl: {
        type: OptionType.STRING,
        description: "Fallback webhook URL used when a trigger has forwarding enabled but no webhook configured. Triggers with their own webhook URL will use that instead.",
        default: "",
        hidden: true,
    },
    censorWebhooks: {
        type: OptionType.BOOLEAN,
        description: "If enabled, the fields 'Sent by' and 'Sent in' from webhook notifications will be redacted.",
        default: false,
        hidden: true,
    },
    forwardIgnoredGuilds: {
        type: OptionType.STRING,
        description: "Comma-separated list of guild IDs that are ignored when forwarding. Example: `123456789012345678, 987654321098765432`",
        default: "",
        hidden: true,
    },

    // ui
    hideInactiveIndicator: {
        type: OptionType.BOOLEAN,
        description: "Whether to hide the red 'inactive' dot in menu button when joins are disabled.",
        default: true,
        hidden: true,
    },

    // monitoring
    monitoredChannels: {
        type: OptionType.STRING,
        description: "Comma-separated list of channel IDs that the plugin should monitor. If empty, no channel will be monitored. Example: `123456789012345678, 987654321098765432`",
        default: "",
        hidden: true,
    },
    ignoredGuilds: {
        type: OptionType.STRING,
        description: "Comma-separated list of guild IDs that are always ignored, regardless of what any trigger says. Use this for servers with no-sniper policies. Example: `123456789012345678, 987654321098765432`",
        default: "",
        hidden: true,
    },
    ignoredChannels: {
        type: OptionType.STRING,
        description: "Comma-separated list of channel IDs that the plugin should ignore. Example: `123456789012345678, 987654321098765432`",
        default: "",
        hidden: true,
    },
    ignoredUsers: {
        type: OptionType.STRING,
        description: "Comma-separated list of user IDs that the plugin should ignore. Example: `123456789012345678, 987654321098765432`",
        default: "",
        hidden: true,
    },

    // link check
    linkVerification: {
        type: OptionType.SELECT,
        description: "When to verify links. Requires a robloxToken configured to work. If set to after, once a bad link is detected, the plugin will execute the onBadLink action.",
        options: [
            { label: "Disabled", value: "disabled", default: true },
            { label: "Before Joining (slower, safer)", value: "before" },
            { label: "After Joining", value: "after" },
        ],
        hidden: true,
    },
    robloxToken: {
        type: OptionType.STRING,
        description: "This is NOT required for the plugin to work! Your .ROBLOSECURITY cookie value. Required for link verification. Keep this private and never share it with anyone. Highly recommended to make an alt account just to use it's token for this. The plugin only uses it to verify if a server link is valid by making a request to Roblox's API. It does NOT store or transmit the token in any other way.",
        default: "",
    },
    onBadLink: {
        type: OptionType.SELECT,
        description: "What to do when a bad link is detected. A bad link is a server link that fails verification (e.g. because it's expired or fake).",
        options: [
            { label: "Nothing (not recommended)", value: "nothing" },
            { label: "Join a public server", value: "public", default: true },
            { label: "Close Roblox", value: "close" },
            { label: "Go to private server", value: "private" },
            { label: "Prepare ADB (for LDP method)", value: "prep-adb" },
        ],
        hidden: true,
    },
    allowedPlaceIds: {
        type: OptionType.STRING,
        description: "Comma-separated list of place IDs that are allowed to be joined. If empty, all place IDs are allowed. Example: `123456789012345678, 987654321098765432`",
        default: "",
        hidden: true,
    },

    // detector
    detectorEnabled: {
        type: OptionType.BOOLEAN,
        description: "Enable biome detection. When active, the plugin reads your Roblox log files to verify whether the biome you joined actually matches what was announced. Requires at least one account configured below.",
        default: false,
        restartNeeded: true, // i am NOT gonna hot-reload this
    },
    detectorAccounts: {
        type: OptionType.STRING,
        description: "Comma-separated list of Roblox usernames to monitor for biome detection. If empty, biome detection is disabled.",
        default: "",
        restartNeeded: true, // i am NOT gonna hot-reload this
    },
    detectorTimeoutMs: {
        type: OptionType.NUMBER,
        description: "How long (in milliseconds) to wait for a biome to be detected after joining. If no biome is detected within this window, the join is marked as timed out and the join lock is released. Recommended: 30000",
        default: 30000,
        restartNeeded: true, // i am NOT gonna hot-reload this
    },
    detectorIntervalMs: {
        type: OptionType.NUMBER,
        description: "How often (in milliseconds) the detector reads your Roblox log files. Lower values give faster detection but read the disk more frequently. Recommended: 5000. Advised to keep this above 1000 due to minimal returns.",
        default: 5000,
        restartNeeded: true, // i am NOT gonna hot-reload this
    },
});
