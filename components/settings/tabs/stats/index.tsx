/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { NavigationRouter, React, showToast, TextInput, Toasts } from "@webpack/common";

import { BiomeStatAggregate, BiomeStatEntry, BiomeStatResult, BiomeStatsStore, useBiomeEntries, useBiomeStats } from "../../../../stores/BiomeStatStore";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Period = "7d" | "30d" | "all";
type View = "chart" | "entries";

const PERIOD_OPTIONS: { label: string; value: Period; }[] = [
    { label: "7d", value: "7d" },
    { label: "30d", value: "30d" },
    { label: "All", value: "all" },
];

function periodToSince(period: Period): number | undefined {
    if (period === "all") return undefined;
    const days = period === "7d" ? 7 : 30;
    return Date.now() - days * 24 * 60 * 60 * 1000;
}

// ─── Shared ───────────────────────────────────────────────────────────────────

const RESULT_COLORS: Record<BiomeStatResult, string> = {
    real: "var(--green-360)",
    bait: "var(--red-400)",
    timeout: "var(--yellow-300)",
};

const RESULT_COLORS_RAW: Record<BiomeStatResult, string> = {
    real: "#4ade80",
    bait: "#f87171",
    timeout: "#fbbf24",
};

const RESULT_EMOJI: Record<BiomeStatResult, string> = {
    real: "✅",
    bait: "❌",
    timeout: "⏳",
};

// ─── ChartView ────────────────────────────────────────────────────────────────

function Legend() {
    return (
        <div style={{ display: "flex", gap: 16, justifyContent: "flex-end" }}>
            {(["real", "bait", "timeout"] as const).map(result => (
                <div key={result} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: RESULT_COLORS_RAW[result],
                    }} />
                    <span style={{
                        fontSize: 10, color: "var(--text-muted)",
                        textTransform: "capitalize", letterSpacing: "0.06em",
                        fontWeight: 500,
                    }}>
                        {result}
                    </span>
                </div>
            ))}
        </div>
    );
}

function BiomeBar({ agg }: { agg: BiomeStatAggregate; }) {
    const pct = (n: number) => agg.total === 0 ? 0 : (n / agg.total) * 100;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{
                    fontSize: 12, fontWeight: 600,
                    color: "var(--control-secondary-text-default)",
                    textTransform: "uppercase", letterSpacing: "0.04em",
                }}>
                    {agg.trigger}
                </span>
                <span style={{
                    fontSize: 11, color: "var(--text-muted)",
                    fontVariantNumeric: "tabular-nums",
                }}>
                    {agg.total} total
                    {agg.avgDurationMs != null && ` · avg ${(agg.avgDurationMs / 1000).toFixed(1)}s`}
                </span>
            </div>

            {/* Bar — uses scaleY for hover so surrounding content doesn't shift */}
            <div
                style={{
                    display: "flex",
                    height: 8,
                    borderRadius: 3,
                    overflow: "hidden",
                    background: "var(--control-secondary-background-default)",
                    width: "100%",
                    transformOrigin: "center",
                    transition: "transform 0.2s cubic-bezier(0.34,1.56,0.64,1)",
                    cursor: "default",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "scaleY(2.5)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "scaleY(1)"; }}
            >
                {(["real", "bait", "timeout"] as const).map(result => {
                    const width = pct(agg[result]);
                    if (width === 0) return null;
                    const gradients: Record<BiomeStatResult, string> = {
                        real: "linear-gradient(90deg, #22c55e, #4ade80)",
                        bait: "linear-gradient(90deg, #ef4444, #f87171)",
                        timeout: "linear-gradient(90deg, #d97706, #fbbf24)",
                    };
                    return (
                        <div
                            key={result}
                            title={`${result}: ${agg[result]}`}
                            style={{
                                width: `${width}%`,
                                background: gradients[result],
                                transition: "width 0.4s cubic-bezier(0.4,0,0.2,1)",
                            }}
                        />
                    );
                })}
            </div>

            <div style={{ display: "flex", gap: 14 }}>
                {(["real", "bait", "timeout"] as const).map(result => (
                    <span key={result} style={{
                        fontSize: 11,
                        color: RESULT_COLORS[result],
                        fontVariantNumeric: "tabular-nums",
                        display: "flex", alignItems: "center", gap: 4,
                    }}>
                        <span style={{
                            display: "inline-block",
                            width: 5, height: 5, borderRadius: "50%",
                            background: RESULT_COLORS_RAW[result],
                            flexShrink: 0,
                        }} />
                        {agg[result]}
                    </span>
                ))}
            </div>
        </div>
    );
}

