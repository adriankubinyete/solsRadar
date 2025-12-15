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
    PRIMARY_HOVER: "#4752c4",

    SUCCESS_HOVER: "#2d7d46",
    DANGER_HOVER: "#c03537",
    WARNING_HOVER: "#e89112",

    SECONDARY: "#b9bbbe",

    // Sol's RNG style colors
    SOL_CYAN: "#2fd9f0",
    SOL_BLUE: "#11a8ff",

    // Backgrounds
    BG_TRANSPARENT_DARK: "rgba(0, 0, 0, 0.1)",
    BG_TRANSPARENT_DARKER: "rgba(0, 0, 0, 0.2)",
    BG_TRANSPARENT_DARKEST: "rgba(0, 0, 0, 0.3)",

    BG_WHITE_5: "rgba(255, 255, 255, 0.05)",
    BG_WHITE_8: "rgba(255, 255, 255, 0.08)",
    BG_WHITE_10: "rgba(255, 255, 255, 0.1)",
    BG_WHITE_12: "rgba(255, 255, 255, 0.12)",
    BG_WHITE_15: "rgba(255, 255, 255, 0.15)",

    // Borders
    BORDER_WHITE_10: "rgba(255, 255, 255, 0.1)",
    BORDER_WHITE_15: "rgba(255, 255, 255, 0.15)",
    BORDER_WHITE_80: "rgba(255, 255, 255, 0.8)",
    BORDER_GRAY: "rgba(148, 148, 148, 1)",

    // Primary variants
    PRIMARY_BG_10: "rgba(88, 101, 242, 0.1)",
    PRIMARY_BG_20: "rgba(88, 101, 242, 0.2)",
    PRIMARY_BORDER_30: "rgba(88, 101, 242, 0.3)",
    PRIMARY_BORDER_40: "rgba(88, 101, 242, 0.4)",

    // Success variants
    SUCCESS_BG_10: "rgba(59, 165, 92, 0.1)",
    SUCCESS_BG_20: "rgba(59, 165, 92, 0.2)",
    SUCCESS_BORDER_30: "rgba(59, 165, 92, 0.3)",
    SUCCESS_BORDER_40: "rgba(59, 165, 92, 0.4)",

    // Danger variants
    DANGER_BG_10: "rgba(237, 66, 69, 0.1)",
    DANGER_BG_20: "rgba(237, 66, 69, 0.2)",
    DANGER_BORDER_30: "rgba(237, 66, 69, 0.3)",
    DANGER_BORDER_40: "rgba(237, 66, 69, 0.4)",

    // Warning variants
    WARNING_BG_10: "rgba(250, 166, 26, 0.1)",
    WARNING_BG_20: "rgba(250, 166, 26, 0.2)",
    WARNING_BORDER_30: "rgba(250, 166, 26, 0.3)",
    WARNING_BORDER_40: "rgba(250, 166, 26, 0.4)",

    // Sol variants
    SOL_CYAN_BG_10: "rgba(47, 217, 240, 0.1)",
    SOL_CYAN_BG_20: "rgba(47, 217, 240, 0.2)",

    // Discord specific
    DISCORD_BG: "#2f3136",
} as const;

const Margins = {
    TINY: 2,
    SMALL: 4,
    MEDIUM: 8,
    LARGE: 12,
    XLARGE: 16,
    XXLARGE: 20,
} as const;

const Paddings = {
    NONE: 0,
    TINY: 2,
    SMALL: 6,
    MEDIUM: 10,
    LARGE: 12,
    XLARGE: 16,
    XXLARGE: 20,
} as const;

const FontSizes = {
    TINY: 10,
    SMALL: 11,
    MEDIUM: 12,
    NORMAL: 14,
    LARGE: 16,
    XLARGE: 18,
    XXLARGE: 48,
} as const;

const FontWeights = {
    NORMAL: 400,
    MEDIUM: 500,
    SEMIBOLD: 600,
    BOLD: 700,
} as const;

const BorderRadius = {
    NONE: 0,
    SMALL: 4,
    MEDIUM: 6,
    LARGE: 8,
    XLARGE: 12,
} as const;

const ComponentSizes = {
    SMALL: {
        height: 32,
        padding: `${Paddings.SMALL}px ${Paddings.LARGE}px`,
        fontSize: FontSizes.MEDIUM,
    },
    MEDIUM: {
        height: 40,
        padding: `${Paddings.MEDIUM}px ${Paddings.LARGE}px`,
        fontSize: FontSizes.NORMAL,
    },
    LARGE: {
        height: 48,
        padding: `${Paddings.LARGE}px ${Paddings.LARGE}px`,
        fontSize: FontSizes.LARGE,
    },
} as const;

const Transitions = {
    FAST: "all 0.15s ease",
    NORMAL: "all 0.2s ease",
    SLOW: "all 0.3s ease",
} as const;

const Shadows = {
    SMALL: "0 2px 8px rgba(0, 0, 0, 0.2)",
    MEDIUM: "0 4px 12px rgba(0, 0, 0, 0.3)",
    LARGE: "0 8px 24px rgba(0, 0, 0, 0.4)",
    DROPDOWN: "0 8px 16px rgba(0, 0, 0, 0.3)",
} as const;

const Opacities = {
    DISABLED: 0.5,
    HOVER_SUBTLE: 0.85,
    HOVER: 0.9,
    FULL: 1,
    ICON: 0.5,
} as const;

const ZIndex = {
    DROPDOWN: 1000,
} as const;

export {
    BorderRadius,
    Colors,
    ComponentSizes,
    FontSizes,
    FontWeights,
    Margins,
    Opacities,
    Paddings,
    Shadows,
    Transitions,
    ZIndex,
};
