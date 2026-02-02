/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { localStorage } from "@utils/localStorage";
import { React } from "@webpack/common";

import {
    BorderRadius,
    Colors,
    ComponentSizes,
    FontSizes,
    FontWeights,
    Margins,
    Opacities,
    Paddings,
    Transitions,
} from "./constants";

// ==================== CBUTTON ====================

export type CButtonProps = {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "primary" | "success" | "danger" | "warning" | "secondary";
    size?: "small" | "medium" | "large";
    disabled?: boolean;
    fullWidth?: boolean;
    style?: React.CSSProperties;
    className?: string;
    title?: string;
};

export function CButton({
    children,
    onClick,
    variant = "primary",
    size = "medium",
    disabled = false,
    fullWidth = false,
    style = {},
    className = "",
    title = "",
}: CButtonProps) {
    const [isHovered, setIsHovered] = React.useState(false);

    const variantColors = {
        primary: { bg: Colors.PRIMARY, hover: Colors.PRIMARY_HOVER, text: Colors.REALLY_WHITE },
        success: { bg: Colors.SUCCESS, hover: Colors.SUCCESS_HOVER, text: Colors.REALLY_WHITE },
        danger: { bg: Colors.DANGER, hover: Colors.DANGER_HOVER, text: Colors.REALLY_WHITE },
        warning: { bg: Colors.WARNING, hover: Colors.WARNING_HOVER, text: Colors.REALLY_WHITE },
        secondary: { bg: Colors.BG_WHITE_8, hover: Colors.BG_WHITE_12, text: Colors.REALLY_WHITE },
    };

    const colors = variantColors[variant];
    const sizes = ComponentSizes[size.toUpperCase() as keyof typeof ComponentSizes];

    return (
        <button
            className={className}
            onClick={onClick}
            disabled={disabled}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                background: isHovered && !disabled ? colors.hover : colors.bg,
                color: colors.text,
                border: "none",
                borderRadius: BorderRadius.MEDIUM,
                cursor: disabled ? "not-allowed" : "pointer",
                fontWeight: FontWeights.SEMIBOLD,
                transition: Transitions.NORMAL,
                opacity: disabled ? Opacities.DISABLED : Opacities.FULL,
                width: fullWidth ? "100%" : "auto",
                transform: isHovered && !disabled ? "translateY(-1px)" : "translateY(0)",
                boxSizing: "border-box",
                height: sizes.height,
                padding: sizes.padding,
                fontSize: sizes.fontSize,
                ...style,
            }}
            title={title}
        >
            {children}
        </button>
    );
}

// ==================== CINPUT ====================

export type CInputProps = {
    value: string;
    onChange: (e: any) => void;
    placeholder?: string;
    type?: "text" | "number" | "password";
    fullWidth?: boolean;
    error?: string;
    icon?: React.ReactNode;
    style?: React.CSSProperties;
    containerStyle?: React.CSSProperties;
    className?: string;
    onFocus?: () => void;
    onBlur?: () => void;
    size?: "small" | "medium" | "large";
    title?: string;
};

export function CInput({
    value,
    onChange,
    placeholder = "",
    type = "text",
    fullWidth = true,
    error,
    icon,
    style = {},
    containerStyle = {},
    className = "",
    onFocus,
    onBlur,
    size = "medium",
    title = "",
}: CInputProps) {
    const [isFocused, setIsFocused] = React.useState(false);

    const sizes = ComponentSizes[size.toUpperCase() as keyof typeof ComponentSizes];

    const handleFocus = () => {
        setIsFocused(true);
        onFocus?.();
    };

    const handleBlur = () => {
        setIsFocused(false);
        onBlur?.();
    };

    return (
        <div style={{ width: fullWidth ? "100%" : "auto", ...containerStyle }}>
            <div
                className={className}
                style={{
                    ...(style?.height === "100%" ? {} : { height: sizes.height }),
                    background: Colors.BG_WHITE_5,
                    borderRadius: BorderRadius.MEDIUM,
                    border: error
                        ? `1px solid ${Colors.ERROR}`
                        : isFocused
                            ? `1px solid ${Colors.PRIMARY}`
                            : `1px solid ${Colors.BORDER_WHITE_10}`,
                    transition: Transitions.NORMAL,
                    display: "flex",
                    alignItems: "center",
                    gap: Margins.MEDIUM,
                    boxSizing: "border-box",
                    ...style,
                    // Aplica padding do size apenas se não foi sobrescrito no style
                    padding: style?.padding !== undefined ? style.padding : sizes.padding,
                }}
            >
                {icon && (
                    <div style={{ color: Colors.SECONDARY, fontSize: sizes.fontSize, flexShrink: 0 }}>
                        {icon}
                    </div>
                )}

                <input
                    type={type}
                    value={value}
                    onChange={e => onChange(e)} // explicit
                    placeholder={placeholder}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={{
                        flex: 1,
                        background: "transparent",
                        border: "none",
                        color: Colors.REALLY_WHITE,
                        fontSize: sizes.fontSize,
                        outline: "none",
                        width: "100%",
                        height: "100%",
                    }}
                    title={title}
                />
            </div>

            {error && (
                <div style={{ color: Colors.ERROR, fontSize: FontSizes.MEDIUM, marginTop: Margins.SMALL }}>
                    {error}
                </div>
            )}
        </div>
    );
}

