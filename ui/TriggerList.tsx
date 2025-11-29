/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// NOTE: i hate this

import { CheckedTextInput } from "@components/CheckedTextInput";
import { ModalCloseButton, ModalContent, ModalHeader, type ModalProps, ModalRoot, openModal } from "@utils/modal";
import { Forms, React } from "@webpack/common";

import { joinCooldownEnds } from "../index";
import { DEFAULT_TRIGGER_SETTING, settings, TriggerDefs, TriggerSetting } from "../settings";
import { Section } from "./BasicComponents";

type TriggerKey = keyof typeof TriggerDefs;
type TriggerData = (typeof TriggerDefs)[TriggerKey];

const FALLBACK_ICON = "https://discord.com/assets/881ed827548f38c6.svg";

export function MinimalSearchInput({
    value,
    onChange,
    placeholder = "Search..."
}: {
    value: string;
    onChange: (newValue: string) => void;
    placeholder?: string;
}) {
    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 0",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                transition: "border-color 120ms ease",
            }}
        >
            {/* SVG lupa estilo discord */}
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "#b9bbbe" }}
            >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            <input
                type="text"
                value={value}
                placeholder={placeholder}
                onChange={e => onChange(e.target.value)}
                style={{
                    background: "transparent",
                    border: "none",
                    color: "white",
                    fontSize: 14,
                    width: "100%",
                    outline: "none",
                }}
                onFocus={e => {
                    e.currentTarget.parentElement!.style.borderBottom =
                        "1px solid rgba(88, 101, 242, 0.8)"; // Discord blurple
                }}
                onBlur={e => {
                    e.currentTarget.parentElement!.style.borderBottom =
                        "1px solid rgba(255, 255, 255, 0.1)";
                }}
            />
        </div>
    );
}

const FILTER_ALIASES: Record<string, string> = {
    p: "priority",
    priority: "priority",

    e: "enabled",
    enabled: "enabled",

    j: "join",
    join: "join",

    n: "notify",
    notify: "notify",
};

function parseFilterQuery(query: string) {
    const parts = query
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    return parts.map(raw => {
        let part = raw.trim();

        if (!part.startsWith(":"))
            return null;

        part = part.slice(1); // remove ":"

        let negated = false;

        if (part.startsWith("!")) {
            negated = true;
            part = part.slice(1); // remove "!"
        }

        const cmpMatch = part.match(/^([a-zA-Z]+)([><]=?|=)?(.*)$/);
        if (!cmpMatch) return null;

        let field = cmpMatch[1];
        const op = cmpMatch[2] || null;
        const value = cmpMatch[3] || null;

        field = FILTER_ALIASES[field];
        if (!field) return null;

        if (!op) {
            return {
                type: "boolean",
                field,
                negated,
            };
        }

        // COMPARISON
        return {
            type: "comparison",
            field,
            op,
            value,
            negated,
        };
    }).filter(Boolean);
}

function matchesFilters(triggerConfig: TriggerSetting, filters: any[]) {
    for (const f of filters) {
        const fieldValue = triggerConfig[f.field];

        if (fieldValue === undefined)
            return false;

        let result = true;

        if (f.type === "boolean") {
            result = Boolean(fieldValue) === true;
        }
        else if (f.type === "comparison") {
            const n = Number(fieldValue);
            const v = Number(f.value);

            switch (f.op) {
                case ">": result = n > v; break;
                case "<": result = n < v; break;
                case ">=": result = n >= v; break;
                case "<=": result = n <= v; break;
                case "=": result = n === v; break;
                default: result = false;
            }
        }

        // apply negation
        if (f.negated) result = !result;

        if (!result) return false;
    }

    return true;
}


