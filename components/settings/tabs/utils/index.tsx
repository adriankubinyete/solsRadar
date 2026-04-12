/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Divider } from "@components/Divider";
import { Logger } from "@utils/Logger";
import { PluginNative } from "@utils/types";
import { React, showToast, Toasts } from "@webpack/common";

import { closeGame, emulatorJoinLink, goToHome, joinLink, prepareAdb } from "../../../../services/RobloxService";
import { settings } from "../../../../settings";

const logger = new Logger("SolRadar.Utils");

const Native = VencordNative.pluginHelpers.SolRadar as PluginNative<typeof import("../../../../native")>;

export function UtilsTab() {
    const { privateServerLink } = settings.use(["privateServerLink"]);

    const hasPrivateServerLink = Boolean(privateServerLink?.trim());

    const section: React.CSSProperties = {
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        width: "100%",
    };

    const sectionTitle: React.CSSProperties = {
        fontSize: "0.75rem",
        fontWeight: "bold",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        color: "var(--text-muted)",
    };

    const row: React.CSSProperties = {
        display: "flex",
        gap: "0.5rem",
        flexWrap: "wrap",
        alignItems: "center",
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", width: "100%", padding: "1rem", boxSizing: "border-box" }}>

            {/* General */}
            <div style={section}>
                <span style={sectionTitle}>General</span>
                <Divider />
                <div style={row}>
                    <Button size="small" disabled={!hasPrivateServerLink} onClick={() => joinLink(privateServerLink)}>
                        Join private server
                    </Button>
                    <Button size="small" onClick={() => goToHome()}>
                        Go to home page
                    </Button>
                    <Button size="small" onClick={async () => {
                        await closeGame({ graceful: true });
                        await joinLink(privateServerLink);
                    }}>
                        Graceful rejoin
                    </Button>
                </div>
                {!hasPrivateServerLink && (
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Some buttons are disabled because no private server link is set. Configure it in settings.
                    </span>
                )}
            </div>

            {/* LDPlayer */}
            <div style={section}>
                <span style={sectionTitle}>LDPlayer</span>
                <Divider />
                <div style={row}>
                    <Button size="small" disabled={!hasPrivateServerLink} onClick={async () => {
                        const result = await emulatorJoinLink(privateServerLink);
                        if (!result.ok) {
                            showToast(`Failed to join server: ${result.error}`, Toasts.Type.FAILURE);
                        } else {
                            showToast("Join initiated", Toasts.Type.SUCCESS);
                        }
                    }}>
                        Join private server
                    </Button>
                    <Button size="small" onClick={async () => {
                        const result = await prepareAdb(hasPrivateServerLink ? privateServerLink : undefined);
                        if (!result.ok) {
                            showToast(`Something went wrong: ${result.error}`, Toasts.Type.FAILURE);
                        } else {
                            showToast("Prepare ADB initiated", Toasts.Type.SUCCESS);
                        }
                    }}>
                        Prepare ADB
                    </Button>
                    <Button size="small" variant="dangerPrimary" onClick={() => Native.closeRobloxOnEmulator(settings.store.ldpAdbPath, settings.store.ldpAdbDeviceSerial, settings.store.ldpAdbPackageName)}>
                        Send close signal
                    </Button>
                </div>
                {!hasPrivateServerLink && (
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        Some buttons are disabled because no private server link is set. Configure it in settings.
                    </span>
                )}
            </div>

        </div>
    );
}
