/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { localStorage } from "@utils/localStorage";
import { React } from "@webpack/common";

// ─── Constantes ───────────────────────────────────────────────────────────────

const STORAGE_KEY = "solsRadar_biomeStats";
const MAX_ENTRIES = 1000;

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type BiomeStatResult = "real" | "bait" | "timeout";

export interface BiomeStatEntry {
    id: number;
    t: number;
    trigger: string;
    result: BiomeStatResult;
    durationMs?: number;
    authorId?: string;
    authorName?: string;
    guildName?: string;
    channelName?: string;
    messageJumpUrl?: string;
}

export interface BiomeStatAggregate {
    trigger: string;
    real: number;
    bait: number;
    timeout: number;
    total: number;
    avgDurationMs: number | null;
}

type Listener = (entries: BiomeStatEntry[]) => void;

// ─── Store ────────────────────────────────────────────────────────────────────

class BiomeStatsHistoryStore {
    private _entries: BiomeStatEntry[] = [];
    private _listeners = new Set<Listener>();

    constructor() {
        this._load();
    }

    // ── Mutação ───────────────────────────────────────────────────────────────

    add(entry: Omit<BiomeStatEntry, "id">): void {
        this._entries.unshift({ ...entry, id: Date.now() });
        if (this._entries.length > MAX_ENTRIES) this._entries.length = MAX_ENTRIES;
        this._commit();
    }

    deleteMany(ids: Set<number>): void {
        this._entries = this._entries.filter(e => !ids.has(e.id));
        this._commit();
    }

    clear(): void {
        this._entries = [];
        this._commit();
    }

    // ── Leitura ───────────────────────────────────────────────────────────────

    get all(): BiomeStatEntry[] {
        return [...this._entries];
    }

    aggregate(since?: number): BiomeStatAggregate[] {
        const entries = since
            ? this._entries.filter(e => e.t >= since)
            : this._entries;

        const map = new Map<string, { real: number; bait: number; timeout: number; durations: number[]; }>();

        for (const e of entries) {
            if (!map.has(e.trigger)) {
                map.set(e.trigger, { real: 0, bait: 0, timeout: 0, durations: [] });
            }
            const agg = map.get(e.trigger)!;
            agg[e.result]++;
            if (e.result === "real" && e.durationMs != null) {
                agg.durations.push(e.durationMs);
            }
        }

        return Array.from(map.entries()).map(([trigger, { real, bait, timeout, durations }]) => ({
            trigger,
            real,
            bait,
            timeout,
            total: real + bait + timeout,
            avgDurationMs: durations.length > 0
                ? durations.reduce((a, b) => a + b, 0) / durations.length
                : null,
        })).sort((a, b) => b.total - a.total);
    }

    // ── Observers ─────────────────────────────────────────────────────────────

    subscribe(listener: Listener): () => void {
        this._listeners.add(listener);
        return () => this._listeners.delete(listener);
    }

    private _notify(): void {
        const snapshot = this.all;
        this._listeners.forEach(fn => {
            try { fn(snapshot); } catch (e) { console.error("[BiomeStatsStore] Listener error:", e); }
        });
    }

    // ── Persistência ──────────────────────────────────────────────────────────

    private _commit(): void {
        this._notify();
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._entries));
        } catch (e) {
            console.error("[BiomeStatsStore] Failed to persist:", e);
        }
    }

    private _load(): void {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            this._entries = raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error("[BiomeStatsStore] Failed to load:", e);
            this._entries = [];
        }
    }
}

export const BiomeStatsStore = new BiomeStatsHistoryStore();

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useBiomeStats(since?: number): BiomeStatAggregate[] {
    const [agg, setAgg] = React.useState<BiomeStatAggregate[]>(() => BiomeStatsStore.aggregate(since));

    React.useEffect(() => {
        return BiomeStatsStore.subscribe(() => {
            setAgg(BiomeStatsStore.aggregate(since));
        });
    }, [since]);

    return agg;
}

export function useBiomeEntries(): BiomeStatEntry[] {
    const [entries, setEntries] = React.useState<BiomeStatEntry[]>(BiomeStatsStore.all);
    React.useEffect(() => BiomeStatsStore.subscribe(setEntries), []);
    return entries;
}