function ChartView({ onBrowse }: { onBrowse: () => void; }) {
    const [period, setPeriod] = React.useState<Period>("7d");
    const since = periodToSince(period);
    const stats = useBiomeStats(since);

    const totalReal = stats.reduce((s, e) => s + e.real, 0);
    const totalBait = stats.reduce((s, e) => s + e.bait, 0);
    const totalTimeout = stats.reduce((s, e) => s + e.timeout, 0);
    const totalAll = totalReal + totalBait + totalTimeout;

    const statCells: { label: string; value: number; color: string; rawColor: string; key: string; }[] = [
        { key: "real", label: "Real", value: totalReal, color: RESULT_COLORS.real, rawColor: RESULT_COLORS_RAW.real },
        { key: "bait", label: "Bait", value: totalBait, color: RESULT_COLORS.bait, rawColor: RESULT_COLORS_RAW.bait },
        { key: "timeout", label: "Timeout", value: totalTimeout, color: RESULT_COLORS.timeout, rawColor: RESULT_COLORS_RAW.timeout },
        { key: "total", label: "Total", value: totalAll, color: "var(--control-secondary-text-default)", rawColor: "rgba(255,255,255,0.3)" },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>

            {/* Header */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                paddingBottom: 12, flexShrink: 0,
            }}>
                <span style={{
                    fontSize: 13, fontWeight: 600,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    color: "var(--text-muted)",
                }}>
                    Biome Detection
                </span>

                {/* Period selector */}
                <div style={{
                    display: "flex", gap: 2,
                    background: "var(--control-secondary-background-default)",
                    borderRadius: 8, padding: 3,
                }}>
                    {PERIOD_OPTIONS.map(o => (
                        <button
                            key={o.value}
                            onClick={() => setPeriod(o.value)}
                            style={{
                                padding: "4px 12px", borderRadius: 6, cursor: "pointer",
                                fontSize: 11, fontWeight: 600,
                                fontFamily: "var(--font-code)",
                                border: `1px solid ${period === o.value ? "var(--brand-500)" : "transparent"}`,
                                background: period === o.value
                                    ? "color-mix(in srgb, var(--brand-500) 18%, var(--background-secondary))"
                                    : "transparent",
                                color: period === o.value
                                    ? "var(--brand-360)"
                                    : "var(--text-muted)",
                                transition: "all 0.15s",
                            }}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats grid — cells separated by 1px gaps */}
            {totalAll > 0 && (
                <div style={{
                    display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 1,
                    background: "var(--background-tertiary)",
                    borderRadius: 8, overflow: "hidden",
                    marginBottom: 12, flexShrink: 0,
                }}>
                    {statCells.map(({ key, label, value, color, rawColor }) => (
                        <div
                            key={key}
                            style={{
                                background: "var(--background-secondary)",
                                padding: "14px 0 12px",
                                display: "flex", flexDirection: "column",
                                alignItems: "center", gap: 4,
                                position: "relative",
                                transition: "background 0.15s",
                            }}
                            onMouseEnter={e => {
                                (e.currentTarget as HTMLDivElement).style.background = "var(--background-modifier-hover)";
                                const bar = e.currentTarget.querySelector(".stat-accent") as HTMLDivElement;
                                if (bar) bar.style.opacity = "1";
                            }}
                            onMouseLeave={e => {
                                (e.currentTarget as HTMLDivElement).style.background = "var(--background-secondary)";
                                const bar = e.currentTarget.querySelector(".stat-accent") as HTMLDivElement;
                                if (bar) bar.style.opacity = "0";
                            }}
                        >
                            <span style={{
                                fontFamily: "var(--font-code)",
                                fontSize: 24, fontWeight: 600,
                                color, lineHeight: 1,
                            }}>
                                {value}
                            </span>
                            <span style={{
                                fontSize: 10, fontWeight: 500,
                                letterSpacing: "0.1em", textTransform: "uppercase",
                                color: "var(--text-muted)",
                            }}>
                                {label}
                            </span>
                            {/* Hover underline accent */}
                            <div
                                className="stat-accent"
                                style={{
                                    position: "absolute", bottom: 0,
                                    left: "20%", right: "20%",
                                    height: 2, borderRadius: 1,
                                    background: rawColor,
                                    opacity: 0,
                                    transition: "opacity 0.2s",
                                }}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Legend + Chart */}
            <div style={{
                flex: 1, overflowY: "auto", paddingTop: 4,
                scrollbarColor: "var(--text-muted) transparent",
                scrollbarWidth: "thin",
            }}>
                {stats.length === 0 ? (
                    <div style={{ textAlign: "center", marginTop: 40 }}>
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                            No data for this period.
                        </span>
                    </div>
                ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                        <Legend />
                        {stats.map(agg => (
                            <BiomeBar key={agg.trigger} agg={agg} />
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                paddingTop: 10, flexShrink: 0,
                borderTop: "1px solid var(--control-secondary-background-default)",
                marginTop: 4, marginBottom: 12,
            }}>
                <button
                    onClick={onBrowse}
                    style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 12, color: "var(--text-muted)", padding: 0,
                        transition: "color 0.15s",
                        letterSpacing: "0.03em",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-default)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
                >
                    Browse entries →
                </button>
                {totalAll > 0 && (
                    <Button size="small" variant="dangerPrimary" onClick={() => BiomeStatsStore.clear()}>
                        Clear stats
                    </Button>
                )}
            </div>
        </div>
    );
}

// ─── EntriesView ──────────────────────────────────────────────────────────────

function formatDate(t: number): string {
    return new Date(t).toLocaleString(undefined, {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function EntryRow({ entry, selected, onToggle }: {
    entry: BiomeStatEntry;
    selected: boolean;
    onToggle: () => void;
}) {
    const jumpToMessage = () => {
        if (!entry.messageJumpUrl) return;
        try {
            NavigationRouter.transitionTo(new URL(entry.messageJumpUrl).pathname);
        } catch {
            showToast("Failed to navigate.", Toasts.Type.FAILURE);
        }
    };

    return (
        <div
            onClick={onToggle}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 6,
                cursor: "pointer",
                background: selected
                    ? "color-mix(in srgb, var(--brand-500) 12%, var(--background-secondary))"
                    : "var(--background-secondary)",
                border: `1px solid ${selected ? "var(--brand-500)" : "var(--control-secondary-background-default)"}`,
                transition: "background 0.1s, border-color 0.1s",
                userSelect: "none",
            }}
            onMouseEnter={e => {
                if (!selected)
                    (e.currentTarget as HTMLDivElement).style.background = "var(--background-modifier-hover)";
            }}
            onMouseLeave={e => {
                if (!selected)
                    (e.currentTarget as HTMLDivElement).style.background = "var(--background-secondary)";
            }}
        >
            {/* Checkbox */}
            <div style={{
                width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                border: `2px solid ${selected ? "var(--brand-500)" : "var(--interactive-muted)"}`,
                background: selected ? "var(--brand-500)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.1s, border-color 0.1s",
            }}>
                {selected && <span style={{ fontSize: 10, color: "white", lineHeight: 1 }}>✓</span>}
            </div>

            {/* Result pill */}
            <div style={{
                display: "flex", alignItems: "center", gap: 4,
                padding: "2px 7px", borderRadius: 99,
                background: `color-mix(in srgb, ${RESULT_COLORS_RAW[entry.result]} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${RESULT_COLORS_RAW[entry.result]} 35%, transparent)`,
                flexShrink: 0,
            }}>
                <div style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: RESULT_COLORS_RAW[entry.result],
                    flexShrink: 0,
                }} />
                <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: RESULT_COLORS[entry.result],
                    textTransform: "capitalize",
                    letterSpacing: "0.03em",
                }}>
                    {entry.result}
                </span>
            </div>

            {/* Trigger */}
            <span style={{
                fontSize: 12, fontWeight: 600,
                color: "var(--control-secondary-text-default)",
                textTransform: "uppercase", letterSpacing: "0.04em",
                minWidth: 60, maxWidth: 90, flexShrink: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
                {entry.trigger}
            </span>

            {/* Meta */}
            <span style={{
                fontSize: 11, color: "var(--text-muted)", flex: 1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
                {[entry.authorName, entry.channelName && `#${entry.channelName}`, entry.guildName]
                    .filter(Boolean).join(" · ")}
            </span>

            {/* Date */}
            <span style={{
                fontSize: 11, color: "var(--text-muted)",
                flexShrink: 0, fontVariantNumeric: "tabular-nums",
                fontFamily: "var(--font-code)",
            }}>
                {formatDate(entry.t)}
            </span>

            {/* Jump */}
            {entry.messageJumpUrl && (
                <span
                    title="Jump to message"
                    onClick={e => { e.stopPropagation(); jumpToMessage(); }}
                    style={{
                        fontSize: 14, color: "var(--interactive-muted)",
                        cursor: "pointer", flexShrink: 0,
                        transition: "color 0.1s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.color = "var(--text-default)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.color = "var(--interactive-muted)"; }}
                >
                    ↗
                </span>
            )}
        </div>
    );
}

function EntriesView({ onBack }: { onBack: () => void; }) {
    const entries = useBiomeEntries();
    const [selected, setSelected] = React.useState<Set<number>>(new Set());
    const [search, setSearch] = React.useState("");
    const [resultFilter, setResultFilter] = React.useState<BiomeStatResult | "all">("all");

    const filtered = React.useMemo(() => {
        let result = entries;
        if (resultFilter !== "all") result = result.filter(e => e.result === resultFilter);
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(e =>
                e.trigger.toLowerCase().includes(q) ||
                e.authorName?.toLowerCase().includes(q) ||
                e.guildName?.toLowerCase().includes(q) ||
                e.channelName?.toLowerCase().includes(q)
            );
        }
        return result;
    }, [entries, resultFilter, search]);

    const toggleEntry = (id: number) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        setSelected(
            selected.size === filtered.length
                ? new Set()
                : new Set(filtered.map(e => e.id))
        );
    };

    const deleteSelected = () => {
        BiomeStatsStore.deleteMany(selected);
        setSelected(new Set());
    };

    const allSelected = filtered.length > 0 && selected.size === filtered.length;
    const hasSelection = selected.size > 0;

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>

            {/* Header */}
            <div style={{
                display: "flex", alignItems: "center", gap: 8,
                paddingBottom: 10, flexShrink: 0,
            }}>
                <button
                    onClick={onBack}
                    style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--text-muted)", padding: "2px 6px",
                        fontSize: 18, lineHeight: 1, borderRadius: 4,
                        display: "flex", alignItems: "center",
                        transition: "color 0.1s",
                    }}
                    title="Back to chart"
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-default)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
                >
                    ←
                </button>
                <span style={{
                    fontSize: 13, fontWeight: 600,
                    letterSpacing: "0.08em", textTransform: "uppercase",
                    color: "var(--text-muted)",
                }}>
                    Entries
                </span>
                <span style={{
                    fontSize: 11, color: "var(--text-muted)",
                    background: "var(--control-secondary-background-default)",
                    padding: "1px 7px", borderRadius: 99,
                    fontFamily: "var(--font-code)",
                }}>
                    {filtered.length}
                </span>
            </div>

            {/* Search */}
            <div style={{ paddingBottom: 8, flexShrink: 0 }}>
                <TextInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Search trigger, author, guild, channel..."
                />
            </div>

            {/* Result filter pills */}
            <div style={{
                display: "flex", gap: 2, paddingBottom: 10, flexShrink: 0,
                background: "var(--control-secondary-background-default)",
                borderRadius: 8, padding: 3,
                width: "fit-content",
            }}>
                {(["all", "real", "bait", "timeout"] as const).map(r => {
                    const active = resultFilter === r;
                    const textColor = r === "all" ? "var(--brand-360)" : RESULT_COLORS[r as BiomeStatResult];
                    return (
                        <button
                            key={r}
                            onClick={() => setResultFilter(r)}
                            style={{
                                padding: "4px 12px", borderRadius: 6, cursor: "pointer",
                                fontSize: 11, fontWeight: 600,
                                letterSpacing: "0.03em",
                                border: active
                                    ? `1px solid ${r === "all" ? "var(--brand-500)" : RESULT_COLORS[r as BiomeStatResult]}`
                                    : "1px solid transparent",
                                background: active
                                    ? `color-mix(in srgb, ${r === "all" ? "var(--brand-500)" : RESULT_COLORS[r as BiomeStatResult]} 18%, var(--background-secondary))`
                                    : "transparent",
                                color: active ? textColor : "var(--text-muted)",
                                transition: "all 0.15s",
                                textTransform: "capitalize",
                            }}
                        >
                            {r === "all" ? "All" : r}
                        </button>
                    );
                })}
            </div>

            <div style={{ height: 10, flexShrink: 0 }} />

            {/* List */}
            <div style={{
                flex: 1, overflowY: "auto",
                scrollbarColor: "var(--text-muted) transparent",
                scrollbarWidth: "thin",
                display: "flex", flexDirection: "column", gap: 4,
            }}>
                {filtered.length === 0 ? (
                    <div style={{ textAlign: "center", marginTop: 40 }}>
                        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                            {entries.length === 0 ? "No entries yet." : "No results match your filters."}
                        </span>
                    </div>
                ) : (
                    filtered.map(e => (
                        <EntryRow
                            key={e.id}
                            entry={e}
                            selected={selected.has(e.id)}
                            onToggle={() => toggleEntry(e.id)}
                        />
                    ))
                )}
            </div>

            {/* Footer toolbar */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                paddingTop: 10, flexShrink: 0,
                borderTop: "1px solid var(--control-secondary-background-default)",
                marginTop: 4, marginBottom: 12,
            }}>
                <button
                    onClick={toggleAll}
                    style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 12, color: "var(--text-muted)", padding: 0,
                        transition: "color 0.15s", letterSpacing: "0.03em",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-default)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
                >
                    {allSelected ? "Deselect all" : "Select all"}
                </button>

                <span style={{
                    fontSize: 11, color: "var(--text-muted)",
                    fontFamily: "var(--font-code)",
                    opacity: hasSelection ? 1 : 0,
                    transition: "opacity 0.15s",
                }}>
                    {selected.size} selected
                </span>

                <Button
                    size="small"
                    variant="dangerPrimary"
                    onClick={deleteSelected}
                    style={{
                        opacity: hasSelection ? 1 : 0,
                        pointerEvents: hasSelection ? "all" : "none",
                        transition: "opacity 0.15s",
                    }}
                >
                    Delete {selected.size > 0 ? selected.size : ""}
                </Button>
            </div>
        </div>
    );
}

// ─── StatsTab ─────────────────────────────────────────────────────────────────

export function StatsTab() {
    const [view, setView] = React.useState<View>("chart");

    if (view === "entries") return <EntriesView onBack={() => setView("chart")} />;
    return <ChartView onBrowse={() => setView("entries")} />;
}
