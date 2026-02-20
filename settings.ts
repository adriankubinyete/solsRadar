/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

export const settings = definePluginSettings({
    pluginIconLocation: {
        type: OptionType.SELECT,
        description: "Where to place the menu button",
        options: [
            { label: "Chat Bar", value: "chatbar" },
            { label: "Title Bar", value: "titlebar" },
            { label: "Hidden", value: "hide" }
        ],
        restartNeeded: true
    },
    pluginIconShortcutAction: {
        type: OptionType.SELECT,
        description: "What to do when right-clicking the menu button",
        options: [
            { label: "Toggle global auto-join", value: "toggle_join" },
            { label: "Toggle global notifications", value: "toggle_notification" },
            { label: "Toggle both", value: "toggle_both" },
            { label: "Do nothing", value: "none" }
        ]
    },
    autoJoinEnabled: {
        type: OptionType.BOOLEAN,
        description: "Global auto-join state. Takes precedence over the trigger-specific setting.",
    },
    notificationEnabled: {
        type: OptionType.BOOLEAN,
        description: "Global notification state. Takes precedence over the trigger-specific setting."

    }
});
