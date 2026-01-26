/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CheckedTextInput } from "@components/CheckedTextInput";
import { FormSwitch } from "@components/FormSwitch";
import { localStorage } from "@utils/localStorage";
import { OptionType } from "@utils/types";
import { React } from "@webpack/common";

import { CSelect } from "../components/BaseComponents";
import { settings } from "../settings";
import { getSettingMeta, SettingMeta } from "../utils";

export function Note({
    children,
    style,
}: {
    children: React.ReactNode;
    style?: React.CSSProperties;
}) {
    const defaultStyle: React.CSSProperties = {
        borderLeft: "2px solid #888",
        paddingLeft: 8,
        color: "#aaa",
        fontSize: 13,
        lineHeight: 1.4,
        marginTop: -15,
        marginBottom: 15,
    };

    return <div style={{ ...defaultStyle, ...style }}>{children}</div>;
}

export function SectionMessage({ children }: { children: React.ReactNode; }) {
    return (
        <div style={{
            color: "#aaa",
            fontSize: 13,
            margin: "8px 0",
            lineHeight: 1.4,
        }}>
            {children}
        </div>
    );
}

export function SectionTitle({ children }: { children: React.ReactNode; }) {
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            width: "100%",
            margin: "24px 0 12px",
        }}>
            <hr style={{ flex: 1, border: "none", borderTop: "1px solid #555", marginRight: 12 }} />
            <span style={{ whiteSpace: "nowrap", color: "#ccc", fontWeight: 500 }}>{children}</span>
            <hr style={{ flex: 1, border: "none", borderTop: "1px solid #555", marginLeft: 12 }} />
        </div>
    );
}

export function Section({
    title,
    defaultOpen = false,
    persistKey,
    children
}: {
    title: React.ReactNode;
    defaultOpen?: boolean;
    persistKey?: string;
    children: React.ReactNode;
}) {
    const storageKey = persistKey ? `solsRadar.section.${persistKey}` : null;

    const [open, setOpen] = React.useState(() => {
        if (!storageKey) return defaultOpen;

        const saved = localStorage.getItem(storageKey);
        if (saved === "open") return true;
        if (saved === "closed") return false;

        return defaultOpen;
    });

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
        <div style={{ width: "100%", margin: "20px 0" }}>
            {/* Header */}
            <div
                onClick={toggle}
                style={{
                    display: "flex",
                    alignItems: "center",
                    width: "100%",
                    cursor: "pointer",
                    userSelect: "none",
                    opacity: 0.9,
                    transition: "opacity 0.15s",
                }}
            >
                <hr
                    style={{
                        flex: 1,
                        border: "none",
                        borderTop: "1px solid #555",
                        marginRight: 12,
                    }}
                />

                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        color: "#ccc",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                    }}
                >
                    {/* Pequena seta animada */}
                    <span
                        style={{
                            display: "inline-block",
                            transition: "transform 0.25s ease",
                            transform: open ? "rotate(90deg)" : "rotate(0deg)",
                            fontSize: 12,
                            opacity: 0.7,
                        }}
                    >
                        ▶
                    </span>

                    {title}
                </div>

                <hr
                    style={{
                        flex: 1,
                        border: "none",
                        borderTop: "1px solid #555",
                        marginLeft: 12,
                    }}
                />
            </div>

            {/* Conteúdo animado */}
            <div
                style={{
                    maxHeight: open ? "2000px" : "0px",
                    overflow: "hidden",
                    transition: "max-height 0.35s ease",

                    opacity: open ? 1 : 0,
                    transform: open ? "translateY(0px)" : "translateY(-4px)",
                    transitionProperty: "max-height, opacity, transform, padding",
                    transitionDuration: "0.35s",

                    paddingTop: open ? 10 : 0,
                }}
            >
                {children}
            </div>
        </div>
    );
}

// TODO @adrian: nuke this shit from here PLEASEEEEEEEEE (move to BaseComponents and nuke this file)
// also make input use CInput, the hover/focus color is
// inconsistent between OptionType.Select and OptionType.Input

