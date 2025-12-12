/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { localStorage } from "@utils/localStorage";

const LOCAL_STORAGE_KEY = "solsRadarJoinStore";
const MAX_JOINS = 50;
const AUTO_SAVE_INTERVAL = 600 * 1000;

// ==================== TYPES ====================

/*
biome-real (Real Snipe)
biome-bait (Biome Bait)
biome-timeout (Biome Unknown) (could not determine biome within timeout)
biome-not-verified (Biome verification is disabled)
link-safe (Verified)
link-unsafe (Not Sol's RNG)
link-not-verified (Not verified, link verification is disabled)
unknown
failed
*/

export type JoinTag =
    // | "biome-real" // ✅ Servidor real
    // | "verified" // ✅ Verificado como Sol's RNG
    // | "fake" // ❌ Servidor falso
    // | "biome-bait" // 🎣 Biome bait detectado
    // | "scam" // ⚠️ Possível scam
    // | "safe" // ✅ Seguro (genérico)
    // | "unsafe" // ⚠️ Não seguro
    // | "unknown" // ❓ Ainda verificando
    // | "failed" // ❌ Falha ao entrar
    // | "not-verified"; // ⏳ Não verificado ainda
    | "biome-verified-real"
    | "biome-verified-bait"
    | "biome-verified-timeout"
    | "biome-not-verified"
    | "link-verified-safe"
    | "link-verified-unsafe"
    | "link-not-verified"
    | "unknown"
    | "failed"
    | "test";

export type JoinTagConfig = {
    label: string;
    color: string;
    emoji: string;
    priority: number; // Para ordenar tags (maior = mais importante)
};

export const TAG_CONFIGS: Record<JoinTag, JoinTagConfig> = {

    "biome-verified-real": {
        label: "Real",
        color: "#3ba55c",
        emoji: "✅",
        priority: 60
    },
    "biome-verified-bait": {
        label: "Bait",
        color: "#f26522",
        emoji: "🎣",
        priority: 60
    },
    "biome-verified-timeout": {
        label: "Biome check timeout",
        color: "#faa61a",
        emoji: "⚠️",
        priority: 49
    },
    "biome-not-verified": {
        label: "Biome check disabled",
        color: "#faa61a",
        emoji: "⚠️",
        priority: 49
    },

    "link-verified-safe": {
        label: "Sol's RNG",
        color: "#3ba55c",
        emoji: "✅",
        priority: 50
    },
    "link-verified-unsafe": {
        label: "Not Sol's RNG",
        color: "#ed4245",
        emoji: "❌",
        priority: 50
    },
    "link-not-verified": {
        label: "Unverified link",
        color: "#faa61a",
        emoji: "⚠️",
        priority: 50
    },
    "failed": {
        label: "Failed to join",
        color: "#ed4245",
        emoji: "❌",
        priority: 50
    },
    "unknown": {
        label: "Unknown",
        color: "#99aab5",
        emoji: "❓",
        priority: 50
    },
    "test": {
        label: "Test",
        color: "#d01be0ff",
        emoji: "🔵",
        priority: 50
    }
};

export interface RecentJoin {
    id: number;
    timestamp: number;

    // Server Info (pode ser atualizado progressivamente)
    title: string;
    description?: string;
    iconUrl?: string;
    serverId?: string;

    // Author Info
    authorName?: string;
    authorAvatarUrl?: string;
    authorId?: string;

    // Navigation
    messageJumpUrl?: string;
    inviteCode?: string;

    // Status tracking (progressivo)
    tags: JoinTag[];
    metadata?: Record<string, any>; // Para dados customizados

    // Legacy (para compatibilidade)
    joinStatus?: {
        joined: boolean;
        verified: boolean;
        safe: boolean | undefined;
    };
}

type Listener = (joins: RecentJoin[]) => void;

// ==================== STORE ====================

class RecentJoinStore {
    private _recentJoins: RecentJoin[] = [];
    private _listeners: Set<Listener> = new Set();
    private _autoSave: boolean = true;

    constructor() {
        this.load();
    }

    // ==================== GETTERS ====================

    get all(): RecentJoin[] {
        return [...this._recentJoins];
    }

    get count(): number {
        return this._recentJoins.length;
    }

    getById(id: number): RecentJoin | undefined {
        return this._recentJoins.find(j => j.id === id);
    }

    getByServerId(serverId: string): RecentJoin | undefined {
        return this._recentJoins.find(j => j.serverId === serverId);
    }

    getByTag(tag: JoinTag): RecentJoin[] {
        return this._recentJoins.filter(j => j.tags.includes(tag));
    }

    getRecent(limit: number = 10): RecentJoin[] {
        return this._recentJoins.slice(0, limit);
    }

    // ==================== CORE OPERATIONS ====================

    /**
     * Adiciona um novo join. Retorna o ID para referência futura.
     * Use update() para adicionar mais informações progressivamente.
     */
    add(data: {
        title: string;
        description?: string;
        iconUrl?: string;
        serverId?: string;
        authorName?: string;
        authorAvatarUrl?: string;
        authorId?: string;
        messageJumpUrl?: string;
        inviteCode?: string;
        tags?: JoinTag[];
        metadata?: Record<string, any>;
    }): number {
        const now = Date.now();
        const entry: RecentJoin = {
            id: now,
            timestamp: now,
            tags: data.tags || [],
            ...data,
        };

        this._recentJoins.unshift(entry);

        // Limita tamanho
        if (this._recentJoins.length > MAX_JOINS) {
            this._recentJoins = this._recentJoins.slice(0, MAX_JOINS);
        }

        this._notify();
        this._autoSaveIfEnabled();

        return entry.id;
    }