// ==================== CSELECT ====================

export type CSelectOption = {
    label: string;
    value: string;
};

export type CSelectProps = {
    options: CSelectOption[];
    value: CSelectOption | undefined;
    onChange: (option: CSelectOption) => void;
    placeholder?: string;
    fullWidth?: boolean;
    style?: React.CSSProperties;
    containerStyle?: React.CSSProperties;
    className?: string;
    size?: "small" | "medium" | "large";
};

export function CSelect({
    options,
    value,
    onChange,
    placeholder = "Select...",
    fullWidth = true,
    style = {},
    containerStyle = {},
    className = "",
    size = "medium",
}: CSelectProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [isHovered, setIsHovered] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value?.value);
    const sizes = ComponentSizes[size.toUpperCase() as keyof typeof ComponentSizes];

    React.useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    return (
        <div
            ref={containerRef}
            style={{
                position: "relative",
                width: fullWidth ? "100%" : "auto",
                ...containerStyle,
            }}
        >
            {/* Botão principal do select */}
            <div
                className={className}
                onClick={() => setIsOpen(!isOpen)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                    height: sizes.height,
                    padding: sizes.padding,
                    background: "var(--input-background-default)", // fundo nativo de inputs
                    border: `1px solid ${
                        isOpen
                            ? "var(--brand-experiment)"
                            : isHovered
                                ? "var(--input-border-hover)"
                                : "var(--input-border-default)"
                    }`,
                    borderRadius: "8px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    boxSizing: "border-box",
                    ...style,
                }}
            >
                <span style={{
                    color: selectedOption
                        ? "var(--text-normal)"
                        : "var(--text-muted)",
                    fontSize: sizes.fontSize,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}>
                    {selectedOption?.label || placeholder}
                </span>

                <span style={{
                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    fontSize: FontSizes.MEDIUM,
                    marginLeft: Margins.MEDIUM,
                    color: "var(--text-muted)",
                }}>
                    ▼
                </span>
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        marginTop: "4px",
                        border: "1px solid var(--input-border-default)",
                        background: "var(--background-surface-higher)",
                        borderRadius: "8px",
                        overflow: "hidden",
                        zIndex: 1000,
                        maxHeight: "320px",
                        overflowY: "auto",
                        boxShadow: "var(--elevation-high)", // sombra perfeita dos popouts do Discord
                    }}
                >
                    {options.map(option => {
                        const isSelected = option.value === value?.value;

                        return (
                            <div
                                key={option.value}
                                onClick={() => {
                                    onChange(option);
                                    setIsOpen(false);
                                }}
                                style={{
                                    padding: `${Paddings.MEDIUM}px ${Paddings.LARGE}px`,
                                    background: isSelected
                                        ? "var(--interactive-background-selected)"
                                        : "",
                                    color: "var(--text-normal)",
                                    cursor: "pointer",
                                    fontSize: sizes.fontSize,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    transition: "background 0.2s ease",
                                }}
                                onMouseEnter={e => {
                                    if (!isSelected) {
                                        e.currentTarget.style.background = "var(--interactive-background-hover)";
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isSelected) {
                                        e.currentTarget.style.background = "";
                                    }
                                }}
                            >
                                <span>{option.label}</span>

                                {isSelected && (
                                    <svg
                                        width="18"
                                        height="18"
                                        viewBox="0 0 24 24"
                                        style={{
                                            marginLeft: "auto",
                                            color: "var(--brand-experiment)",
                                            flexShrink: 0,
                                        }}
                                        aria-hidden="true"
                                    >
                                        <path
                                            fill="currentColor"
                                            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                                        />
                                    </svg>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ==================== CRADIO ====================

export type CRadioOption = {
    label: string;
    value: string;
    description?: string;
};

export type CRadioProps = {
    options: CRadioOption[];
    value: string;
    onChange: (value: string) => void;
    name?: string;
};

export function CRadio({ options, value, onChange, name = "radio" }: CRadioProps) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: Margins.MEDIUM, width: "100%" }}>
            {options.map(option => {
                const isSelected = value === option.value;
                return (
                    <label
                        key={option.value}
                        style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: Paddings.LARGE,
                            padding: Paddings.LARGE,
                            width: "100%",
                            background: isSelected ? Colors.PRIMARY_BG_10 : Colors.BG_WHITE_5,
                            border: isSelected
                                ? `1px solid ${Colors.PRIMARY_BORDER_40}`
                                : `1px solid ${Colors.BORDER_WHITE_10}`,
                            borderRadius: BorderRadius.MEDIUM,
                            cursor: "pointer",
                            transition: Transitions.NORMAL,
                        }}
                        onMouseEnter={e => {
                            if (!isSelected) {
                                (e.currentTarget as HTMLElement).style.background = Colors.BG_WHITE_8;
                            }
                        }}
                        onMouseLeave={e => {
                            if (!isSelected) {
                                (e.currentTarget as HTMLElement).style.background = Colors.BG_WHITE_5;
                            }
                        }}
                    >
                        <input
                            type="radio"
                            name={name}
                            value={option.value}
                            checked={isSelected}
                            onChange={() => onChange(option.value)}
                            style={{
                                marginTop: Margins.TINY,
                                cursor: "pointer",
                                accentColor: Colors.PRIMARY,
                            }}
                        />
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontWeight: FontWeights.SEMIBOLD,
                                    color: Colors.REALLY_WHITE,
                                    fontSize: FontSizes.NORMAL,
                                    marginBottom: option.description ? Margins.SMALL : 0,
                                }}
                            >
                                {option.label}
                            </div>
                            {option.description && (
                                <div style={{ fontSize: FontSizes.MEDIUM, color: Colors.SECONDARY }}>
                                    {option.description}
                                </div>
                            )}
                        </div>
                    </label>
                );
            })}
        </div>
    );
}

