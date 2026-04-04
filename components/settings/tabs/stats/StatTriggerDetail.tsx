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

                <div className="vc-sora-triggerdetails-cell">
                    <div className="vc-sora-triggerdetails-cell-top">
                        <span className="vc-sora-triggerdetails-cell-val vc-sora-triggerdetails-cell-val">{total}</span>
                    </div>
                    <span className="vc-sora-triggerdetails-cell-lbl">Total</span>
                </div>

                <div className="vc-sora-triggerdetails-cell">
                    <div className="vc-sora-triggerdetails-cell-top">
                        <span className="vc-sora-triggerdetails-cell-val vc-sora-triggerdetails-cell-val--green">{real}</span>
                        <span className="vc-sora-triggerdetails-cell-pct">({realPct}%)</span>
                    </div>
                    <span className="vc-sora-triggerdetails-cell-lbl">Real</span>
                </div>

                <div className="vc-sora-triggerdetails-cell">
                    <div className="vc-sora-triggerdetails-cell-top">
                        <span className="vc-sora-triggerdetails-cell-val vc-sora-triggerdetails-cell-val--red">{bait}</span>
                        <span className="vc-sora-triggerdetails-cell-pct">({baitPct}%)</span>
                    </div>
                    <span className="vc-sora-triggerdetails-cell-lbl">Baits</span>
                </div>

                <div className="vc-sora-triggerdetails-cell">
                    <div className="vc-sora-triggerdetails-cell-top">
                        <span className="vc-sora-triggerdetails-cell-val vc-sora-triggerdetails-cell-val--yellow">{timeout}</span>
                        <span className="vc-sora-triggerdetails-cell-pct">({timeoutPct}%)</span>
                    </div>
                    <span className="vc-sora-triggerdetails-cell-lbl">Timeouts</span>
                </div>

                <Tooltip text="How long does this biome last for, on average">
                    {({ onMouseEnter, onMouseLeave }) => (
                        <div
                            className="vc-sora-triggerdetails-cell"
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                        >
                            <div className="vc-sora-triggerdetails-cell-top">
                                <span className="vc-sora-triggerdetails-cell-val">{avgLabel}</span>
                            </div>
                            <span className="vc-sora-triggerdetails-cell-lbl">Duration (avg.)</span>
                        </div>
                    )}
                </Tooltip>
            </div>
        </div>
    );
}
