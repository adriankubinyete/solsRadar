/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { CheckedTextInput } from "@components/CheckedTextInput";
import { ModalCloseButton, ModalContent, ModalHeader, type ModalProps, ModalRoot, openModal } from "@utils/modal";
import { Forms, React } from "@webpack/common";

import { ITriggerConfiguration, settings, TriggerKeywords } from "../settings";
import { BaseButton, Line, Section } from "./BasicComponents";

/** Tipagem baseada em TriggerKeywords */
type TriggerKey = keyof typeof TriggerKeywords;
type TriggerData = (typeof TriggerKeywords)[TriggerKey];
type SimpleTrigger = { key: string; name: string; iconUrl?: string; };

/** Componente principal exportado (use dentro do teu Section) */
export function TriggerListUI() {
    const reactive = settings.use(["_triggers"]); // Reativo pro store inteiro
    const triggers: SimpleTrigger[] = Object.entries(TriggerKeywords).map(([key, info]) => ({
        key,
        name: info.name,
        iconUrl: info.iconUrl,
    }));

    const getTriggerConfig = (key: string): ITriggerConfiguration => {
        return reactive._triggers?.[key] || {
            enabled: false,
            join: false,
            notify: false,
            priority: 5,
            joinCooldown: 0
        };
    };

    const updateTrigger = (key: string, updates: Partial<ITriggerConfiguration>) => {
        const current = getTriggerConfig(key);
        const newConfig = { ...current, ...updates };
        settings.store._triggers[key] = newConfig;
    };

    const toggleEnabled = (key: string) => {
        const current = getTriggerConfig(key);
        updateTrigger(key, {
            enabled: !current.enabled
        });
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {triggers.map(trigger => {
                const config = getTriggerConfig(trigger.key);
                return (
                    <TriggerRow
                        key={trigger.key}
                        trigger={trigger}
                        config={config}
                        onToggleEnabled={() => toggleEnabled(trigger.key)}
                        onUpdate={updates => updateTrigger(trigger.key, updates)}
                    />
                );
            })}
        </div>
    );
}

