/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const LOG_LEVELS = {
    verbose: { color: "#6b7280" },
    trace:   { color: "#6b7280" },
    debug:   { color: "#9ca3af" },
    perf:    { color: "#ff00ff" },
    info:    { color: "#3b82f6" },
    warn:    { color: "#facc15" },
    error:   { color: "#ef4444" },
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;

const LEVEL_ORDER = Object.keys(LOG_LEVELS) as LogLevel[];

export type CustomLogger = {
    inherit(subName: string): CustomLogger;
} & {
    [level in LogLevel]: (...args: any[]) => void;
};

/**
 * Create a logger without depending on settings.ts
 * @param name Logger name
 * @param levelGetter A function that returns the current LogLevel
 */
export function createLogger(
    name: string,
    levelGetter: () => LogLevel = () => "trace"
): CustomLogger {

    function log(level: LogLevel, ...args: any[]) {
        const current = levelGetter();

        // filter logs
        if (LEVEL_ORDER.indexOf(level) < LEVEL_ORDER.indexOf(current)) return;

        // timestamp
        const now = new Date();
        const time = now.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
        const ms = now.getMilliseconds().toString().padStart(3, "0");
        const timestamp = `${time}.${ms}`;

        // output
        console.log(
            `%c[${level.toUpperCase()}] [${name}] ${timestamp}`,
            `color: ${LOG_LEVELS[level].color}`,
            ...args
        );
    }

    const logger = {
        inherit(subName: string) {
            // inherit must pass same levelGetter
            return createLogger(`${name}.${subName}`, levelGetter);
        }
    } as CustomLogger;

    // attach logger functions (logger.info, logger.debug, etc)
    for (const level of LEVEL_ORDER) {
        logger[level] = (...args: any[]) => log(level, ...args);
    }

    return logger;
}
