/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
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

const RESULT_EMOJI: Record<BiomeStatResult, string> = {
    real: "✅",
    bait: "❌",
    timeout: "⏳",
};

// ─── ChartView ────────────────────────────────────────────────────────────────

function Legend() {
    return (
        <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            {(["real", "bait", "timeout"] as const).map(result => (
                <div key={result} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: RESULT_COLORS[result] }} />
                    <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize" }}>{result}</span>
                </div>
            ))}
        </div>
    );
}

function BiomeBar({ agg }: { agg: BiomeStatAggregate }) {
     const pct = (n: number) => agg.total === 0 ? 0 : (n / agg.total) * 100;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--control-secondary-text-default)" }}>
                    {agg.trigger}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {agg.total} total
                    {agg.avgDurationMs != null && ` · avg ${(agg.avgDurationMs / 1000).toFixed(1)}s`}
                </span>
            </div>

            <div style={{
                display: "flex", height: 14, borderRadius: 4,
                overflow: "hidden", background: "var(--background-mod-normal)", width: "100%",
            }}>
                {(["real", "bait", "timeout"] as const).map(result => {
                    const width = pct(agg[result]);
                    if (width === 0) return null;
                    return (
                        <div
                            key={result}
                            title={`${result}: ${agg[result]}`}
                            style={{
                                width: `${width}%`,
                                background: RESULT_COLORS[result],
                                transition: "width 0.3s ease",
                            }}
                        />
                    );
                })}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
                {(["real", "bait", "timeout"] as const).map(result => (
                    <span key={result} style={{ fontSize: 11, color: RESULT_COLORS[result], fontVariantNumeric: "tabular-nums" }}>
                        {RESULT_EMOJI[result]} {agg[result]}
                    </span>
                ))}
            </div>
        </div>
    );
}

function ChartView({ style, onBrowse }: { style?: React.CSSProperties; onBrowse: () => void; }) {
    const [period, setPeriod] = React.useState<Period>("7d");
    const since = periodToSince(period);
    const stats = useBiomeStats(since);

    // const max = stats.reduce((m, s) => Math.max(m, s.total), 0);
    const totalReal = stats.reduce((s, e) => s + e.real, 0);
    const totalBait = stats.reduce((s, e) => s + e.bait, 0);
    const totalTimeout = stats.reduce((s, e) => s + e.timeout, 0);
    const totalAll = totalReal + totalBait + totalTimeout;

    return (
        <div style={{ ...style, display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>

            {/* Header row: título + period filter */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                paddingBottom: 12, flexShrink: 0,
            }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--control-secondary-text-default)" }}>
                    Biome Detection
                </span>
                <div style={{ display: "flex", gap: 3 }}>
                    {PERIOD_OPTIONS.map(o => (
                        <button
                            key={o.value}
                            onClick={() => setPeriod(o.value)}
                            style={{
                                padding: "3px 10px", borderRadius: 99, cursor: "pointer",
                                fontSize: 11, fontWeight: 600,
                                border: `1px solid ${period === o.value ? "var(--brand-500)" : "var(--background-mod-normal)"}`,
                                background: period === o.value
                                    ? "color-mix(in srgb, var(--brand-500) 18%, transparent)"
                                    : "transparent",
                                color: period === o.value ? "var(--brand-500)" : "var(--text-muted)",
                                transition: "all 0.1s",
                            }}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            </div>

            <Divider />

            {/* Summary row */}
            {totalAll > 0 && (
                <div style={{
                    display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 6, padding: "12px 0",
                }}>
                    {([
                        { label: "Real", value: totalReal, color: RESULT_COLORS.real },
                        { label: "Bait", value: totalBait, color: RESULT_COLORS.bait },
                        { label: "Timeout", value: totalTimeout, color: RESULT_COLORS.timeout },
                        { label: "Total", value: totalAll, color: "var(--control-secondary-text-default)" },
                    ]).map(({ label, value, color }) => (
                        <div key={label} style={{
                            display: "flex", flexDirection: "column", alignItems: "center",
                            padding: "8px 0", borderRadius: 8,
                            background: "var(--background-secondary)",
                            border: "1px solid var(--background-mod-normal)",
                        }}>
                            <span style={{ fontSize: 20, fontWeight: 700, color, lineHeight: 1 }}>{value}</span>
                            <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{label}</span>
                        </div>
                    ))}
                </div>
            )}

            <Divider />

            {/* Chart */}
            <div style={{
                flex: 1, overflowY: "auto", paddingTop: 12,
                scrollbarColor: "var(--text-muted) transparent",
                scrollbarWidth: "thin",
            }}>
                {stats.length === 0
                    ? (
                        <div style={{ textAlign: "center", marginTop: 40 }}>
                            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>No data for this period.</span>
                        </div>
                    )
                    : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                            <Legend />
                            {stats.map(agg => (
                                <BiomeBar key={agg.trigger} agg={agg} />
                            ))}
                        </div>
                    )
                }
            </div>

            {/* Footer */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                paddingTop: 10, flexShrink: 0,
                borderTop: "1px solid var(--background-mod-normal)",
                marginTop: 4,
                marginBottom: 12,
            }}>
                <button
                    onClick={onBrowse}
                    style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 12, color: "var(--text-muted)", padding: 0,
                    }}
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
                border: `1px solid ${selected ? "var(--brand-500)" : "var(--background-mod-normal)"}`,
                transition: "background 0.1s, border-color 0.1s",
                userSelect: "none",
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
                background: `color-mix(in srgb, ${RESULT_COLORS[entry.result]} 15%, transparent)`,
                border: `1px solid color-mix(in srgb, ${RESULT_COLORS[entry.result]} 40%, transparent)`,
                flexShrink: 0,
            }}>
                <span style={{ fontSize: 10 }}>{RESULT_EMOJI[entry.result]}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: RESULT_COLORS[entry.result], textTransform: "capitalize" }}>
                    {entry.result}
                </span>
            </div>

            {/* Trigger */}
            <span style={{
                fontSize: 12, fontWeight: 600,
                color: "var(--control-secondary-text-default)",
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
            <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
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
                    onMouseEnter={e => (e.currentTarget.style.color = "var(--interactive-active)")}
                    onMouseLeave={e => (e.currentTarget.style.color = "var(--interactive-muted)")}
                >
                    ↗
                </span>
            )}
        </div>
    );
}

