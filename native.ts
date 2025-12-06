/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { exec as execCb } from "child_process";
import { IpcMainInvokeEvent } from "electron";
import { promisify } from "util";

const exec = promisify(execCb);

type ProcessLookupTarget =
  | { type: "tasklist"; processName: string }
  | { type: "wmic"; processName: string };

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