export function TriggerToggle({
    label,
    value,
    onChange,
    description,
}: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
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
            onClick={() => onChange(!value)}
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

export function TriggerNumberInput({
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

export function TriggerListUI() {
    const reactive = settings.use(["_triggers"]); // Reativo pro store inteiro
    const triggers = Object.entries(TriggerDefs).map(([key, info]) => ({
        key,
        ...info,
    }));

    // Cooldown warning with timer
    const [remainingSeconds, setRemainingSeconds] = React.useState(0);
    const [highestPriority, setHighestPriority] = React.useState(0);

    // Search state
    const [searchTerm, setSearchTerm] = React.useState("");

    React.useEffect(() => {
        const updateTimer = () => {
            const now = Date.now();
            let newHighest = 0;
            let newRemaining = 0;

            for (const [priority, end] of joinCooldownEnds.entries()) {
                if (end > now) {
                    const remaining = Math.ceil((end - now) / 1000);
                    if (priority > newHighest || (priority === newHighest && remaining > newRemaining)) {
                        newHighest = priority;
                        newRemaining = remaining;
                    }
                }
            }

            setHighestPriority(newHighest);
            setRemainingSeconds(newRemaining);

            if (newRemaining > 0) {
                // Schedule next tick
                setTimeout(updateTimer, 1000);
            }
        };

        updateTimer(); // Initial run

        return () => {
            // Cleanup: No need, as setTimeout self-cleans, but clear if you add interval
        };
    }, []); // Empty deps: Runs once on mount, self-schedules

    const hasCooldown = remainingSeconds > 0 && highestPriority > 0;

    const getTriggerConfig = (key: string): TriggerSetting => {
        return reactive._triggers?.[key] || { ...DEFAULT_TRIGGER_SETTING };
    };

    const filters = parseFilterQuery(searchTerm);
    const filteredTriggers = triggers.filter(trigger => {
        const config = getTriggerConfig(trigger.key);

        // TODO(@adrian): make it so you're able to combine text with filters

        // filter search
        if (filters.length > 0) {
            return matchesFilters(config, filters);
        }

        // name search
        return trigger.key
            .toLowerCase()
            .includes(searchTerm.toLowerCase());
    });

    const updateTrigger = (key: string, updates: Partial<TriggerSetting>) => {
        const current = settings.store._triggers?.[key] || { ...DEFAULT_TRIGGER_SETTING };
        const newConfig = { ...current, ...updates };
        settings.store._triggers[key] = newConfig;
    };

    const toggleEnabled = (key: string) => {
        const current = settings.store._triggers?.[key] || { ...DEFAULT_TRIGGER_SETTING };
        updateTrigger(key, {
            enabled: !current.enabled
        });
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {hasCooldown && (
                <div
                    style={{
                        background: "rgba(244, 125, 77, 0.1)", // Laranja bem suave
                        border: "1px solid rgba(244, 125, 77, 0.3)",
                        borderRadius: 4,
                        padding: "6px 10px",
                        color: "#f47d4d",
                        fontSize: 12,
                        fontWeight: 500,
                        textAlign: "center",
                    }}
                >
                    ⚠️ Priorities ≤{highestPriority} are on join cooldown! ({remainingSeconds}s) ⚠️
                </div>
            )}

            {/* Search Input */}
            <MinimalSearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search triggers..."
            />

            {filteredTriggers.length === 0 && searchTerm ? (
                <div style={{ textAlign: "center", color: "#b9bbbe", fontSize: 14, padding: "20px" }}>
                    No triggers found matching "{searchTerm}"
                </div>
            ) : (
                filteredTriggers.map(trigger => {
                    const config = getTriggerConfig(trigger.key);
                    return (
                        <TriggerRow
                            key={trigger.key}
                            trigger={trigger}
                            config={config}
                            onToggleEnabled={() => toggleEnabled(trigger.key)}
                        />
                    );
                })
            )}
            {searchTerm && filteredTriggers.length < triggers.length && (
                <div style={{ textAlign: "center", color: "#b9bbbe", fontSize: 12 }}>
                    Showing {filteredTriggers.length} of {triggers.length} triggers
                </div>
            )}
        </div>
    );
}

function TriggerRow({
    trigger,
    config,
    onToggleEnabled,
}: {
    trigger: { key: string; } & TriggerData;
    config: TriggerSetting;
    onToggleEnabled: () => void;
}) {
    const isActive = config.enabled;

    const [imageSrc, setImageSrc] = React.useState<string>(trigger.iconUrl || FALLBACK_ICON);

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
        setImageSrc(FALLBACK_ICON);
    };

    return (
        <div
            onClick={e => {
                if (e.button === 2) {
                    e.preventDefault();
                    onToggleEnabled();
                    return;
                }
                // Left-click: open modal
                openModal(props => (
                    <TriggerConfigModal
                        triggerKey={trigger.key}
                        onClose={props.onClose}
                        rootProps={props}
                    />
                ));
            }}
            onContextMenu={e => {
                e.preventDefault();
                onToggleEnabled();
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
            {/* Sempre renderiza a imagem, usando fallback se necessário */}
            <img
                src={imageSrc}
                alt=""
                style={{
                    width: 40,
                    height: 40,
                    objectFit: "cover",
                    borderRadius: 6,
                    flexShrink: 0,
                }}
                onError={handleImageError}
            />
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

            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
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
                {config.join && (
                    <span
                        style={{
                            color: "#5dc7f1ff",
                            fontSize: 10,
                            fontWeight: 500,
                            background: "rgba(77, 171, 247, 0.1)",
                            padding: "2px 6px",
                            borderRadius: 4,
                            flexShrink: 0,
                        }}
                    >
                        Join
                    </span>
                )}
                {config.notify && (
                    <span
                        style={{
                            color: "#f1b65dff",
                            fontSize: 10,
                            fontWeight: 500,
                            background: "rgba(244, 125, 77, 0.1)",
                            padding: "2px 6px",
                            borderRadius: 4,
                            flexShrink: 0,
                        }}
                    >
                        Notify
                    </span>
                )}
            </div>

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

function TriggerConfigModal({
    triggerKey,
    onClose,
    rootProps,
}: {
    triggerKey: string;
    onClose: () => void;
    rootProps: ModalProps;
}) {
    const reactive = settings.use(["_triggers"]);
    const triggerInfo = TriggerDefs[triggerKey as TriggerKey];
    const trigger = { key: triggerKey, ...triggerInfo };
    const conf = reactive._triggers?.[triggerKey];

    if (!conf) {
        return (
            <ModalRoot {...rootProps}>
                <ModalHeader>
                    <Forms.FormTitle tag="h2">{triggerInfo.name || triggerKey} Settings</Forms.FormTitle>
                    <ModalCloseButton onClick={onClose} />
                </ModalHeader>
                <ModalContent>
                    <div>No configuration found.</div>
                </ModalContent>
            </ModalRoot>
        );
    }

    // @NOTE: i have no f*****g clue whats going on here or why it works and im too tired to find out
    const updateStore = React.useCallback((updates: Partial<TriggerSetting>) => {
        console.log("updateStore called with updates:", updates);
        const current = reactive._triggers?.[triggerKey];
        if (!current) return;
        // Deep clone to ensure plain object without Proxy issues
        const plainCurrent = JSON.parse(JSON.stringify(current));
        const newConfig = { ...plainCurrent, ...updates };
        settings.store._triggers[triggerKey] = newConfig;
        console.log("Updated store:", newConfig);
    }, [triggerKey, reactive]);

    const modalProps = { ...rootProps };

    return (
        <ModalRoot {...modalProps}>
            <ModalHeader>
                <Forms.FormTitle tag="h2">{trigger.name} Settings</Forms.FormTitle>
                <ModalCloseButton onClick={onClose} />
            </ModalHeader>

            <ModalContent>
                <Section title="General" defaultOpen>
                    <TriggerToggle
                        label="Enabled"
                        value={conf.enabled}
                        onChange={v => updateStore({ enabled: v })}
                        description="General toggle for this trigger."
                    />

                    <TriggerToggle
                        label="Autojoin"
                        value={conf.join}
                        onChange={v => updateStore({ join: v })}
                        description="Automatically join servers matching this trigger."
                    />

                    <TriggerToggle
                        label="Notifications"
                        value={conf.notify}
                        onChange={v => updateStore({ notify: v })}
                        description="Send desktop notifications for this trigger."
                    />

                    <TriggerNumberInput
                        label="Priority"
                        value={conf.priority}
                        min={1}
                        max={10}
                        onChange={v => updateStore({ priority: v })}
                        description="1-10: Higher values allow overriding cooldowns for rarer events."
                    />

                    <TriggerNumberInput
                        label="Join Cooldown (seconds)"
                        value={conf.joinCooldown}
                        min={0}
                        max={300}
                        onChange={v => updateStore({ joinCooldown: v })}
                        description="Cooldown after joining this trigger before allowing lower-priority joins."
                    />
                </Section>
            </ModalContent>
        </ModalRoot>
    );
}

export default TriggerListUI;
