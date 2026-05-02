/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";

import { settings } from "../settings";
import { closeGame, joinLink, joinSolsPublicServer, prepareAdb } from "./RobloxService";

export type UserAction = "nothing" | "public" | "close" | "private" | "prep-adb";

const ACTION_LABELS: Record<string, string> = {
    nothing: "nothing",
    public: "join a public server",
    close: "close Roblox",
    private: "go to your private server",
    "prep-adb": "prepare ADB",
};

export async function executeAction(action: UserAction | string): Promise<void> {
    switch (action) {
        case "nothing": return;
        case "public": await joinSolsPublicServer(); return;
        case "close": await closeGame(); return;
        case "private": {
            if (!settings.store.privateServerLink.trim()) {
                showNotification({
                    title: "⚠️ SoRa :: Plugin issues!",
                    body: "Action triggered, but no private server link is configured.\nJoining a public server instead.",
                });
                await joinSolsPublicServer();
                return;
            }
            await joinLink(settings.store.privateServerLink);
            return;
        }
        case "prep-adb": {
            if (!settings.store.privateServerLink.trim()) {
                showNotification({
                    title: "⚠️ SoRa :: Plugin issues!",
                    body: "Action triggered, but no private server link is configured.\nJoining a public server instead.",
                });
                await joinSolsPublicServer();
                return;
            }
            await prepareAdb(settings.store.privateServerLink);
            return;
        }
    }
}

export function scheduleCancelableAction(
    action: UserAction | string,
    timeoutMs: number,
    context: string,
    iconUrl?: string,
): void {
    if (action === "nothing") return;

    if (settings.store.skipActionConfirmation) {
        executeAction(action);
        return;
    }

    let cancelled = false;
    const seconds = Math.round(timeoutMs / 1000);
    const label = ACTION_LABELS[action] ?? action;

    showNotification({
        title: "⏳ SoRa :: Scheduled action",
        body: `${context}\nIn ${seconds}s: ${label}. Click to cancel.`,
        icon: iconUrl,
        onClick: () => { cancelled = true; },
    });

    setTimeout(() => {
        if (!cancelled) executeAction(action);
    }, timeoutMs);
}