    /**
     * Atualiza um join existente. Retorna true se encontrado.
     * Tags são MESCLADAS por padrão (use replaceTags para substituir).
     */
    update(
        id: number,
        data: Partial<Omit<RecentJoin, "id" | "timestamp">>,
        options: { replaceTags?: boolean; } = {}
    ): boolean {
        const idx = this._recentJoins.findIndex(j => j.id === id);
        if (idx === -1) return false;

        const current = this._recentJoins[idx];

        // Mescla tags por padrão
        let newTags = current.tags;
        if (data.tags) {
            if (options.replaceTags) {
                newTags = data.tags;
            } else {
                // Remove duplicadas e mantém ordem de prioridade
                newTags = [...new Set([...current.tags, ...data.tags])];
            }
        }

        this._recentJoins[idx] = {
            ...current,
            ...data,
            tags: newTags,
            metadata: data.metadata
                ? { ...current.metadata, ...data.metadata }
                : current.metadata,
        };

        this._notify();
        this._autoSaveIfEnabled();
        return true;
    }

    /**
     * API fluente para atualizar por serverId (mais conveniente que ID)
     */
    updateByServerId(
        serverId: string,
        data: Partial<Omit<RecentJoin, "id" | "timestamp" | "serverId">>,
        options?: { replaceTags?: boolean; }
    ): boolean {
        const join = this.getByServerId(serverId);
        if (!join) return false;
        return this.update(join.id, data, options);
    }

    /**
     * Remove um join
     */
    delete(id: number): boolean {
        const before = this._recentJoins.length;
        this._recentJoins = this._recentJoins.filter(j => j.id !== id);

        if (this._recentJoins.length !== before) {
            this._notify();
            this._autoSaveIfEnabled();
            return true;
        }
        return false;
    }

    /**
     * Limpa todos os joins
     */
    clear(): void {
        this._recentJoins = [];
        this._notify();
        this._autoSaveIfEnabled();
    }

    // ==================== TAG MANAGEMENT ====================

    /**
     * Adiciona tags a um join (sem duplicar)
     */
    addTags(id: number, ...tags: JoinTag[]): boolean {
        const join = this.getById(id);
        if (!join) return false;

        const newTags = [...new Set([...join.tags, ...tags])];
        return this.update(id, { tags: newTags });
    }

    /**
     * Remove tags de um join
     */
    removeTags(id: number, ...tags: JoinTag[]): boolean {
        const join = this.getById(id);
        if (!join) return false;

        const newTags = join.tags.filter(t => !tags.includes(t));
        return this.update(id, { tags: newTags }, { replaceTags: true });
    }

    /**
     * Substitui todas as tags
     */
    setTags(id: number, ...tags: JoinTag[]): boolean {
        return this.update(id, { tags }, { replaceTags: true });
    }

    /**
     * Retorna a tag de maior prioridade para UI
     */
    getPrimaryTag(join: RecentJoin): JoinTag {
        if (join.tags.length === 0) return "unknown";

        return join.tags.reduce((highest, current) => {
            const currentPriority = TAG_CONFIGS[current]?.priority || 0;
            const highestPriority = TAG_CONFIGS[highest]?.priority || 0;
            return currentPriority > highestPriority ? current : highest;
        });
    }

    // ==================== OBSERVER PATTERN ====================

    /**
     * Inscreve um listener para mudanças
     */
    subscribe(listener: Listener): () => void {
        this._listeners.add(listener);

        // Retorna função de unsubscribe
        return () => {
            this._listeners.delete(listener);
        };
    }

    private _notify(): void {
        const joins = this.all;
        this._listeners.forEach(listener => {
            try {
                listener(joins);
            } catch (err) {
                console.error("[RecentJoinStore] Listener error:", err);
            }
        });
    }

    // ==================== PERSISTENCE ====================

    save(): void {
        try {
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(this._recentJoins));
            console.log(`[RecentJoinStore] Saved ${this._recentJoins.length} joins.`);
        } catch (err) {
            console.error("[RecentJoinStore] Failed to save:", err);
        }
    }

    load(): void {
        try {
            const data = localStorage.getItem(LOCAL_STORAGE_KEY);
            this._recentJoins = data ? JSON.parse(data) : [];
            console.log(`[RecentJoinStore] Loaded ${this._recentJoins.length} joins.`);
        } catch (err) {
            console.error("[RecentJoinStore] Failed to load:", err);
            this._recentJoins = [];
        }
    }

    setAutoSave(enabled: boolean): void {
        this._autoSave = enabled;
    }

    private _autoSaveIfEnabled(): void {
        if (this._autoSave) {
            this.save();
        }
    }

    // ==================== UTILITIES ====================

    /**
     * Remove joins antigos (útil para limpeza)
     */
    cleanOlderThan(days: number): number {
        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        const before = this._recentJoins.length;

        this._recentJoins = this._recentJoins.filter(j => j.timestamp > cutoff);

        const removed = before - this._recentJoins.length;
        if (removed > 0) {
            this._notify();
            this._autoSaveIfEnabled();
        }

        return removed;
    }

}

// ==================== SINGLETON ====================

export const JoinStore = new RecentJoinStore();

// Auto-save a cada 30s (opcional)
if (typeof window !== "undefined") {
    setInterval(() => {
        console.log("[RecentJoinStore] Auto-saving...");
        JoinStore.save();
    }, AUTO_SAVE_INTERVAL);
}
