/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Pill, PillVariant } from "../Pill";

export function QuickFilterBtn({
    label,
    variant,
    active,
    onClick,
}: {
    label: string;
    variant: PillVariant;
    active: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            style={{
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
            }}
        >
            <Pill
                variant={active ? variant : "muted"}
                size="small"
                border={active ? "subtle" : "none"}
            >
                {label}
            </Pill>
        </button>
    );
}
