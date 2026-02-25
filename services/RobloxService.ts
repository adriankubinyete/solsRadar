/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface RobloxPrivateServerLink {
    type: "private";
    link: string;
    code: string;
    placeId: string;
}

export interface RobloxShareLink {
    type: "share";
    link: string;
    code: string;
}

export const extractServerLink = (content: string): { ok: boolean, result: RobloxPrivateServerLink | RobloxShareLink | null, reason: string } => {
    if (!content?.trim()) return { ok: false, result: null, reason: "no-content" };

    const normalized = content.toLowerCase();
    const shareMatch = /https?:\/\/(?:www\.)?roblox\.com\/share\?code=([a-f0-9]+)/i.exec(normalized);
    const privateMatch = /https?:\/\/(?:www\.)?roblox\.com\/games\/(\d+)(?:\/[^?]*)?\?privateserverlinkcode=([a-f0-9]+)/i.exec(normalized);

    const hasShare = Boolean(shareMatch);
    const hasPrivate = Boolean(privateMatch);

    if (hasShare && hasPrivate) return { ok: false, result: null, reason: "ambiguous" };
    if (!hasShare && !hasPrivate) return { ok: false, result: null, reason: "message-has-no-match" };

    if (hasShare && shareMatch) {
        return { ok: true, result: { type: "share", link: shareMatch[0] + "&type=Server", code: shareMatch[1] }, reason: "" };
    }

    if (hasPrivate && privateMatch) {
        return { ok: true, result: { type: "private", link: privateMatch[0], code: privateMatch[2], placeId: privateMatch[1] }, reason: "" };
    }

    return { ok: false, result: null, reason: "message-has-no-match" };
};

