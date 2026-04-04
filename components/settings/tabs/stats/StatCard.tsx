/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./StatCard.css";

interface StatCardProps {
    value: string | number;
    title: string;
    color?: "green" | "red" | "yellow" | "default";
}

export function StatCard({ value, title, color = "default" }: StatCardProps) {
    return (
        <div className="vc-sora-statcard-base">
            <span className={`vc-sora-statcard-value vc-sora-statcard-value-${color}`}>
                {value}
            </span>
            <span className="vc-sora-statcard-title">{title}</span>
        </div>
    );
}
