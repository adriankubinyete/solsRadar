/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React } from "@webpack/common";

// ==================== TYPES ====================

export type VariantState = {
    isFocused?: boolean;
    isHovered?: boolean;
    isActive?: boolean;
    hasError?: boolean;
    isDisabled?: boolean;
};

export type VariantConfig = {
    container: (state: VariantState) => React.CSSProperties;
    decorators?: (state: VariantState) => React.ReactNode;
    innerContent?: (state: VariantState) => React.CSSProperties;
};

// ==================== DECORATORS ====================

/**
 * Sol's RNG style corner decorators
 */
function SolCorners({ state }: { state: VariantState }) {
    const size = 10;
    const thickness = 2;
    // const color = state.isFocused ? "#11a8ff" : "rgb(230, 230, 230)";
    const color = "rgb(230, 230, 230)";
    const opacity = state.isFocused ? 1 : 0.8;

    const cornerStyle = {
        position: "absolute" as const,
        width: size,
        height: size,
        pointerEvents: "none" as const,
        transition: "all 0.2s ease",
        opacity,
    };

    return (
        <>
            {/* Top Left */}
            <div
                style={{
                    ...cornerStyle,
                    top: -1,
                    left: -1,
                    borderTop: `${thickness}px solid ${color}`,
                    borderLeft: `${thickness}px solid ${color}`,
                }}
            />

            {/* Top Right */}
            <div
                style={{
                    ...cornerStyle,
                    top: -1,
                    right: -1,
                    borderTop: `${thickness}px solid ${color}`,
                    borderRight: `${thickness}px solid ${color}`,
                }}
            />

            {/* Bottom Left */}
            <div
                style={{
                    ...cornerStyle,
                    bottom: -1,
                    left: -1,
                    borderBottom: `${thickness}px solid ${color}`,
                    borderLeft: `${thickness}px solid ${color}`,
                }}
            />

            {/* Bottom Right */}
            <div
                style={{
                    ...cornerStyle,
                    bottom: -1,
                    right: -1,
                    borderBottom: `${thickness}px solid ${color}`,
                    borderRight: `${thickness}px solid ${color}`,
                }}
            />
        </>
    );
}

/**
 * Glow effect decorator
 */
function GlowEffect({ state }: { state: VariantState }) {
    if (!state.isFocused) return null;

    return (
        <div
            style={{
                position: "absolute",
                top: -2,
                left: -2,
                right: -2,
                bottom: -2,
                background: "rgba(88, 101, 242, 0.2)",
                filter: "blur(8px)",
                borderRadius: 8,
                pointerEvents: "none",
                zIndex: -1,
                animation: "pulse 2s infinite",
            }}
        />
    );
}

// ==================== VARIANT CONFIGS ====================

export const INPUT_VARIANTS: Record<string, VariantConfig> = {
    default: {
        container: state => ({
            padding: "10px 12px",
            background: "rgba(255,255,255,0.05)",
            borderRadius: 6,
            border: state.hasError
                ? "1px solid #ed4245"
                : state.isFocused
                    ? "1px solid #5865f2"
                    : "1px solid rgba(255,255,255,0.1)",
            transition: "all 0.2s ease",
        }),
        innerContent: () => ({}),
    },

    slim: {
        container: state => ({
            padding: "6px 0px",
            background: "transparent",
            border: "none",
            borderBottom: state.hasError
                ? "1px solid #ed4245"
                : state.isFocused
                    ? "1px solid #5865f2"
                    : "1px solid rgba(255,255,255,0.15)",
            borderRadius: 0,
            transition: "all 0.2s ease",
        }),
        innerContent: () => ({}),
    },

    sol: {
        container: state => ({
            position: "relative",
            padding: "12px",
            // background: state.isFocused
            //     ? "rgba(47, 217, 240, 0.1)"
            //     : "rgba(0, 0, 0, 0.1)",
            background: "rgba(0, 0, 0, 0.1)",
            // border: state.isFocused
            //     ? "1px solid #11a8ff"
            //     : "1px solid rgba(255,255,255,1)",
            border: state.isFocused ? "1px solid rgb(230, 230, 230)" : "1px solid rgba(148, 148, 148, 1)",
            borderRadius: 0,
            transition: "all 0.2s ease",
        }),
        decorators: state => <SolCorners state={state} />,
        innerContent: () => ({}),
    },

    glow: {
        container: state => ({
            position: "relative",
            padding: "12px",
            background: "rgba(88, 101, 242, 0.1)",
            border: state.isFocused
                ? "2px solid #5865f2"
                : "1px solid rgba(88, 101, 242, 0.3)",
            borderRadius: 8,
            transition: "all 0.3s ease",
            boxShadow: state.isFocused
                ? "0 0 20px rgba(88, 101, 242, 0.5)"
                : "none",
        }),
        decorators: state => <GlowEffect state={state} />,
        innerContent: () => ({}),
    },
};