function EntriesView({ style, onBack }: { style?: React.CSSProperties; onBack: () => void; }) {
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
        <div style={{ ...style, display: "flex", flexDirection: "column", height: "100%", gap: 0 }}>

            {/* Header */}
            <div style={{
                display: "flex", alignItems: "center", gap: 8,
                paddingBottom: 10, flexShrink: 0,
            }}>
                <button
                    onClick={onBack}
                    style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--text-muted)", padding: "2px 4px",
                        fontSize: 18, lineHeight: 1, borderRadius: 4,
                        display: "flex", alignItems: "center",
                    }}
                    title="Back to chart"
                >
                    ←
                </button>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--control-secondary-text-default)" }}>
                    Entries
                </span>
                <span style={{
                    fontSize: 11, color: "var(--text-muted)",
                    background: "var(--background-mod-normal)",
                    padding: "1px 7px", borderRadius: 99,
                }}>
                    {filtered.length}
                </span>
            </div>

            {/* Search */}
            <div style={{ paddingBottom: 6, flexShrink: 0 }}>
                <TextInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Search trigger, author, guild, channel..."
                />
            </div>

            {/* Result filter pills */}
            <div style={{ display: "flex", gap: 4, paddingBottom: 10, flexShrink: 0 }}>
                {(["all", "real", "bait", "timeout"] as const).map(r => {
                    const active = resultFilter === r;
                    const color = r === "all" ? "var(--brand-500)" : RESULT_COLORS[r as BiomeStatResult];
                    return (
                        <button
                            key={r}
                            onClick={() => setResultFilter(r)}
                            style={{
                                padding: "3px 10px", borderRadius: 99, cursor: "pointer",
                                fontSize: 11, fontWeight: 600,
                                border: `1px solid ${active ? color : "var(--background-mod-normal)"}`,
                                background: active
                                    ? `color-mix(in srgb, ${color} 18%, transparent)`
                                    : "transparent",
                                color: active ? color : "var(--text-muted)",
                                transition: "all 0.1s",
                                textTransform: "capitalize",
                            }}
                        >
                            {r === "all" ? "All" : `${RESULT_EMOJI[r as BiomeStatResult]} ${r}`}
                        </button>
                    );
                })}
            </div>

            <Divider />

            {/* List */}
            <div style={{
                flex: 1, overflowY: "auto", paddingTop: 8,
                scrollbarColor: "var(--text-muted) transparent",
                scrollbarWidth: "thin",
                display: "flex", flexDirection: "column", gap: 4,
            }}>
                {filtered.length === 0
                    ? (
                        <div style={{ textAlign: "center", marginTop: 40 }}>
                            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
                                {entries.length === 0 ? "No entries yet." : "No results match your filters."}
                            </span>
                        </div>
                    )
                    : filtered.map(e => (
                        <EntryRow
                            key={e.id}
                            entry={e}
                            selected={selected.has(e.id)}
                            onToggle={() => toggleEntry(e.id)}
                        />
                    ))
                }
            </div>

            {/* Footer toolbar */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                paddingTop: 10, flexShrink: 0,
                borderTop: "1px solid var(--background-mod-normal)",
                marginTop: 4,
                marginBottom: 12,
            }}>
                <button
                    onClick={toggleAll}
                    style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: 12, color: "var(--text-muted)", padding: 0,
                    }}
                >
                    {allSelected ? "Deselect all" : "Select all"}
                </button>

                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {hasSelection ? `${selected.size} selected` : ""}
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
