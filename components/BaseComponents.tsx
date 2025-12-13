/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React } from "@webpack/common";

import { INPUT_VARIANTS, SELECT_VARIANTS, useVariantState, VariantContainer } from "./Variants";

// ==================== CBUTTON ====================

export type CButtonProps = {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "primary" | "success" | "danger" | "warning" | "secondary";
    size?: "small" | "medium" | "large";
    disabled?: boolean;
    fullWidth?: boolean;
    style?: React.CSSProperties;
};

export function CButton({
    children,
    onClick,
    variant = "primary",
    size = "medium",
    disabled = false,
    fullWidth = false,
    style = {},
}: CButtonProps) {
    const [isHovered, setIsHovered] = React.useState(false);

    const variantColors = {
        primary: { bg: "#5865f2", hover: "#4752c4", text: "#fff" },
        success: { bg: "#3ba55c", hover: "#2d7d46", text: "#fff" },
        danger: { bg: "#ed4245", hover: "#c03537", text: "#fff" },
        warning: { bg: "#faa61a", hover: "#e89112", text: "#fff" },
        secondary: { bg: "rgba(255,255,255,0.08)", hover: "rgba(255,255,255,0.12)", text: "#fff" },
    };

    const sizeStyles = {
        small: { padding: "6px 12px", fontSize: 12 },
        medium: { padding: "10px 16px", fontSize: 14 },
        large: { padding: "14px 20px", fontSize: 16 },
    };

    const colors = variantColors[variant];
    const sizes = sizeStyles[size];

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                background: isHovered && !disabled ? colors.hover : colors.bg,
                color: colors.text,
                border: "none",
                borderRadius: 6,
                cursor: disabled ? "not-allowed" : "pointer",
                fontWeight: 600,
                transition: "all 0.2s ease",
                opacity: disabled ? 0.5 : 1,
                width: fullWidth ? "100%" : "auto",
                transform: isHovered && !disabled ? "translateY(-1px)" : "translateY(0)",
                ...sizes,
                ...style,
            }}
        >
            {children}
        </button>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
            {options.map(option => {
                const isSelected = value === option.value;
                return (
                    <label
                        key={option.value}
                        style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 12,
                            padding: 12,
                            width: "100%",
                            background: isSelected
                                ? "rgba(88, 101, 242, 0.1)"
                                : "rgba(255,255,255,0.05)",
                            border: isSelected
                                ? "1px solid rgba(88, 101, 242, 0.4)"
                                : "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6,
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={e => {
                            if (!isSelected) {
                                (e.currentTarget as HTMLElement).style.background =
                                    "rgba(255,255,255,0.08)";
                            }
                        }}
                        onMouseLeave={e => {
                            if (!isSelected) {
                                (e.currentTarget as HTMLElement).style.background =
                                    "rgba(255,255,255,0.05)";
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
                                marginTop: 2,
                                cursor: "pointer",
                                accentColor: "#5865f2",
                            }}
                        />
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    fontWeight: 600,
                                    color: "#fff",
                                    fontSize: 14,
                                    marginBottom: option.description ? 4 : 0,
                                }}
                            >
                                {option.label}
                            </div>
                            {option.description && (
                                <div style={{ fontSize: 12, color: "#b9bbbe" }}>
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

// ==================== CSELECT ====================

export type CSelectOption = {
    label: string;
    value: string;
};

export type CSelectProps = {
    options: CSelectOption[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    fullWidth?: boolean;
    style?: React.CSSProperties;
    variant?: "default" | "sol";
};

export function CSelect({
    options,
    value,
    onChange,
    placeholder = "Select...",
    fullWidth = true,
    style = {},
    variant = "default",
}: CSelectProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [state, { setHovered, setFocused }] = useVariantState();
    const containerRef = React.useRef<HTMLDivElement>(null);

    const selectedOption = options.find(opt => opt.value === value);

    // Atualiza o estado de focused baseado em isOpen
    React.useEffect(() => {
        setFocused(isOpen);
    }, [isOpen]);

    // Close on outside click
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
                ...style,
            }}
        >
            {/* Trigger */}
            <VariantContainer
                variant={variant}
                variantConfigs={SELECT_VARIANTS}
                state={state}
                onClick={() => setIsOpen(!isOpen)}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    <span style={{ color: selectedOption ? "#fff" : "#b9bbbe", fontSize: 14 }}>
                        {selectedOption?.label || placeholder}
                    </span>
                    <span
                        style={{
                            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                            transition: "transform 0.2s ease",
                            fontSize: 12,
                            marginLeft: 8,
                        }}
                    >
                        ▼
                    </span>
                </div>
            </VariantContainer>

            {/* Dropdown */}
            {isOpen && (
                <div
                    style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        right: 0,
                        background: "#2f3136",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: variant === "sol" ? 0 : 6,
                        overflow: "hidden",
                        zIndex: 1000,
                        maxHeight: 200,
                        overflowY: "auto",
                        boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
                    }}
                >
                    {options.map(option => {
                        const isSelected = option.value === value;
                        return (
                            <div
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                style={{
                                    padding: "10px 12px",
                                    background: isSelected
                                        ? "rgba(88, 101, 242, 0.2)"
                                        : "transparent",
                                    color: "#fff",
                                    cursor: "pointer",
                                    fontSize: 14,
                                    transition: "background 0.15s ease",
                                }}
                                onMouseEnter={e => {
                                    if (!isSelected) {
                                        (e.currentTarget as HTMLElement).style.background =
                                            "rgba(255,255,255,0.08)";
                                    }
                                }}
                                onMouseLeave={e => {
                                    if (!isSelected) {
                                        (e.currentTarget as HTMLElement).style.background =
                                            "transparent";
                                    }
                                }}
                            >
                                {option.label}
                                {isSelected && (
                                    <span style={{ float: "right", color: "#5865f2" }}>✓</span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ==================== CINPUT ====================

export type CInputProps = {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: "text" | "number" | "password";
    fullWidth?: boolean;
    error?: string;
    icon?: React.ReactNode;
    style?: React.CSSProperties;
    variant?: "default" | "slim" | "sol" | "glow";
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
    variant = "default",
}: CInputProps) {
    const [state, { setFocused }] = useVariantState();

    // Atualiza hasError no state
    const finalState = { ...state, hasError: !!error };

    return (
        <div style={{ width: fullWidth ? "100%" : "auto", ...style }}>
            <VariantContainer
                variant={variant}
                variantConfigs={INPUT_VARIANTS}
                state={finalState}
            >
                <div
                    style={{
                        height: 14,
                        display: "flex",
                        alignItems: "center",
                        flexDirection: "row",
                        gap: 8,
                    }}
                >
                    {icon && (
                        <div style={{ color: "#b9bbbe", fontSize: 14 }}>
                            {icon}
                        </div>
                    )}

                    <input
                        type={type}
                        value={value}
                        onChange={e => onChange(e.target.value)}
                        placeholder={placeholder}
                        onFocus={() => setFocused(true)}
                        onBlur={() => setFocused(false)}
                        style={{
                            // flex: 1,
                            background: "transparent",
                            border: "none",
                            color: "#fff",
                            fontSize: 14,
                            outline: "none",
                        }}
                    />
                </div>
            </VariantContainer>

            {error && (
                <div style={{ color: "#ed4245", fontSize: 12, marginTop: 4 }}>
                    {error}
                </div>
            )}
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
        primary: { bg: "rgba(88, 101, 242, 0.2)", border: "rgba(88, 101, 242, 0.4)", text: "#5865f2" },
        success: { bg: "rgba(59, 165, 92, 0.2)", border: "rgba(59, 165, 92, 0.4)", text: "#3ba55c" },
        danger: { bg: "rgba(237, 66, 69, 0.2)", border: "rgba(237, 66, 69, 0.4)", text: "#ed4245" },
        warning: { bg: "rgba(250, 166, 26, 0.2)", border: "rgba(250, 166, 26, 0.4)", text: "#faa61a" },
        secondary: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", text: "#b9bbbe" },
    };

    const sizeStyles = {
        small: { padding: "2px 6px", fontSize: 11 },
        medium: { padding: "4px 8px", fontSize: 12 },
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
                borderRadius: 4,
                fontWeight: 600,
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
        default: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)" },
        success: { bg: "rgba(59, 165, 92, 0.1)", border: "rgba(59, 165, 92, 0.3)" },
        danger: { bg: "rgba(237, 66, 69, 0.1)", border: "rgba(237, 66, 69, 0.3)" },
        warning: { bg: "rgba(250, 166, 26, 0.1)", border: "rgba(250, 166, 26, 0.3)" },
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
                borderRadius: 8,
                padding: 12,
                cursor: onClick || hoverable ? "pointer" : "default",
                transition: "all 0.2s ease",
                transform: isHovered && hoverable ? "translateY(-2px)" : "translateY(0)",
                ...style,
            }}
        >
            {children}
        </div>
    );
}

// ==================== CDIVIDER ====================

export function CDivider({ style = {} }: { style?: React.CSSProperties; }) {
    return (
        <div
            style={{
                height: 1,
                background: "rgba(255,255,255,0.1)",
                margin: "12px 0",
                ...style,
            }}
        />
    );
}

// ==================== CEMPTYSTATE ====================

export type CEmptyStateProps = {
    icon?: React.ReactNode;
    title: string;
    description?: string;
    action?: React.ReactNode;
    style?: React.CSSProperties;
};

export function CEmptyState({ icon, title, description, action, style = {} }: CEmptyStateProps) {
    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 20px",
                textAlign: "center",
                width: "100%",
                ...style,
            }}
        >
            {icon && (
                <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>{icon}</div>
            )}
            <div style={{ fontSize: 16, fontWeight: 600, color: "#fff", marginBottom: 8 }}>
                {title}
            </div>
            {description && (
                <div style={{ fontSize: 14, color: "#b9bbbe", marginBottom: 16 }}>
                    {description}
                </div>
            )}
            {action && <div>{action}</div>}
        </div>
    );
}
