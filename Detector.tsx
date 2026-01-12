/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * This file contains logic derived from or inspired by the project cresqnt-sys/MultiScope.
 * Portions of the biome detection logic may include translations, adaptations,
 * reinterpretations, or reimplementations of the original Python implementation.
 *
 * Original commit hash: 94f1f06114a3e7cbff64e5fd0bf31ced99b0af79 (AGPL-3.0-or-later)
 * Source File referenced: 94f1f06114a3e7cbff64e5fd0bf31ced99b0af79/detection.py
 *
 * This derivative work is distributed under the terms of the
 * GNU Affero General Public License version 3 (AGPL-3.0).
 */

import { PluginNative } from "@utils/types";

import { createLogger, CustomLogger, LogLevel } from "./CustomLogger";
import { settings } from "./settings";

// A simple EventEmitter-like class
export class FakeEmitter {
    private _events: Record<string, Function[]> = {};

    on(event: string, listener: Function) {
        if (!this._events[event]) this._events[event] = [];
        this._events[event].push(listener);
        return this;
    }

    off(event: string, listener: Function) {
        if (!this._events[event]) return this;
        this._events[event] = this._events[event].filter(l => l !== listener);
        return this;
    }

    emit(event: string, ...args: any[]) {
        if (!this._events[event]) return false;
        for (const listener of this._events[event]) {
            listener(...args);
        }
        return true;
    }

    once(event: string, listener: (...args: any[]) => void, timeout?: number) {
        const onceListener = (...args: any[]) => {
            if (timer) clearTimeout(timer);
            this.off(event, onceListener);
            listener(...args);
        };

        const timer = timeout
            ? setTimeout(() => {
                this.off(event, onceListener);
            }, timeout)
            : undefined;

        return this.on(event, onceListener);
    }

    waitFor(event: string, timeout?: number): Promise<any> {
        return new Promise(resolve => {
            let resolved = false;

            // handler for the event
            this.once(event, payload => {
                if (resolved) return;
                resolved = true;
                resolve(payload);
            }, timeout);

            // also resolve when timeout fires
            if (timeout) {
                setTimeout(() => {
                    if (resolved) return;
                    resolved = true;
                    resolve(undefined);
                }, timeout);
            }
        });
    }


    removeAllListeners() {
        this._events = {};
    }
}

/*
Native must have the following methods implemented:
getRobloxLogs(); - Returns LogEntry[]
getRelevantRpcsFromLogTail(logPath);
getBiomeFromRpc(mostRecentRpc);            @TODO this does not need to be native
*/
const Native = VencordNative.pluginHelpers.SolsRadar as PluginNative<typeof import("./native")>;

export interface LogEntry {
    path: string;
    account: string | null; // Username detectado no log
    lastModified: number; // Timestamp em ms (mtime.getTime())
}

export interface BiomeDetectedEvent {
    username: string;
    biome: string;
}

export interface BiomeChangedEvent {
    username: string;
    from: string | undefined;
    to: string | undefined;
}

export interface ClientDisconnectedEvent {
    username: string;
}

export interface UserLogFileChangedEvent {
    username: string;
    logPath: string;
}

export const DetectorEvents = {
    BIOME_DETECTED: "biome_detected",
    BIOME_CHANGED: "biome_changed",
    CLIENT_DISCONNECTED: "client_disconnected",
    USER_LOG_FILE_CHANGED: "user_log_file_changed",
} as const;

function extractTimestampFromRpc(line: string): string | undefined {
    const idx = line.indexOf(",");
    if (idx === -1) return undefined;
    const ts = line.slice(0, idx).trim();
    return ts || undefined;
}

function shallowEqual(obj1: any, obj2: any) {
    const k1 = Object.keys(obj1);
    const k2 = Object.keys(obj2);
    if (k1.length !== k2.length) return false;

    for (const k of k1) {
        if (obj1[k] !== obj2[k]) return false;
    }
    return true;
}

export class BiomeDetectorClass extends FakeEmitter {
    private running = false;
    private loop?: number;
    private userids: string[] = [];
    private useridLogMap: Record<string, string> = {};
    private lastKnownBiomes: Record<string, string | undefined> = {};
    private lastBiomeUpdateTimestamps: Record<string, number> = {};
    private lastSeenRpcTimestamps: Record<string, string> = {};
    private useridToUsername: Record<string, string> = {};
    private usernameToUserid: Record<string, string> = {};
    private logger: CustomLogger;

    constructor(logger?: CustomLogger) {
        super();
        this.logger = logger ?? createLogger("SolsRadar.BiomeDetector");
    }

    // type guards
    private hasAccount(entry: LogEntry): entry is LogEntry & { account: string; } {
        return typeof entry.account === "string" && entry.account.length > 0;
    }

