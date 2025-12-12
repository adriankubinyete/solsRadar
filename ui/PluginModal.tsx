/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { showNotification } from "@api/Notifications";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { Forms, React, showToast, Toasts } from "@webpack/common";

import { CButton } from "../components/BaseComponents";
import { JoinStoreUI } from "../components/JoinStoreUI";
import { Margins } from "../constants";
import { JoinStore } from "../JoinStore";
import { cl } from "../utils";
import { Line, Note, Section, SectionMessage, Setting } from "./BasicComponents";
import TriggerListUI from "./TriggerList";

const Native = (VencordNative.pluginHelpers.SolsRadar as unknown) as {
    maximizeRoblox: () => Promise<void>;
    getProcess: (target: { type: "tasklist" | "wmic"; processName: string; }) => Promise<Array<{ pid: number; name: string; path: string; }>>;
};

export function PluginModal({ rootProps }: { rootProps: ModalProps; }) {
    return (
        <ModalRoot {...rootProps}>
            <ModalHeader className={cl("modal-header")}>
                <Forms.FormTitle tag="h2" className={cl("modal-title")}>
                    SolsRadar Settings
                </Forms.FormTitle>
                <ModalCloseButton onClick={rootProps.onClose} />
            </ModalHeader>

            <ModalContent className={cl("modal-content")}>
                {/* <SectionTitle>Recent Joins</SectionTitle> */}
                {/* <JoinedServerList joins={joins} onClose={rootProps.onClose} /> */}
                <Section title="Recent Joins" persistKey="recentJoins" defaultOpen>
                    <SectionMessage>
                        View and manage your recent server joins. Click on any join to see detailed information.
                    </SectionMessage>
                    <JoinStoreUI onCloseAll={rootProps.onClose} />
                </Section>


                <Section title="Main Options" persistKey="mainOptions" defaultOpen>
                    <Setting setting="joinEnabled" customTitle="🎯 Automatic Join" />
                    <Setting setting="notifyEnabled" customTitle="📩 Notifications" />
                </Section>

                <Section title="Triggers" persistKey="triggers" defaultOpen>
                    <SectionMessage>
                        Right-click a trigger to quickly enable or disable it. Left-click to open the configuration page. A trigger must be active for Join or Notify to work.<br />
                    </SectionMessage>
                    <TriggerListUI />
                </ Section>

                <Section title="Join Options" persistKey="joinOptions" defaultOpen>
                    <Setting setting="joinCloseGameBefore" customTitle="🟦 Close game before joining" />
                    <Note>
                        This makes your join about 1 second slower, but ✨hopefully✨ prevents the game from simply not launching at all. If you want faster joins, disable this and close your game manually before every join.
                    </Note>

                </Section>

                <Section title="Link Verification Options" persistKey="verify" defaultOpen>
                    <SectionMessage>
                        ⚠️⚠️⚠️⚠️<br />All configurations listed here will only work if you have set a Roblosecurity token to resolve links. To configure a Roblosecurity token, navigate to the plugin's settings page.
                    </SectionMessage>
                    <Line />
                    <Setting setting="verifyMode" customTitle="🟦 Server Link Verification Mode" />
                    <Setting setting="verifyAfterJoinFailFallbackAction" customTitle="🟦 Verification Fail Action" />
                    <Setting setting="verifyAllowedPlaceIds" customTitle="✅ Allowed Place IDs" />
                    <Setting setting="verifyBlockedPlaceIds" customTitle="🚫 Blocked Place IDs" />
                </Section>

                <Section title="UI Options" persistKey="ui" defaultOpen>
                    <Setting
                        setting="uiShortcutAction"
                        customTitle="🟦 Chat Bar Button Shortcut Action"
                    />
                    <Setting setting="uiShowTagsInInactiveTriggers" customTitle="🟦 Show Trigger Tags in Inactive Triggers" />
                </Section>

                <Section title="Biome Detection Options" persistKey="biome" defaultOpen>
                    <SectionMessage>
                        Biome detection settings to validate biomes/weather after joining a server. You need to configure the monitored account in the plugin's settings for this to work!
                    </SectionMessage>
                    <Setting setting="biomeDetectorEnabled" customTitle="🟦 Biome Detector Enabled" />
                    <Setting setting="biomeDetectorPoolingRateMs" customTitle="🟦 Detection Refresh Rate" />
                    <Note>
                        You cannot set it under 250ms because it's not really necessary, you'll only stress your machine. Recommended to keep as 1000ms
                    </Note>
                    <Setting setting="biomeDetectorLoggingLevel" customTitle="🟦 Detector Logging Level" />
                    <Note>
                        VERY spammy in the console.
                    </Note>
                </Section>

                <Section title="Other Options" persistKey="other" defaultOpen>
                    <Setting setting="monitorNavigateToChannelsOnStartup" customTitle="🟦 Load Channels on Startup" />
                    <Setting setting="monitorGreedyMode" customTitle="🟦 Greedy Mode" />
                    <Setting setting="monitorGreedyExceptionList" customTitle="🟦 Greedy Mode Exception List" />
                    <Setting setting="monitorInterpretEmbeds" customTitle="🟦 Interpret Embed Descriptions" />
                    <Setting setting="monitorBlockedUserList" customTitle="🟦 Ignored Users" />
                </Section>

                <Section title="Developer Options" persistKey="dev" defaultOpen>
                    <Setting setting="loggingLevel" customTitle="Console Logging Level" />
                    <Line />
                    <Setting setting="_dev_verification_fail_fallback_delay_ms" customTitle="Verification Fail Fallback Delay (ms)" />
                    <Line />
                    <CButton style={{ width: "100%", marginBottom: Margins.MEDIUM }} onClick={() => {
                        const id = Math.random().toString(36).substring(2, 8);
                        JoinStore.add({
                            title: `Test Server ${id.toUpperCase()}`,
                            description: "Automatically generated test join",
                            iconUrl: "https://cdn.discordapp.com/icons/222078108977594368/a_f6959b1f2cb9.gif",
                            authorName: "TestUser",
                            authorAvatarUrl: "https://cdn.discordapp.com/embed/avatars/4.png",
                            messageJumpUrl: "https://discord.com/channels/0/0",
                            tags: Math.random() > 0.5
                                ? ["biome-verified-real", "link-verified-safe"]
                                : ["biome-verified-bait", "link-verified-unsafe"],
                            metadata: {
                                isTestData: true,
                                generatedAt: Date.now(),
                            },
                        });
                        showToast("Added fake join!", Toasts.Type.SUCCESS);
                    }}>
                        ➕ Add Fake Join
                    </CButton>
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
                </Section>

            </ModalContent>
        </ModalRoot>
    );
}