/** Linha do trigger — card estilizado que abre o modal no left-click, toggle enabled no right-click */
function TriggerRow({
    trigger,
    config,
    onToggleEnabled,
    onUpdate
}: {
    trigger: SimpleTrigger;
    config: ITriggerConfiguration;
    onToggleEnabled: () => void;
    onUpdate: (updates: Partial<ITriggerConfiguration>) => void;
}) {
    const isActive = config.enabled; // Verde se enabled ativo

    return (
        <div
            onClick={e => {
                if (e.button === 2) { // Right-click
                    e.preventDefault();
                    onToggleEnabled();
                    return;
                }
                // Left-click: open modal
                openModal(props => (
                    <TriggerConfigModal
                        trigger={trigger}
                        config={config}
                        onClose={props.onClose}
                        rootProps={props}
                        onUpdate={onUpdate}
                    />
                ));
            }}
            onContextMenu={e => {
                e.preventDefault(); // Prevent default context menu
                onToggleEnabled(); // Toggle enabled on right-click
            }}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px",
                background: isActive ? "rgba(59, 165, 92, 0.1)" : "rgba(255,255,255,0.08)",
                border: isActive ? "1px solid rgba(59, 165, 92, 0.3)" : "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                cursor: "pointer",
                transition: "background 0.25s ease, transform 0.2s ease, border-color 0.25s ease",
                overflow: "hidden",
            }}
            onMouseEnter={e => {
                const target = e.currentTarget as HTMLDivElement;
                const hoverBg = isActive ? "rgba(59, 165, 92, 0.15)" : "rgba(255,255,255,0.12)";
                target.style.background = hoverBg;
                target.style.borderColor = isActive ? "rgba(59, 165, 92, 0.4)" : "rgba(255,255,255,0.2)";
                target.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={e => {
                const target = e.currentTarget as HTMLDivElement;
                const baseBg = isActive ? "rgba(59, 165, 92, 0.1)" : "rgba(255,255,255,0.08)";
                target.style.background = baseBg;
                target.style.borderColor = isActive ? "rgba(59, 165, 92, 0.3)" : "rgba(255,255,255,0.1)";
                target.style.transform = "translateY(0)";
            }}
            title={`Right-click to toggle Enabled (${config.enabled ? "ON" : "OFF"})`}
        >
            {trigger.iconUrl && (
                <img
                    src={trigger.iconUrl}
                    alt=""
                    style={{
                        width: 40,
                        height: 40,
                        objectFit: "cover",
                        borderRadius: 6,
                        flexShrink: 0,
                    }}
                    onError={e => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                />
            )}
            <div style={{ flex: 1 }}>
                <div
                    style={{
                        fontWeight: 600,
                        color: "#fff",
                        fontSize: 15,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {trigger.name}
                </div>
                {isActive && (
                    <span style={{ fontSize: 12, color: "#3ba55c", fontWeight: 500 }}>
                        Active
                    </span>
                )}
            </div>
            {isActive && (
                <span
                    style={{
                        color: "#aaa",
                        fontSize: 10,
                        fontWeight: 500,
                        background: "rgba(255,255,255,0.05)",
                        padding: "2px 6px",
                        borderRadius: 4,
                        flexShrink: 0,
                    }}
                >
                    P: {config.priority}
                </span>
            )}
            <span
                style={{
                    color: "#999",
                    fontSize: 12,
                    fontWeight: 500,
                    flexShrink: 0,
                }}
            >
                Configure →
            </span>
        </div>
    );
}

/** Mini modal de configuração (fake, sem persistência) */
function TriggerConfigModal({
    trigger,
    config,
    onClose,
    rootProps,
    onUpdate,
}: {
    trigger: SimpleTrigger;
    config: ITriggerConfiguration;
    onClose: () => void;
    rootProps: ModalProps;
    onUpdate: (updates: Partial<ITriggerConfiguration>) => void;
}) {
    const [localConfig, setLocalConfig] = React.useState(config);
    const [priority, setPriority] = React.useState(config.priority);
    const [joinCooldown, setJoinCooldown] = React.useState(config.joinCooldown);

    React.useEffect(() => {
        setLocalConfig(config);
        setPriority(config.priority);
        setJoinCooldown(config.joinCooldown);
    }, [config]);

    const handleSave = () => {
        onUpdate({ ...localConfig, priority, joinCooldown });
        onClose();
    };

    return (
        <ModalRoot {...rootProps}>
            <ModalHeader>
                <Forms.FormTitle tag="h2">{trigger.name} Settings</Forms.FormTitle>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Section title="General" defaultOpen>
                    <FakeToggle
                        label="Autojoin"
                        value={localConfig.join}
                        onChange={() => setLocalConfig(prev => ({ ...prev, join: !prev.join }))}
                        description="Automatically join servers matching this trigger."
                    />

                    <FakeToggle
                        label="Notifications"
                        value={localConfig.notify}
                        onChange={() => setLocalConfig(prev => ({ ...prev, notify: !prev.notify }))}
                        description="Send desktop notifications for this trigger."
                    />

                    <FakeNumberInput
                        label="Priority"
                        value={priority}
                        min={1}
                        max={10}
                        onChange={setPriority}
                        description="1-10: Higher values allow overriding cooldowns for rarer events."
                    />

                    <FakeNumberInput
                        label="Join Cooldown (seconds)"
                        value={joinCooldown}
                        min={0}
                        max={300}
                        onChange={setJoinCooldown}
                        description="Cooldown after joining this trigger before allowing lower-priority joins."
                    />
                </Section>

                <Line />

                <BaseButton onClick={handleSave} style={{ marginTop: 8 }}>
                    Save & Close
                </BaseButton>
            </ModalContent>
        </ModalRoot>
    );
}

/** Toggle estilizado Discord-like (fake, sem componente real) */
function FakeToggle({
    label,
    value,
    onChange,
    description,
}: {
    label: string;
    value: boolean;
    onChange: () => void;
    description?: string;
}) {
    const isEnabled = value;
    const baseBackground = isEnabled ? "rgba(59, 165, 92, 0.1)" : "rgba(116, 127, 141, 0.1)";
    const hoverBackground = isEnabled ? "rgba(59, 165, 92, 0.15)" : "rgba(116, 127, 141, 0.15)";
    const baseBorder = isEnabled ? "1px solid rgba(59, 165, 92, 0.3)" : "1px solid rgba(116, 127, 141, 0.2)";
    const textColor = isEnabled ? "#3ba55c" : "#747f8d";

    return (
        <div
            style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px",
                background: baseBackground,
                border: baseBorder,
                borderRadius: 6,
                cursor: "pointer",
                transition: "background 0.25s ease, border-color 0.25s ease, transform 0.2s ease",
                marginBottom: 8,
            }}
            onClick={onChange}
            onMouseEnter={e => {
                const target = e.currentTarget as HTMLDivElement;
                target.style.background = hoverBackground;
                target.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={e => {
                const target = e.currentTarget as HTMLDivElement;
                target.style.background = baseBackground;
                target.style.transform = "translateY(0)";
            }}
        >
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontWeight: 600, color: "#fff", fontSize: 14 }}>{label}</span>
                {description && (
                    <span style={{ fontSize: 12, color: "#b9bbbe" }}>{description}</span>
                )}
            </div>
            <span
                style={{
                    fontWeight: 600,
                    color: textColor,
                    fontSize: 13,
                    padding: "4px 8px",
                    background: "rgba(0,0,0,0.2)",
                    borderRadius: 4,
                }}
            >
                {value ? "ON" : "OFF"}
            </span>
        </div>
    );
}

/** Input number estilizado Discord-like (fake, simples como text input) */
function FakeNumberInput({
    label,
    value,
    min = 1,
    max = 10,
    onChange,
    description,
}: {
    label: string;
    value: number;
    min?: number;
    max?: number;
    onChange: (v: number) => void;
    description?: string;
}) {
    const [inputValue, setInputValue] = React.useState(String(value));

    React.useEffect(() => {
        setInputValue(String(value));
    }, [value]);

    const handleChange = (newVal: string) => {
        setInputValue(newVal);
        const numVal = Number(newVal);
        if (!isNaN(numVal) && numVal >= min && numVal <= max) {
            onChange(numVal);
        }
    };

    return (
        <div style={{ marginBottom: 8 }}>
            <div style={{ fontWeight: 600, color: "#fff", fontSize: 14, marginBottom: 4 }}>
                {label}
            </div>
            {description && (
                <div style={{ marginBottom: 8, color: "#b9bbbe", fontSize: 12 }}>
                    {description}
                </div>
            )}
            <CheckedTextInput
                value={inputValue}
                onChange={handleChange}
                validate={v => {
                    const num = Number(v);
                    if (isNaN(num) || num < min || num > max) return `Must be ${min}-${max}`;
                    return true;
                }}
            />
        </div>
    );
}

export default TriggerListUI;
