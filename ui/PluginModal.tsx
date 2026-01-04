/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { ChannelRouter, Forms, NavigationRouter, React, showToast, Toasts } from "@webpack/common";

import { CButton, CDivider, CSection, CSectionMessage, CSectionNote } from "../components/BaseComponents";
import { Margins } from "../components/constants";
import { JoinStoreUI } from "../components/JoinStoreUI";
import { settings } from "../settings";
import { cl } from "../utils";
import { Setting } from "./BasicComponents";
import TriggerListUI from "./TriggerList";

const Native = (VencordNative.pluginHelpers.SolsRadar as unknown) as {
    maximizeRoblox: () => Promise<void>;
    getProcess: (target: { type: "tasklist" | "wmic"; processName: string; }) => Promise<Array<{ pid: number; name: string; path: string; }>>;
};

export function PluginModal({ rootProps }: { rootProps: ModalProps; }) {
    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className={cl("modal-header")}>
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                    }}
                >
                    <Forms.FormTitle tag="h2" className={cl("modal-title")}>
                        SolsRadar Settings
                    </Forms.FormTitle>

                    <ModalCloseButton onClick={rootProps.onClose} />
                </div>
            </ModalHeader>
            <CDivider />
            <ModalContent className={cl("modal-content")}>

                <CSection title="Recent Joins" persistKey="recentJoins" defaultOpen>
                    <CSectionMessage>
                        View and manage your recent server joins. Click on any join to see detailed information. Right click to jump to message (if it exists).
                    </CSectionMessage>
                    <JoinStoreUI onCloseAll={rootProps.onClose} />
                </CSection>


                <CSection title="Main Options" persistKey="mainOptions" defaultOpen>
                    <Setting setting="joinEnabled" customTitle="🎯 Automatic Join" />
                    <Setting setting="notifyEnabled" customTitle="📩 Notifications" />
                </CSection>

                <CSection title="Triggers" persistKey="triggers" defaultOpen>
                    <CSectionMessage>
                        Right-click a trigger to quickly enable or disable it. Left-click to open the configuration page. A trigger must be active for Join or Notify to work.<br />
                    </CSectionMessage>
                    <TriggerListUI />
                </CSection>

                <CSection title="Join Options" persistKey="joinOptions" defaultOpen>
                    <Setting setting="joinCloseGameBefore" customTitle="🟦 Close game before joining" />
                    <CSectionNote>
                        This makes your join about 1 second slower, but ✨hopefully✨ prevents the game from simply not launching at all. If you want faster joins, disable this and close your game manually before every join.
                    </CSectionNote>

                </CSection>

                <CSection title="Link Verification Options" persistKey="verify" defaultOpen>
                    <CSectionMessage variant="warning">
                        All configurations listed here will only work if you have set a Roblosecurity token to resolve links. To configure a Roblosecurity token, navigate to the plugin's settings page.
                    </CSectionMessage>
                    <Setting setting="verifyMode" customTitle="🟦 Server Link Verification Mode" />
                    <Setting setting="verifyAfterJoinFailFallbackAction" customTitle="🟦 Verification Fail Action" />
                    <CSectionMessage variant="success" iconless={true}>
                        <Setting setting="verifyAllowedPlaceIds" customTitle="✅ Allowed Place IDs" />
                    </CSectionMessage>
                    <CSectionMessage variant="danger" iconless={true}>
                        <Setting setting="verifyBlockedPlaceIds" customTitle="🚫 Blocked Place IDs" />
                    </CSectionMessage>
                </CSection>

                <CSection title="UI Options" persistKey="ui" defaultOpen>
                    <Setting
                        setting="uiShortcutAction"
                        customTitle="🟦 Chat Bar Button Shortcut Action"
                    />
                    <Setting setting="uiShowTagsInInactiveTriggers" customTitle="🟦 Show Trigger Tags in Inactive Triggers" />
                </CSection>

                <CSection title="Biome Detection Options" persistKey="biome" defaultOpen>
                    <CSectionMessage>
                        Biome detection settings to validate biomes/weather after joining a server. You need to configure the monitored account in the plugin's settings for this to work!
                    </CSectionMessage>
                    <Setting setting="biomeDetectorEnabled" customTitle="🟦 Biome Detector Enabled" />
                    <Setting setting="biomeDetectorPoolingRateMs" customTitle="🟦 Detection Refresh Rate" />
                    <CSectionNote variant="warning">
                        You cannot set it under 250ms because it's not really necessary, you'll only stress your machine. Recommended to keep as 1000ms
                    </CSectionNote>
                    <Setting setting="biomeDetectorLoggingLevel" customTitle="🟦 Detector Logging Level" />
                </CSection>

                <CSection title="Other Options" persistKey="other" defaultOpen>
                    <Setting setting="monitorNavigateToChannelsOnStartup" customTitle="🟦 Load Channels on Startup" />
                    <Setting setting="monitorGreedyMode" customTitle="🟦 Greedy Mode" />
                    <Setting setting="monitorGreedyExceptionList" customTitle="🟦 Greedy Mode Exception List" />
                    <Setting setting="monitorInterpretEmbeds" customTitle="🟦 Interpret Embed Descriptions" />
                    <Setting setting="monitorBlockedUserList" customTitle="🟦 Ignored Users" />
                </CSection>

                <CSection title="Developer Options" persistKey="dev" defaultOpen>
                    <Setting setting="loggingLevel" customTitle="Console Logging Level" />
                    <CDivider />
                    <Setting setting="_dev_verification_fail_fallback_delay_ms" customTitle="Verification Fail Fallback Delay (ms)" />
                    <CDivider />
                    <CButton style={{ width: "100%", marginBottom: Margins.MEDIUM }} onClick={async () => {
                        const process = await Native.getProcess({ type: "tasklist", processName: "RobloxPlayerBeta.exe" });
                        if (!process) {
                            showToast("Roblox not running", Toasts.Type.FAILURE);
                            return;
                        }
                        console.log("SolsRadar - Processes: ", process);
                        showToast(`Roblox PID: ${process[0].pid}`, Toasts.Type.SUCCESS);
                    }}>
                        🎯 Get Roblox PID
                    </CButton>

                    <CButton style={{ width: "100%", marginBottom: Margins.MEDIUM }} onClick={async () => {
                        showNotification({
                            title: "SoRa :: Notification Test",
                            body: "This is a test notification from SolsRadar using Vencord's notification API!",
                        });
                    }}>
                        📩 Notification Test
                    </CButton>
                    <CButton style={{ width: "100%", marginBottom: Margins.MEDIUM }} onClick={async () => {
                        const monitoredChannels = new Set(settings.store.monitorChannelList.split(",").map(id => id.trim()).filter(Boolean));
                        for (const channelId of monitoredChannels) {
                            ChannelRouter.transitionToChannel(channelId);
                            await new Promise(res => setTimeout(res, 100));
                        }
                        NavigationRouter.transitionToGuild("@me");
                    }}>
                        Force-navigate to monitored channels
                    </CButton>
                </CSection>

            </ModalContent>
        </ModalRoot>
    );
}
