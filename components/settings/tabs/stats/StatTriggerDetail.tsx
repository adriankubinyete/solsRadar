/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./StatTriggerDetail.css";

import { Tooltip } from "@webpack/common";

interface StatTriggerDetailProps {
    trigger: string;
    total: number;
    real: number;
    bait: number;
    timeout: number;
    avgDurationMs?: number | null;
    compactBar?: boolean;
}

interface StatCellProps {
    value: React.ReactNode;
    label: string;
    hint?: string;
    color?: "green" | "red" | "yellow";
    tooltip?: string;
    onMouseEnter?: React.MouseEventHandler<HTMLDivElement>;
    onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;
}

function StatCell({ value, label, hint, color, onMouseEnter, onMouseLeave }: StatCellProps) {
    return (
        <div
            className="vc-sora-triggerdetails-cell"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <div className="vc-sora-triggerdetails-cell-top">
                <span className={`vc-sora-triggerdetails-cell-val${color ? ` vc-sora-triggerdetails-cell-val--${color}` : ""}`}>
                    {value}
                </span>
                {hint && <span className="vc-sora-triggerdetails-cell-pct">({hint})</span>}
            </div>
            <span className="vc-sora-triggerdetails-cell-lbl">{label}</span>
        </div>
    );
}

export function StatTriggerDetail({
    trigger,
    total,
    real,
    bait,
    timeout,
    avgDurationMs,
    compactBar = false,
}: StatTriggerDetailProps) {
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

    const realPct = pct(real);
    const baitPct = pct(bait);
    const timeoutPct = pct(timeout);

    const avgLabel = avgDurationMs != null
        ? `${(avgDurationMs / 1000).toFixed(1)}s`
        : "—";

    return (
        <div className="vc-sora-triggerdetails-base">
            <div className="vc-sora-triggerdetails-head">
                <span className="vc-sora-triggerdetails-name">{trigger}</span>
                {/* <span className="vc-sora-triggerdetails-meta">({total} snipes)</span> */}
            </div>

            {!compactBar && (
                <div className="vc-sora-triggerdetails-seg">
                    <div className="vc-sora-triggerdetails-seg-real" style={{ width: `${realPct}%` }} />
                    <div className="vc-sora-triggerdetails-seg-bait" style={{ width: `${baitPct}%` }} />
                    <div className="vc-sora-triggerdetails-seg-timeout" style={{ flex: 1 }} />
                </div>
            )}

            <div className="vc-sora-triggerdetails-grid">
                <StatCell value={total} label="Total" />
                <StatCell value={real} label="Real" hint={`${realPct}%`} color="green" />
                <StatCell value={bait} label="Bait" hint={`${baitPct}%`} color="red" />
                <StatCell value={timeout} label="Timeout" hint={`${timeoutPct}%`} color="yellow" />

                <Tooltip text={"Average duration of real biomes"}>
                    {({ onMouseEnter, onMouseLeave }) => (
                        <StatCell value={avgLabel} label="Duration (avg)" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
                    )}
                </Tooltip>

            </div>
        </div>
    );
}