// ==================== CBADGE ====================

export type CBadgeProps = {
    children: React.ReactNode;
    variant?: "primary" | "success" | "danger" | "warning" | "secondary";
    size?: "small" | "medium";
    style?: React.CSSProperties;
};

export function CBadge({ children, variant = "secondary", size = "medium", style = {} }: CBadgeProps) {
    const variantColors = {
        primary: { bg: Colors.PRIMARY_BG_20, border: Colors.PRIMARY_BORDER_40, text: Colors.PRIMARY },
        success: { bg: Colors.SUCCESS_BG_20, border: Colors.SUCCESS_BORDER_40, text: Colors.SUCCESS },
        danger: { bg: Colors.DANGER_BG_20, border: Colors.DANGER_BORDER_40, text: Colors.DANGER },
        warning: { bg: Colors.WARNING_BG_20, border: Colors.WARNING_BORDER_40, text: Colors.WARNING },
        secondary: { bg: Colors.BG_WHITE_5, border: Colors.BORDER_WHITE_10, text: Colors.SECONDARY },
    };

    const sizeStyles = {
        small: { padding: `${Paddings.TINY}px ${Paddings.SMALL}px`, fontSize: FontSizes.SMALL },
        medium: { padding: `${Margins.SMALL}px ${Margins.MEDIUM}px`, fontSize: FontSizes.MEDIUM },
    };

    const colors = variantColors[variant];
    const sizes = sizeStyles[size];

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                color: colors.text,
                borderRadius: BorderRadius.SMALL,
                fontWeight: FontWeights.SEMIBOLD,
                whiteSpace: "nowrap",
                ...sizes,
                ...style,
            }}
        >
            {children}
        </span>
    );
}

// ==================== CCARD ====================

export type CCardProps = {
    children: React.ReactNode;
    onClick?: () => void;
    onContextMenu?: () => void;
    variant?: "default" | "success" | "danger" | "warning";
    hoverable?: boolean;
    style?: React.CSSProperties;
};