    // wrappers
    private async _runBiomeCheck() {
        await this.check_all_accounts_biomes();
    }

    private async _runLogCheck() {
        const logs = await Native.getRobloxLogs("userid");
        this.logger.trace(`Found ${logs.length} logs`);
        this.logger.verbose(JSON.stringify(logs, null, 2));

        const validLogs = logs.filter(this.hasAccount);
        this.logger.trace(`Found ${validLogs.length} valid logs`);
        this.logger.verbose(`${validLogs.join("\n")}`);

        const map = validLogs.reduce((acc, entry) => {
            const current = acc[entry.account];
            if (!current || entry.lastModified > current.lastModified) {
                acc[entry.account] = entry;
            }
            return acc;
        }, {} as Record<string, LogEntry>);

        const pathMap = Object.fromEntries(
            Object.entries(map).map(([userid, info]) => [userid, info.path])
        );

        this.logger.trace(`(reduction) Found ${Object.keys(pathMap).length} unique users`);
        this.logger.verbose(`${Object.entries(pathMap).join("\n")}`);

        if (!shallowEqual(pathMap, this.useridLogMap)) {
            for (const [userid, logPath] of Object.entries(pathMap)) {
                const username = this.useridToUsername[userid];
                if (username) {
                    this.emit(DetectorEvents.USER_LOG_FILE_CHANGED, { username, logPath });
                }
            }
            this.setUseridLogMap(pathMap);
        }
    }

    // public control
    start(intervalMs = 1000) {
        if (this.running) return;
        this.running = true;

        // run immediately
        this._runLogCheck().then(() => this._runBiomeCheck());

        // then start loop
        this.logger.info(`Starting detection loop every ${intervalMs}ms`);
        this.loop = window.setInterval(async () => {
            const t0 = performance.now();
            await this._runLogCheck(); // shouldnt be a problem to run both every interval unless you have a shit ton of logs
            const t1 = performance.now();
            await this._runBiomeCheck();
            const t2 = performance.now();

            this.logger.perf(
                `Detection Loop took ${(t2 - t0).toFixed(1)}ms ` +
                `(_runLogCheck ${(t1 - t0).toFixed(1)}ms, ` +
                `_runBiomeCheck ${(t2 - t1).toFixed(1)}ms)`
            );


        }, intervalMs);
    }

    stop() {
        this.running = false;
        if (this.loop) clearInterval(this.loop);
    }

    async setAccounts(accounts: string[]) {
        try {
            const usernameToUseridRaw = await Native.robloxUsernamesToUserIds(accounts);
            // username: userid (number | null)

            // Filter out nulls and convert to string
            const validMappings = Object.fromEntries(
                Object.entries(usernameToUseridRaw)
                    .filter(([, userid]) => userid !== null)
                    .map(([username, userid]) => [username, userid!.toString()])
            );

            this.userids = Object.values(validMappings);
            this.usernameToUserid = validMappings;
            this.useridToUsername = Object.fromEntries(
                Object.entries(validMappings).map(([username, userid]) => [userid, username])
            );

            this.logger.info("Transformed usernames to user IDs", validMappings);

        } catch (err) {
            this.logger.error("Failed to convert usernames to user IDs", err);
            // Optionally clear userids on failure to avoid partial state
            this.userids = [];
            this.usernameToUserid = {};
            this.useridToUsername = {};
        }
    }


    setUseridLogMap(map: Record<string, string>) {
        this.useridLogMap = map;
    }

    // main loop
    private async check_all_accounts_biomes() {
        if (!this.running) return;

        for (const userid of this.userids) {
            await this.check_single_account_log(userid);
        }
    }