export const BUTTON_VARIANTS: Record<string, VariantConfig> = {
    default: {
        container: state => {
            const colors = {
                primary: { bg: "#5865f2", hover: "#4752c4" },
                success: { bg: "#3ba55c", hover: "#2d7d46" },
                danger: { bg: "#ed4245", hover: "#c03537" },
            };
            const color = colors.primary; // Pode ser dinâmico

            return {
                background: state.isHovered ? color.hover : color.bg,
                border: "none",
                borderRadius: 6,
                padding: "10px 16px",
                cursor: state.isDisabled ? "not-allowed" : "pointer",
                opacity: state.isDisabled ? 0.5 : 1,
                transform: state.isHovered && !state.isDisabled ? "translateY(-1px)" : "translateY(0)",
                transition: "all 0.2s ease",
            };
        },
    },

    sol: {
        container: state => ({
            position: "relative",
            background: state.isHovered
                ? "rgba(47, 217, 240, 0.2)"
                : "rgba(0, 0, 0, 0.3)",
            border: state.isHovered
                ? "1px solid #11a8ff"
                : "1px solid rgba(255,255,255,1)",
            borderRadius: 0,
            padding: "12px 20px",
            cursor: state.isDisabled ? "not-allowed" : "pointer",
            opacity: state.isDisabled ? 0.5 : 1,
            transition: "all 0.2s ease",
        }),
        decorators: state => <SolCorners state={state} />,
    },

    glow: {
        container: state => ({
            position: "relative",
            background: "#5865f2",
            border: "none",
            borderRadius: 8,
            padding: "12px 20px",
            cursor: state.isDisabled ? "not-allowed" : "pointer",
            opacity: state.isDisabled ? 0.5 : 1,
            boxShadow: state.isHovered
                ? "0 0 30px rgba(88, 101, 242, 0.8)"
                : "0 0 15px rgba(88, 101, 242, 0.4)",
            transition: "all 0.3s ease",
        }),
        decorators: state => <GlowEffect state={state} />,
    },
};

export const CARD_VARIANTS: Record<string, VariantConfig> = {
    default: {
        container: state => ({
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: 12,
            cursor: state.isActive ? "pointer" : "default",
            transform: state.isHovered && state.isActive ? "translateY(-2px)" : "translateY(0)",
            transition: "all 0.2s ease",
        }),
    },

    sol: {
        container: state => ({
            position: "relative",
            background: state.isHovered
                ? "rgba(47, 217, 240, 0.1)"
                : "rgba(0, 0, 0, 0.2)",
            border: state.isHovered
                ? "1px solid #11a8ff"
                : "1px solid rgba(255,255,255,0.8)",
            borderRadius: 0,
            padding: 16,
            cursor: state.isActive ? "pointer" : "default",
            transition: "all 0.2s ease",
        }),
        decorators: state => <SolCorners state={state} />,
    },

    elevated: {
        container: state => ({
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 12,
            padding: 16,
            cursor: state.isActive ? "pointer" : "default",
            transform: state.isHovered && state.isActive ? "translateY(-4px)" : "translateY(0)",
            boxShadow: state.isHovered && state.isActive
                ? "0 8px 24px rgba(0,0,0,0.4)"
                : "0 2px 8px rgba(0,0,0,0.2)",
            transition: "all 0.3s ease",
        }),
    },
};

export const SELECT_VARIANTS: Record<string, VariantConfig> = {
    default: {
        container: state => ({
            padding: "10px 12px",
            background: state.isHovered
                ? "rgba(255,255,255,0.08)"
                : "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 6,
            cursor: "pointer",
            transition: "all 0.2s ease",
        }),
    },

    sol: {
        container: state => ({
            position: "relative",
            padding: "12px",
            background: state.isHovered
                ? "rgba(47, 217, 240, 0.1)"
                : "rgba(0, 0, 0, 0.1)",
            border: state.isHovered
                ? "1px solid #11a8ff"
                : "1px solid rgba(255,255,255,1)",
            borderRadius: 0,
            cursor: "pointer",
            transition: "all 0.2s ease",
        }),
        decorators: state => <SolCorners state={state} />,
    },
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Hook para gerenciar estados de interação
 */
export function useVariantState(): [VariantState, {
    setFocused: (v: boolean) => void;
    setHovered: (v: boolean) => void;
    setActive: (v: boolean) => void;
    setError: (v: boolean) => void;
    setDisabled: (v: boolean) => void;
}] {
    const [isFocused, setFocused] = React.useState(false);
    const [isHovered, setHovered] = React.useState(false);
    const [isActive, setActive] = React.useState(false);
    const [hasError, setError] = React.useState(false);
    const [isDisabled, setDisabled] = React.useState(false);

    const state: VariantState = {
        isFocused,
        isHovered,
        isActive,
        hasError,
        isDisabled,
    };

    return [state, { setFocused, setHovered, setActive, setError, setDisabled }];
}

/**
 * Renderiza um container com variante
 */
export function VariantContainer({
    variant = "default",
    variantConfigs,
    state,
    children,
    style = {},
    className = "",
    onClick,
    onMouseEnter,
    onMouseLeave,
}: {
    variant?: string;
    variantConfigs: Record<string, VariantConfig>;
    state: VariantState;
    children: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
    onClick?: () => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}) {
    const config = variantConfigs[variant] || variantConfigs.default;
    const containerStyle = config.container(state);
    const decorators = config.decorators?.(state);

    return (
        <div
            className={className}
            onClick={onClick}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            style={{
                ...containerStyle,
                ...style,
            }}
        >
            {decorators}
            {children}
        </div>
    );
}
