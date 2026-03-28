/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { classNameFactory } from "@utils/css";
import { PluginNative } from "@utils/types";
import { AuthenticationStore } from "@webpack/common";
export const cl = classNameFactory("vc-sora-");

const Native = VencordNative.pluginHelpers.SolRadar as PluginNative<typeof import("./native")>;

/**
 * Converts a CSV string to a Set of strings
 * @param {string} [csv] CSV string, e.g. "123,456,789"
 * @returns {Set<string>} Set of strings, e.g. Set("123", "456", "789")
 * @throws {TypeError} If the given parameter is not a string or undefined
 */
export function parseCsv(csv?: string): Set<string> {
    if (typeof csv !== "string" && csv !== undefined) throw new TypeError("Expected a string or undefined as the first argument");
    if (!csv?.trim()) return new Set();
    return new Set(csv.split(",").map(s => s.trim()).filter(Boolean));
}

/**
 * Sends a webhook to the specified URL with the given body
 * @param {string} url URL of the webhook
 * @param {string} body Body of the webhook
 * @returns {Promise<void>} Promise that resolves once the webhook has been sent
 * @param url
 */
export async function sendWebhook(url: string, body: string): Promise<void> {
    return await Native.sendWebhook(url, body);
}

/**
 * Converts a duration in milliseconds to a human-readable string.
 *
 * @param {number} ms Duration in milliseconds.
 * @param {boolean} [alwaysIncludeMs=false] If true, includes the remaining
 * milliseconds in the output even when the duration is ≥ 1 second
 * (e.g., "1s 500ms" instead of "1s"). Also includes "0ms" when applicable.
 * @returns {string} Human-readable string, e.g. "2h 3m 4s" or "2h 3m 4s 500ms".
 */
export function formatElapsedTime(ms: number, { alwaysIncludeMs = false }: { alwaysIncludeMs?: boolean } = {}): string {
    ms = Math.floor(ms);
    if (ms < 1000 && !alwaysIncludeMs) {
        return `${ms}ms`;
    }

    const totalSeconds = Math.floor(ms / 1000);
    const remainingMs = ms % 1000;

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];

    if (hours) parts.push(`${hours}h`);
    if (minutes) parts.push(`${minutes}m`);
    if (seconds || parts.length === 0) parts.push(`${seconds}s`);

    if (alwaysIncludeMs) {
        parts.push(`${remainingMs}ms`);
    }

    return parts.join(" ");
}


export function isDeveloper(): boolean {
    const id = AuthenticationStore.getId();
    console.log("TEST AUTHENTICATED USER ID: ", id);
    return (id === "188851299255713792");
}


// returns the userid of the current user
export function whoAmI(): string {
    return "";
}