export function CCard({
    children,
    onClick,
    onContextMenu,
    variant = "default",
    hoverable = false,
    style = {},
}: CCardProps) {
    const [isHovered, setIsHovered] = React.useState(false);

    const variantColors = {
        default: { bg: Colors.BG_WHITE_5, border: Colors.BORDER_WHITE_10 },
        success: { bg: Colors.SUCCESS_BG_10, border: Colors.SUCCESS_BORDER_30 },
        danger: { bg: Colors.DANGER_BG_10, border: Colors.DANGER_BORDER_30 },
        warning: { bg: Colors.WARNING_BG_10, border: Colors.WARNING_BORDER_30 },
    };

    const colors = variantColors[variant];

    return (
        <div
            onClick={onClick}
            onContextMenu={onContextMenu}
            onMouseEnter={() => hoverable && setIsHovered(true)}
            onMouseLeave={() => hoverable && setIsHovered(false)}
            style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: BorderRadius.LARGE,
                padding: Paddings.LARGE,
                cursor: onClick || hoverable ? "pointer" : "default",
                transition: Transitions.NORMAL,
                transform: isHovered && hoverable ? "translateY(-2px)" : "translateY(0)",
                ...style,
            }}
        >
            {children}
        </div>
    );
}

// ==================== CDIVIDER ====================
export function CDivider({
    style = {},
    spacing = "SMALL",
}: {
    style?: React.CSSProperties;
    spacing?: keyof typeof Paddings;
}) {
    return (
        <div
            style={{
                height: 1,
                background: Colors.BORDER_WHITE_10,
                margin: `${Paddings[spacing]}px 0`,
                ...style,
            }}
        />
    );
}

// ==================== CSECTION ====================

export type CSectionProps = {
    title: React.ReactNode;
    defaultOpen?: boolean;
    persistKey?: string;
    children: React.ReactNode;
    spacing?: keyof typeof Paddings;
    style?: React.CSSProperties;
};

export function CSection({
    title,
    defaultOpen = false,
    persistKey,
    children,
    spacing = "XXLARGE",
    style = {},
}: CSectionProps) {
    const storageKey = persistKey ? `section.${persistKey}` : null;

    const [open, setOpen] = React.useState(() => {
        if (!storageKey) return defaultOpen;

        const saved = localStorage.getItem(storageKey);
        if (saved === "open") return true;
        if (saved === "closed") return false;

        return defaultOpen;
    });

    const [isHovered, setIsHovered] = React.useState(false);

    const toggle = () => {
        setOpen(o => {
            const newState = !o;
            if (storageKey) {
                localStorage.setItem(storageKey, newState ? "open" : "closed");
            }
            return newState;
        });
    };

    return (
        <div style={{ width: "100%", margin: `${Paddings[spacing]}px 0`, ...style }}>
            {/* Header */}
            <div
                onClick={toggle}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    cursor: "pointer",
                    userSelect: "none",
                    opacity: isHovered ? Opacities.FULL : Opacities.HOVER,
                    transition: Transitions.FAST,
                }}
            >
                <CDivider
                    spacing="TINY"
                    style={{
                        flex: 1,
                        margin: 0,
                        marginRight: Paddings.LARGE,
                        background: Colors.BORDER_WHITE_15,
                    }}
                />

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: Margins.SMALL,
                        color: Colors.WHITE,
                        fontWeight: FontWeights.MEDIUM,
                        whiteSpace: "nowrap",
                        fontSize: FontSizes.LARGE,
                    }}
                >
                    {/* Seta animada */}
                    <span
                        style={{
                            display: "inline-block",
                            transition: Transitions.NORMAL,
                            transform: open ? "rotate(90deg)" : "rotate(0deg)",
                            fontSize: FontSizes.MEDIUM,
                            opacity: 0.7,
                        }}
                    >
                        ▶
                    </span>

                    {title}
                </div>

                <CDivider
                    spacing="TINY"
                    style={{
                        flex: 1,
                        margin: 0,
                        marginLeft: Paddings.LARGE,
                        background: Colors.BORDER_WHITE_15,
                    }}
                />
            </div>

            {/* Conteúdo animado */}
            <div
                style={{
                    maxHeight: open ? "2000px" : "0px",
                    overflow: "hidden",
                    opacity: open ? Opacities.FULL : 0,
                    transform: open ? "translateY(0px)" : "translateY(-4px)",
                    transitionProperty: "max-height, opacity, transform, padding",
                    transitionDuration: "0.35s",
                    transitionTimingFunction: "ease",
                    paddingTop: open ? Paddings.MEDIUM : 0,
                }}
            >
                {children}
            </div>
        </div>
    );
}

