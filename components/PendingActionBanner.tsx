/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { React, useEffect, useReducer, useState } from "@webpack/common";

import { PendingActionState, PendingActionStore } from "../services/ActionExecutor";

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePendingAction(): PendingActionState | null {
    const [state, setState] = useState<PendingActionState | null>(() => PendingActionStore.current);
    useEffect(() => PendingActionStore.subscribe(setState), []);
    return state;
}

// ─── Banner ───────────────────────────────────────────────────────────────────

export type PendingActionBannerVariant = "minimal" | "full";

export interface PendingActionBannerProps {
    variant?: PendingActionBannerVariant;
    style?: React.CSSProperties;
    className?: string;
}

export function PendingActionBanner({
    variant = "full",
    style,
    className,
}: PendingActionBannerProps) {
    const pending = usePendingAction();
    const [, tick] = useReducer(x => x + 1, 0);

    useEffect(() => {
        if (!pending) return;
        const id = setInterval(tick, 500);
        return () => clearInterval(id);
    }, [pending]);

    if (!pending) return null;

    const secsRemaining = Math.ceil(PendingActionStore.msRemaining() / 1000);
    const isMinimal = variant === "minimal";

    return (
        <div
            onClick={isMinimal ? () => PendingActionStore.cancel() : undefined}
            className={className}
            title={isMinimal ? "Click to cancel" : undefined}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: isMinimal ? "6px 10px" : "8px 12px",
                borderRadius: 8,
                width: "100%",
                boxSizing: "border-box",
                border: "1px solid color-mix(in srgb, var(--red-400) 40%, transparent)",
                background: "color-mix(in srgb, var(--red-400) 8%, var(--background-secondary))",
                flexShrink: 0,
                cursor: isMinimal ? "pointer" : "default",
                transition: isMinimal ? "filter 0.1s" : undefined,
                userSelect: "none",
                ...style,
            }}
            onMouseEnter={isMinimal ? e => (e.currentTarget.style.filter = "brightness(1.08)") : undefined}
            onMouseLeave={isMinimal ? e => (e.currentTarget.style.filter = "") : undefined}
        >
            <span style={{ fontSize: isMinimal ? 13 : 16, flexShrink: 0 }}>⏳</span>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-default)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}>
                    Pending action!
                    <span style={{ paddingLeft: 4, opacity: 0.5 }}>
                        {isMinimal
                            ? <>{pending.label} in {secsRemaining}s · click to cancel</>
                            : <>executes in {secsRemaining}s</>
                        }
                    </span>
                </div>

                {!isMinimal && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                        {pending.context} · {pending.label}
                    </div>
                )}
            </div>

            {!isMinimal && (
                <Button
                    variant="dangerPrimary"
                    size="small"
                    onClick={() => PendingActionStore.cancel()}
                    style={{ flexShrink: 0 }}
                >
                    Cancel now
                </Button>
            )}
        </div>
    );
}
