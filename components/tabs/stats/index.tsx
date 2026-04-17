/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { React } from "@webpack/common";

import { SnipeEntry, SnipeStore, useSnipeHistory } from "../../../stores/SnipeStore";
import { StatCard } from "./StatCard";
import { StatTriggerDetail } from "./StatTriggerDetail";

// ─── Types ────────────────────────────────────────────────────────────────────

type Period = "7d" | "30d" | "all";
type BiomeResult = "real" | "bait" | "timeout";

interface BiomeAggregate {
    trigger: string;
    real: number;
    bait: number;
    timeout: number;
    total: number;
    avgDurationMs: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BIOME_RESULT_TAGS: Record<BiomeResult, string> = {
    real: "biome-verified-real",
    bait: "biome-verified-bait",
    timeout: "biome-verified-timeout",
} as const;

function getBiomeResult(entry: SnipeEntry): BiomeResult | null {
    if (entry.tags.includes("biome-verified-real" as any)) return "real";
    if (entry.tags.includes("biome-verified-bait" as any)) return "bait";
    if (entry.tags.includes("biome-verified-timeout" as any)) return "timeout";
    return null;
}

function filterByPeriod(entries: SnipeEntry[], since?: number): SnipeEntry[] {
    return since ? entries.filter(e => e.timestamp >= since) : entries;
}

function aggregate(entries: SnipeEntry[]): BiomeAggregate[] {
    const map = new Map<string, { real: number; bait: number; timeout: number; durations: number[]; }>();

    for (const entry of entries) {
        const result = getBiomeResult(entry);
        if (!result) continue;

        if (!map.has(entry.triggerName)) {
            map.set(entry.triggerName, { real: 0, bait: 0, timeout: 0, durations: [] });
        }

        const agg = map.get(entry.triggerName)!;
        agg[result]++;
        if (result === "real" && entry.biomeDurationMs != null) {
            agg.durations.push(entry.biomeDurationMs);
        }
    }

    return Array.from(map.entries())
        .map(([trigger, data]) => ({
            trigger,
            real: data.real,
            bait: data.bait,
            timeout: data.timeout,
            total: data.real + data.bait + data.timeout,
            avgDurationMs: data.durations.length > 0
                ? Math.round(data.durations.reduce((a, b) => a + b, 0) / data.durations.length)
                : null,
        }))
        .sort((a, b) => b.total - a.total);
}

function periodToSince(period: Period): number | undefined {
    if (period === "all") return undefined;
    return Date.now() - (period === "7d" ? 7 : 30) * 24 * 60 * 60 * 1000;
}

// ─── Period Selector ─────────────────────────────────────────────────────────

function PeriodSelector({ period, onChange }: { period: Period; onChange: (p: Period) => void; }) {
    const options: { label: string; value: Period; }[] = [
        { label: "7d", value: "7d" },
        { label: "30d", value: "30d" },
        { label: "All", value: "all" },
    ];

    return (
        <div style={{
            display: "flex",
            background: "var(--background-secondary)",
            borderRadius: 8,
            padding: 4,
            gap: 4,
        }}>
            {options.map(opt => (
                <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    style={{
                        padding: "6px 14px",
                        borderRadius: 6,
                        fontSize: 13,
                        fontWeight: 600,
                        background: period === opt.value ? "var(--brand-500)" : "transparent",
                        color: period === opt.value ? "var(--white-500)" : "var(--text-muted)",
                        border: "none",
                        cursor: "pointer",
                    }}
                >
                    {opt.label}
                </button>
            ))}
        </div>
    );
}

// ─── Main StatsTab ────────────────────────────────────────────────────────────

export function StatsTab() {
    const [period, setPeriod] = React.useState<Period>("7d");
    const allEntries = useSnipeHistory();

    const entries = React.useMemo(
        () => filterByPeriod(allEntries, periodToSince(period)),
        [allEntries, period]
    );

    const aggregates = React.useMemo(() => aggregate(entries), [entries]);

    const totalReal = aggregates.reduce((sum, a) => sum + a.real, 0);
    const totalBait = aggregates.reduce((sum, a) => sum + a.bait, 0);
    const totalTimeout = aggregates.reduce((sum, a) => sum + a.timeout, 0);
    const total = totalReal + totalBait + totalTimeout;

    const realPct = total > 0 ? Math.round((totalReal / total) * 100) : 0;
    const baitPct = total > 0 ? Math.round((totalBait / total) * 100) : 0;
    const timeoutPct = total > 0 ? Math.round((totalTimeout / total) * 100) : 0;

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 20 }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-default)" }}>
                        Biome Detection
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                        Performance overview
                    </div>
                </div>
                <PeriodSelector period={period} onChange={setPeriod} />
            </div>

            {total === 0 ? (
                <div style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--text-muted)",
                    fontSize: 15
                }}>
                    No data available for the selected period.
                </div>
            ) : (
                <>
                    {/* Overall Stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 4 }}>
                        <StatCard value={`${realPct}%`} title="Real" color="green" />
                        <StatCard value={`${baitPct}%`} title="Bait" color="red" />
                        <StatCard value={`${timeoutPct}%`} title="Timeout" color="yellow" />
                        <StatCard value={total} title="Total Snipes" />
                    </div>

                    {/* Triggers List */}
                    <Divider />
                    <div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-default)" }}>
                                    Trigger Stats
                                </div>
                                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                                    Per-trigger overview
                                </div>
                            </div>
                            {aggregates.map(agg => (
                                <StatTriggerDetail
                                    key={agg.trigger}
                                    trigger={agg.trigger}
                                    total={agg.total}
                                    real={agg.real}
                                    bait={agg.bait}
                                    timeout={agg.timeout}
                                    avgDurationMs={agg.avgDurationMs}
                                // compactBar
                                />
                            ))}
                        </div>
                    </div>

                </>
            )}

            {/* Footer */}
            {total > 0 && (
                <div style={{
                    marginTop: "auto",
                    paddingBottom: 12,
                    borderTop: "1px solid var(--background-modifier-border)",
                    display: "flex",
                    justifyContent: "flex-end"
                }}>
                    <Button size="small" variant="dangerPrimary" onClick={() => SnipeStore.clear()}>
                        Clear History
                    </Button>
                </div>
            )}
        </div>
    );
}
