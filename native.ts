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

import { exec as execCb } from "child_process";
import { IpcMainInvokeEvent } from "electron";
import * as fs from "fs"; // required by detector
import * as os from "os"; // required by detector
import * as path from "path"; // required by detector
import { promisify } from "util";

import { LogEntry } from "./Detector";

const exec = promisify(execCb);

type ProcessLookupTarget =
  | { type: "tasklist"; processName: string; }
  | { type: "wmic"; processName: string; };

export async function getProcess(
  _: IpcMainInvokeEvent,
  target: ProcessLookupTarget
): Promise<ProcessInfo[]> {

  if (process.platform !== "win32") {
    throw new Error("getProcess only works on Windows");
  }

  const { type, processName } = target;

  if (!processName || typeof processName !== "string") {
    throw new Error("Invalid argument: processName must be a non-empty string");
  }

  // this does not return path!
  if (type === "tasklist") {
    const { stdout } = await exec(
      `tasklist /FI "IMAGENAME eq ${processName}" /FO CSV /NH`
    );

    const lines = stdout.trim().split(/\r?\n/).filter(Boolean);

    return lines.map(line => {
      const [name, pid] = line
        .split(/","/)
        .map(s => s.replace(/"/g, "").trim());

      return {
        pid: Number(pid),
        name,
        path: "" // tasklist does not provide path
      };
    });
  }

  if (type === "wmic") {
    const cmd = `wmic process where "name='${processName}'" get ProcessId,ExecutablePath /FORMAT:CSV`;

    const { stdout } = await exec(cmd);
    const lines = stdout.trim().split(/\r?\n/).slice(2); // skip headers

    const processes: ProcessInfo[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;

      const parts = line.split(",");
      const executablePath = parts[1] ?? "";
      const pid = Number(parts[2]);

      if (!pid) continue;

      processes.push({
        pid,
        name: processName,
        path: executablePath
      });
    }

    return processes;
  }

  throw new Error(`Unexpected type: ${type}`);
}

// DONE TEST AREA

export type ProcessInfo = {
  pid: number;
  name: string;
  path: string;
};

export async function killProcess(
  _: IpcMainInvokeEvent,
  target: { pid: number; } | { pname: string; }
): Promise<void> {
  if (process.platform !== "win32") return;

  const command =
    "pid" in target
      ? `taskkill /PID ${target.pid} /F`
      : `taskkill /IM "${target.pname}" /F`;

  try {
    await exec(command);
  } catch {
    // ignore errors
  }
}

export async function openUri(
  _: IpcMainInvokeEvent,
  uri: string
): Promise<void> {
  if (process.platform !== "win32") {
    throw new Error("Unsupported platform: only Windows is supported");
  }

  const command = `start "" "${uri}"`;

  try {
    await exec(command);
  } catch (error) {
    throw new Error(`Failed to start Roblox: ${(error as Error).message}`);
  }
}

export async function fetchRobloxCsrf(_: IpcMainInvokeEvent, token: string): Promise<{ status: number; csrf: string | null; }> {
  try {
    const res = await fetch("https://apis.roblox.com/sharelinks/v1/resolve-link", {
      method: "POST",
      headers: { "Cookie": `.ROBLOSECURITY=${token}` },
    });

    const csrf = res.headers.get("x-csrf-token");
    return { status: res.status, csrf };
  } catch (e) {
    return { status: -1, csrf: null };
  }
}

export async function resolveRobloxShareLink(_: IpcMainInvokeEvent, token: string, csrf: string, shareCode: string): Promise<{ status: number; data: any | null; }> {
  try {
    const res = await fetch("https://apis.roblox.com/sharelinks/v1/resolve-link", {
      method: "POST",
      headers: {
        "Cookie": `.ROBLOSECURITY=${token}`,
        "X-CSRF-TOKEN": csrf,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ linkId: shareCode, linkType: "Server" }),
    });

    const data = await res.json();
    return { status: res.status, data };
  } catch (e) {
    return { status: -1, data: null };
  }
}


/*

----------------------------------------------------------------------------------------------------------------
Biome Detector Stuff

*/

// Configurações básicas
const ROBLOX_LOGS_DIR = path.join(os.homedir(), "AppData", "Local", "Roblox", "logs");
const LOG_TAIL_READ_BYTES = 2 * 1024 * 1024; // 2MB tail para RPCs
const LOG_READ_SIZE = 1048576; // 1MB para extrair username
const TIME_THRESHOLD = 7200; // 2h para arquivos recentes (em segundos)

// Retorna lista de logs recentes, com path, account e lastModified
// Ordenados por lastModified descendente (mais recente primeiro)
export function getRobloxLogs(_, from?: "username" | "userid"): LogEntry[] {
  const now = Date.now() / 1000;
  let files: string[] = [];
  try {
    files = fs.readdirSync(ROBLOX_LOGS_DIR)
      .filter(f => {
        const fullPath = path.join(ROBLOX_LOGS_DIR, f);
        if (!fs.statSync(fullPath).isFile()) return false;
        const mtime = fs.statSync(fullPath).mtime.getTime() / 1000;
        return (now - mtime) <= TIME_THRESHOLD;
      })
      .sort((a, b) => {
        const ma = fs.statSync(path.join(ROBLOX_LOGS_DIR, a)).mtime.getTime();
        const mb = fs.statSync(path.join(ROBLOX_LOGS_DIR, b)).mtime.getTime();
        return mb - ma; // Mais recente primeiro
      })
      .map(f => path.join(ROBLOX_LOGS_DIR, f));
  } catch (err) {
    console.error("Erro ao listar logs:", err);
  }

  // Para cada arquivo, extrai account e lastModified
  const logEntries: LogEntry[] = [];
  for (const logPath of files) {
    try {
      const stats = fs.statSync(logPath);
      // const account = getUseridFromLog(_, logPath);
      const account = from === "userid" ? getUseridFromLog(_, logPath) : getUsernameFromLog(_, logPath);
      logEntries.push({
        path: logPath,
        account,
        lastModified: stats.mtime.getTime(),
      });
    } catch (err) {
      console.error(`Erro ao processar ${logPath}:`, err);
    }
  }

  return logEntries;
}

// Extrai username do log (primeiros LOG_READ_SIZE bytes)
export function getUsernameFromLog(_, logPath: string): string | null {
  try {
    const content = fs.readFileSync(logPath, "utf8").substring(0, LOG_READ_SIZE);
    const match = content.match(/Players\.([^.]+)\.PlayerGui/);
    return match ? match[1] : null;
  } catch (err) {
    console.error(`Erro ao extrair username de ${logPath}:`, err);
    return null;
  }
}

// Extrai userid do log (primeiros LOG_READ_SIZE bytes)
export function getUseridFromLog(_: any, logPath: string): string | null {
  try {
    const content = fs.readFileSync(logPath, "utf8").substring(0, LOG_READ_SIZE);

    // Regex que garante que "GameJoinLoadTime" aparece ANTES de "userid:"
    // const match = content.match(/GameJoinLoadTime[\s\S]{0,200}userid:(\d+),/i);
    const match = content.match(/GameJoinLoadTime[\s\S]*?userid:(\d+),/i);

    return match ? match[1] : null;
  } catch (err) {
    console.error(`Erro ao extrair userid de ${logPath}:`, err);
    return null;
  }
}



// // Extrai RPCs relevantes do tail do log
// // Busca todos os blocos [BloxstrapRPC] no tail (de trás pra frente, para priorizar recentes)
// // Cada RPC é um string completo do bloco (do [BloxstrapRPC] até }}})
export function getRelevantRpcsFromLogTail(
  _,
  logPath: string,
  entireLine = false
): {
  rpcs: string[];
  disconnects: string[];
  effectiveDisconnected: boolean;
  mostRecentRpcTime?: string;
} {
  if (!fs.existsSync(logPath)) {
    return {
      rpcs: [],
      disconnects: [],
      effectiveDisconnected: false
    };
  }

  try {
    const stats = fs.statSync(logPath);
    const readStart = Math.max(0, stats.size - LOG_TAIL_READ_BYTES);
    const fd = fs.openSync(logPath, "r");
    const buffer = Buffer.alloc(LOG_TAIL_READ_BYTES);

    fs.readSync(fd, buffer, 0, LOG_TAIL_READ_BYTES, readStart);
    fs.closeSync(fd);

    const content = buffer.toString("utf8");

    // ---- Disconnects (return ALL of them) ----
    const disconnectRegex =
      /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z).*Client:Disconnect/g;

    const disconnects: string[] = [];
    let match;

    while ((match = disconnectRegex.exec(content))) {
      disconnects.push(match[1]);
    }

    const mostRecentDisconnect = disconnects.length
      ? disconnects[disconnects.length - 1]
      : undefined;

    const disconnectMs = mostRecentDisconnect
      ? new Date(mostRecentDisconnect).getTime()
      : undefined;

    // ---- RPCs ----
    const rpcs: string[] = [];
    let last = content.length;

    while (true) {
      const idx = content.lastIndexOf("[BloxstrapRPC]", last);
      if (idx === -1) break;

      if (entireLine) {
        const start = content.lastIndexOf("\n", idx) + 1;
        const end = content.indexOf("\n", idx);
        rpcs.unshift(content.substring(start, end === -1 ? content.length : end));
      } else {
        let partial = content.substring(idx);
        const endMarker = partial.indexOf("}}}") + 3;
        if (endMarker > 3) {
          partial = partial.substring(0, endMarker);
          rpcs.unshift(partial);
        }
      }

      last = idx - 1;
    }

    // ---- Timestamp da última RPC ----
    let mostRecentRpcTime: string | undefined = undefined;
    let mostRecentRpcMs: number | undefined = undefined;

    if (rpcs.length) {
      const match = rpcs[rpcs.length - 1].match(
        /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/
      );
      if (match) {
        mostRecentRpcTime = match[1];
        mostRecentRpcMs = new Date(mostRecentRpcTime).getTime();
      }
    }

    // ---- effectiveDisconnected ----
    let effectiveDisconnected = false;

    if (disconnectMs) {
      if (mostRecentRpcMs && mostRecentRpcMs > disconnectMs) {
        effectiveDisconnected = false;
      } else {
        effectiveDisconnected = true;
      }
    }

    return {
      rpcs,
      disconnects,
      effectiveDisconnected,
      mostRecentRpcTime
    };
  } catch (err) {
    console.error(`Erro lendo RPCs de ${logPath}:`, err);
    return {
      rpcs: [],
      disconnects: [],
      effectiveDisconnected: false
    };
  }
}