// ==================== CSECTIONMESSAGE ====================

export type CSectionMessageProps = {
    children: React.ReactNode;
    variant?: "default" | "warning" | "success" | "danger";
    style?: React.CSSProperties;
    className?: string;
    iconless?: boolean;
};

export function CSectionMessage({
    children,
    variant = "default",
    style = {},
    className = "",
    iconless = false,
}: CSectionMessageProps) {
    if (variant === "default") {
        return (
            <div
                className={className}
                style={{
                    color: Colors.SECONDARY,
                    fontSize: FontSizes.NORMAL,
                    lineHeight: 1.5,
                    ...style,
                }}
            >
                {children}
            </div>
        );
    }

    const variantStyles = {
        warning: {
            bg: Colors.WARNING_BG_10,
            border: Colors.WARNING_BORDER_30,
            color: Colors.WARNING,
        },
        success: {
            bg: Colors.SUCCESS_BG_10,
            border: Colors.SUCCESS_BORDER_30,
            color: Colors.SUCCESS,
        },
        danger: {
            bg: Colors.DANGER_BG_10,
            border: Colors.DANGER_BORDER_30,
            color: Colors.DANGER,
        },
    };

    const styles = variantStyles[variant];
    const variantIcon = variant === "warning" ? "⚠️" : variant === "success" ? "✅" : "❌";

    return (
        <div
            className={className}
            style={{
                padding: Paddings.LARGE,
                background: styles.bg,
                border: `1px solid ${styles.border}`,
                borderRadius: BorderRadius.MEDIUM,
                color: Colors.SECONDARY,
                fontSize: FontSizes.NORMAL,
                lineHeight: 1.5,
                ...style,
            }}
        >
            {!iconless && (
                <>
                    <div
                        style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        {variantIcon}
                    </div>

                    <CDivider spacing="MEDIUM" />
                </>
            )}
            {children}
        </div>
    );
}

// ==================== CSECTIONNOTE ====================

export type CSectionNoteProps = {
    children: React.ReactNode;
    variant?: "default" | "warning" | "tip";
    style?: React.CSSProperties;
    className?: string;
};

export function CSectionNote({
    children,
    variant = "default",
    style = {},
    className = "",
}: CSectionNoteProps) {
    const variantStyles = {
        default: {
            color: Colors.SECONDARY,
            borderColor: Colors.BORDER_WHITE_15,
        },
        warning: {
            color: Colors.WARNING,
            borderColor: Colors.WARNING_BORDER_30,
        },
        tip: {
            color: Colors.PRIMARY,
            borderColor: Colors.PRIMARY_BORDER_30,
        },
    };

    const styles = variantStyles[variant];

    return (
        <div
            className={className}
            style={{
                display: "flex",
                alignItems: "flex-start",
                gap: Margins.MEDIUM,
                paddingLeft: Paddings.LARGE,
                marginTop: Margins.SMALL,
                marginBottom: Margins.MEDIUM,
                borderLeft: `3px solid ${styles.borderColor}`,
                ...style,
            }}
        >
            <div
                style={{
                    flex: 1,
                    color: styles.color,
                    fontSize: FontSizes.MEDIUM,
                    lineHeight: 1.5,
                    opacity: 0.9,
                }}
            >
                {children}
            </div>
        </div>
    );
}

// ==================== CEMPTYSTATE ====================

export type CEmptyStateProps = {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    style?: React.CSSProperties;
    className?: string;
};

export function CEmptyState({ icon, title, description, action, style = {} }: CEmptyStateProps) {
    return (
        <div
            className="c-empty-state"
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                width: "100%",
                ...style,
            }}
        >
            {icon && (
                <div style={{ fontSize: FontSizes.XXLARGE, marginBottom: Paddings.LARGE, opacity: Opacities.ICON }}>{icon}</div>
            )}
            <div style={{ fontSize: FontSizes.LARGE, fontWeight: FontWeights.SEMIBOLD, color: Colors.REALLY_WHITE, marginBottom: Margins.MEDIUM }}>
                {title}
            </div>
            {description && (
                <div style={{ fontSize: FontSizes.NORMAL, color: Colors.SECONDARY, marginBottom: Paddings.XLARGE }}>
                    {description}
                </div>
            )}
            {action && <div>{action}</div>}
        </div>
    );
}
