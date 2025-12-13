/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const BaseColors = {
    RED: "#ed4245",
    GREEN: "#3ba55c",
    YELLOW: "#faa61a",
    WHITE: "#e6e6e6",
    REALLY_WHITE: "#ffffff",
    GRAY: "#a3a3a3ff",
    BLACK: "#202020ff",
    REALLY_BLACK: "#000000",
} as const;

const Colors = {
    ...BaseColors,

    ERROR: BaseColors.RED,
    DANGER: BaseColors.RED,

    SUCCESS: BaseColors.GREEN,

    WARNING: BaseColors.YELLOW,

    PRIMARY: "#5865f2",
    SECONDARY: "#b9bbbe",
} as const;

const Margins = {
    SMALL: 4,
    MEDIUM: 8,
    LARGE: 12,
    XLARGE: 16,
} as const;

export { Colors, Margins };