type SettingProps<K extends keyof typeof settings.def> = {
    id: K;
    overrideTitle?: string;
    description?: string;
    className?: string;
    style?: React.CSSProperties;
};

export function Setting<K extends keyof typeof settings.def>({
    id, // YOU CANNOT USE "key", ITS F****** RESERVED. (hit this twice, wow, stupid me)
    overrideTitle,
    description,
    className,
    style,
}: SettingProps<K>) {
    const settingKey = id; // confusion
    console.log("Rendering setting:", settingKey);

    let meta: SettingMeta | undefined;

    try {
        meta = getSettingMeta(settingKey);
    } catch (error) {
        console.error("Error getting setting meta:", error);
        return (
            <div style={{ color: "red" }}>
                Error getting setting meta for {settingKey}
            </div>
        );
    }

    if (!meta) return null;

    const reactive = settings.use([settingKey]);
    const value = reactive[settingKey];

    const title =
        overrideTitle ?? meta.key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());

    let content: React.ReactNode;

    try {
        switch (meta.type) {
            case OptionType.BOOLEAN:
                content = (
                    <FormSwitch
                        title={title}
                        value={Boolean(value)}
                        onChange={v => settings.store[settingKey] = Boolean(v) as any}
                        hideBorder
                    />
                );
                break;

            case OptionType.STRING: {
                const state = settings.use([settingKey]);
                const currentValue = state[settingKey] ?? "" as any;

                content = (
                    <>
                        <div style={{ fontWeight: 500, color: "#ccc", marginBottom: 8 }}>{title}</div>
                        <CheckedTextInput
                            value={currentValue}
                            onChange={v => (settings.store[settingKey] = String(v) as never)}
                            validate={() => true}
                        />
                        {description && (
                            <div style={{ marginTop: 6, color: "#ccc", fontSize: 12 }}>
                                {description}
                            </div>
                        )}
                    </>
                );
                break;
            }

            case OptionType.NUMBER: {
                const hasMin = typeof meta.min === "number";
                const hasMax = typeof meta.max === "number";

                content = (
                    <>
                        <div style={{ fontWeight: 500, color: "#ccc", marginBottom: 8 }}>{title}</div>

                        <CheckedTextInput
                            value={value !== undefined ? String(value) : ""}
                            onChange={v => {
                                const num = Number(v);
                                settings.store[settingKey] = num as any;
                            }}

                            validate={v => {
                                const num = Number(v);
                                if (isNaN(num)) return "Invalid number";

                                if (hasMin && num < meta.min!) {
                                    return `Value must be ≥ ${meta.min}`;
                                }
                                if (hasMax && num > meta.max!) {
                                    return `Value must be ≤ ${meta.max}`;
                                }

                                return true;
                            }}
                        />

                        {description && (
                            <div style={{ marginTop: 6, color: "#ccc", fontSize: 12 }}>
                                {description}
                            </div>
                        )}
                    </>
                );
                break;
            }

            case OptionType.SELECT: {
                const options = meta.options?.map(o => ({ value: o.value, label: o.label })) ?? [];
                content = (
                    <>
                        <div style={{ fontWeight: 500, color: "#ccc", marginBottom: 8 }}>{title}</div>
                        {description && (
                            <div style={{ marginBottom: 8, color: "#ccc", fontSize: 12 }}>
                                {description}
                            </div>
                        )}
                        <CSelect
                            options={options.map(o => ({ label: o.label, value: o.value }))}
                            value={options.find(o => o.value === value)}
                            onChange={opt => {
                                // @ts-ignore — instagram.com/p/DElkib9siLv/
                                settings.store[settingKey] = opt.value;
                            }}
                            size="medium"
                        />
                    </>
                );
                break;
            }

            default:
                content = (
                    <div style={{ color: "red" }}>
                        Unsupported setting type for {meta.key}: {meta.type}
                    </div>
                );
        }
    } catch (error) {
        console.error("Error rendering setting:", error);
        content = (
            <div style={{ color: "red" }}>
                Error rendering setting for {settingKey}
            </div>
        );
    }

    return (
        <div
            className={className ?? ""}
            style={{ ...style }}>
            {content}
        </div>
    );
}