// Extrai bioma de uma RPC string específica (mantido para conveniência, mas pode ser usado no JS)
export function getBiomeFromRpc(_, rpcMessage: string): string | null {
  try {
    const jsonStart = rpcMessage.indexOf("{");
    if (jsonStart === -1) return null;
    const jsonStr = rpcMessage.substring(jsonStart);
    const data = JSON.parse(jsonStr);
    const largeImage = data.data?.largeImage;
    return typeof largeImage?.hoverText === "string" ? largeImage.hoverText : null;
  } catch (err) {
    console.error("Erro ao parsear RPC JSON:", err);
    return null;
  }
}

interface RobloxUserLookup {
  requestedUsername: string;
  id: number | null;
  name: string;
  displayName: string;
}

export async function robloxUsernamesToUserIds(_: any, usernames: string[]): Promise<Record<string, number | null>> {
  const result: Record<string, number | null> = {};

  for (const name of usernames) result[name] = null;

  if (usernames.length === 0) return result;

  try {
    const resp = await fetch("https://users.roblox.com/v1/usernames/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usernames,
        excludeBannedUsers: false
      })
    });

    const data = await resp.json().catch(() => ({ data: [] }));

    const returned = data.data ?? [];

    for (const entry of returned) {
      if (entry && entry.requestedUsername) {
        result[entry.requestedUsername] = entry.id ?? null;
      }
    }

    return result;
  } catch (err) {
    return result; // silencioso igual o sharelink
  }
}