    private async check_single_account_log(userid: string) {
        const username = this.useridToUsername[userid];
        if (!username) {
            this.logger.debug(`No username mapping for userid ${userid}, skipping biome check.`);
            return;
        }

        const logPath = this.useridLogMap[userid];
        if (!logPath) {
            this.logger.debug(`No log path for account ${username}, skipping biome check.`);
            return;
        }

        const entireRpcLine = true;
        const { rpcs, disconnects, effectiveDisconnected } =
            await Native.getRelevantRpcsFromLogTail(logPath, entireRpcLine);

        if (!rpcs.length) {
            this.logger.debug(`No relevant RPCs found in log for ${username}, skipping biome check.`);
            return;
        }

        const lastBiome = this.lastKnownBiomes[userid];

        // analyzing logs, has user disconnected?
        this.logger.verbose(`Analyzing ${rpcs.length} RPCs for ${username} - disconnects: ${disconnects.length}`);
        if (effectiveDisconnected) {
            this.emit(DetectorEvents.CLIENT_DISCONNECTED, { username });

            if (lastBiome !== undefined) {
                this.logger.info(
                    `Effective disconnect detected for ${username}. Clearing biome.`
                );

                this.emit(DetectorEvents.BIOME_CHANGED, {
                    username,
                    from: lastBiome,
                    to: undefined
                });

                this.lastKnownBiomes[userid] = undefined;
            } else {
                this.logger.debug(
                    `Effective disconnect for ${username}, but no prior biome - silent skip.`
                );
            }

            return;
        }

        // still connected, whats the lastest rpc?
        const mostRecentRpc = rpcs[rpcs.length - 1];

        const ts = extractTimestampFromRpc(mostRecentRpc);
        if (!ts) {
            this.logger.warn("Could not extract timestamp from rpc:", mostRecentRpc);
            return;
        }

        // have we seen this timestamp before?
        this.logger.verbose(`Current Timestamp: ${ts} - Last seen: ${this.lastSeenRpcTimestamps[userid]}`);
        if (this.lastSeenRpcTimestamps[userid] === ts) {
            this.logger.debug(`Duplicate RPC for ${username}, ignoring.`); // spammy, only use for debug
            return;
        }

        // this is a fresh rpc
        this.lastSeenRpcTimestamps[userid] = ts;

        // uncomment for debug
        this.logger.debug(`Fresh RPC (${ts}) for ${username}`);
        this.logger.trace(`logPath: ${logPath}`);
        this.logger.trace(`mostRecentRpc: ${mostRecentRpc}`);

        // biome parsing
        const biome = await Native.getBiomeFromRpc(mostRecentRpc);
        if (!biome) {
            this.logger.verbose(`No biome found in latest RPC for ${username}, skipping biome check.`);
            return;
        }
        this.emit(DetectorEvents.BIOME_DETECTED, { username, biome });

        // ========================================================
        // 4. BIOME CHANGED?
        // ========================================================
        if (lastBiome !== biome) {
            this.logger.info(`Biome change detected for ${username}: from "${lastBiome}" -> to "${biome}"`);

            // this.emit(DetectorEvents.BIOME_CHANGED, { username, biome });
            this.emit(DetectorEvents.BIOME_CHANGED, {
                username,
                from: lastBiome,
                to: biome
            });

            this.lastKnownBiomes[userid] = biome;
            this.lastBiomeUpdateTimestamps[userid] = Date.now();
        } else {
            this.logger.info(`Biome unchanged for ${username}: remains "${biome}"`);
            this.lastBiomeUpdateTimestamps[userid] = Date.now();
        }
    }

    getCurrentBiomes(): Array<{ username: string; biome: string | null; }> {
        const now = Date.now();
        const staleThresholdMs = 60000;

        return this.userids.map(userid => {
            const username = this.useridToUsername[userid];
            if (!username) {
                return { username: "", biome: null };
            }

            const lastBiome = this.lastKnownBiomes[userid];
            if (lastBiome === undefined) {
                return { username, biome: null };
            }

            // stale?
            const lastUpdate = this.lastBiomeUpdateTimestamps[userid] || 0;
            const isStale = lastUpdate ? (now - lastUpdate > staleThresholdMs) : true; // Se não tem timestamp, considera stale

            const biome = isStale ? null : lastBiome;
            return { username, biome };
        }).filter(item => item.username.length > 0);
    }

    isAccountInBiome(username: string, biomeName: string): boolean {
        if (!this.usernameToUserid[username]) {
            this.logger.debug(`Username "${username}" not found in mappings, returning false.`);
            return false;
        }

        const now = Date.now();
        const staleThresholdMs = 60000;

        const userid = this.usernameToUserid[username];
        const lastBiome = this.lastKnownBiomes[userid];
        if (lastBiome === undefined || lastBiome.toLowerCase() !== biomeName.toLowerCase()) {
            return false;
        }

        // stale checking -- old biome data is useless
        const lastUpdate = this.lastBiomeUpdateTimestamps[userid];
        const isStale = lastUpdate ? (now - lastUpdate > staleThresholdMs) : true;
        return !isStale;
    }

    isAnyAccountInBiome(biomeName: string): boolean {
        return this.userids.some(userid => {
            const username = this.useridToUsername[userid];
            if (!username) return false;
            return this.isAccountInBiome(username, biomeName);
        });
    }

}

// this is FUCKING ugly because of the getter AND the type cast on the getter
// please find a better way to do this ASAP!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
export const BiomeDetector = new BiomeDetectorClass(createLogger("SolsRadar.BiomeDetector", () => (settings.store.biomeDetectorLoggingLevel as LogLevel) ?? "info"));
