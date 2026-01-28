/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Heading } from "@components/Heading";
import { Paragraph } from "@components/Paragraph";
import { localStorage } from "@utils/localStorage";
import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot } from "@utils/modal";
import { ChannelRouter, NavigationRouter, React, showToast, Toasts } from "@webpack/common";

import { CButton, CDivider, CInput, CSectionMessage, CSectionNote } from "../components/BaseComponents";
import { Margins } from "../components/constants";
import { JoinStoreUI } from "../components/JoinStoreUI";
import { TriggerUI } from "../components/TriggerUI";
import { settings } from "../settings";
import { cl } from "../utils";
import { Setting } from "./BasicComponents";
import TriggerListUI from "./TriggerList";

const LAST_ACTIVE_TAB_KEY = "solsradar_lastActiveTab";

const Native = (VencordNative.pluginHelpers.SolsRadar as unknown) as {
    maximizeRoblox: () => Promise<void>;
    getProcess: (target: { type: "tasklist" | "wmic"; processName: string; }) => Promise<Array<{ pid: number; name: string; path: string; }>>;
};

function JoinsTabContent({ onCloseAll }: { onCloseAll: () => void; }) {
    return (
        <div
            className={cl("flex", "flex-col", "gap-4")}
        >
            <CSectionMessage>
                View and manage your recent server joins. Click on any join to see detailed information. Right click to jump to message (if it exists).
            </CSectionMessage>
            <JoinStoreUI onCloseAll={onCloseAll} />
        </div>
    );
}

function TriggersTabContent() {
    return (
        <div
            className={cl("flex", "flex-col", "gap-4")}
        >
            <CSectionMessage>
                Right-click a trigger to quickly enable or disable it. Left-click to open the configuration page. A trigger must be active for Join or Notify to work.<br />
            </CSectionMessage>
            <TriggerListUI />
        </div>
    );
}

function SettingsTabContent() {
    const [searchQuery, setSearchQuery] = React.useState("");

    const lowerQuery = searchQuery.toLowerCase().trim();

    // Dados das seções com títulos e settings
    const sectionData = React.useMemo(() => ({
        general: {
            title: "General",
            settings: ["Automatic Join", "Notifications"]
        },
        gameLaunch: {
            title: "Game Launch",
            settings: ["Close game before joining"]
        },
        linkVerif: {
            title: "Link Verification",
            settings: ["Server Link Verification Mode", "Verification Fail Action", "Allowed Place IDs", "Blocked Place IDs"]
        },
        ui: {
            title: "UI Options",
            settings: ["Chat Bar Button Shortcut Action", "Show Trigger Tags in Inactive Triggers"]
        },
        biomeDetect: {
            title: "Biome Detection",
            settings: ["Biome Detector Enabled", "Stop Redundant Joins", "Detection Refresh Rate", "Detector Logging Level"]
        },
        other: {
            title: "Other",
            settings: ["Load Channels on Startup", "Greedy Mode", "Greedy Mode Exception List", "Interpret Embeds", "Ignored Users"]
        },
        dev: {
            title: "Development Options",
            settings: ["Console Logging Level", "Verification Fail Fallback Delay (ms)"]
        }
    }), []);

    const shouldShowSection = React.useCallback(sectionKey => {
        if (!lowerQuery) return { show: true, showAll: true };

        const section = sectionData[sectionKey];
        const titleMatch = section.title.toLowerCase().includes(lowerQuery);

        // title match : show everything!
        if (titleMatch) {
            // meh, i dont like this anymore
            // return { show: true, showAll: true };
        }

        // query match in settings only
        const hasMatchingSetting = section.settings.some(s => s.toLowerCase().includes(lowerQuery));
        return { show: hasMatchingSetting, showAll: false };
    }, [lowerQuery, sectionData]);

    // individual setting check
    const shouldShowSetting = React.useCallback((settingTitle, showAll) => {
        if (!lowerQuery || showAll) return true;
        return settingTitle.toLowerCase().includes(lowerQuery);
    }, [lowerQuery]);

    const generalSection = shouldShowSection("general");
    const gameLaunchSection = shouldShowSection("gameLaunch");
    const linkVerifSection = shouldShowSection("linkVerif");
    const uiSection = shouldShowSection("ui");
    const biomeDetectSection = shouldShowSection("biomeDetect");
    const otherSection = shouldShowSection("other");
    const devSection = shouldShowSection("dev");

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "100%" }}>
            {/* search field */}
            <CInput
                placeholder="Search setting..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: "100%" }}
            />

            {/* General */}
            {generalSection.show && (
                <>
                    <div>
                        <Heading tag="h2" style={{ fontWeight: "bold", fontSize: "1.2rem", marginTop: "0.5rem", marginBottom: "1rem" }}>
                            General
                        </Heading>
                        <div style={{ display: "grid", gap: 8 }}>
                            {shouldShowSetting("Automatic Join", generalSection.showAll) && <Setting id="joinEnabled" overrideTitle="Automatic Join" />}
                            {shouldShowSetting("Notifications", generalSection.showAll) && <Setting id="notifyEnabled" overrideTitle="Notifications" />}
                        </div>
                    </div>
                    <CDivider />
                </>
            )}

            {/* Game Launch */}
            {gameLaunchSection.show && (
                <>
                    <div>
                        <Heading tag="h2" style={{ fontWeight: "bold", fontSize: "1.2rem", marginTop: "0.5rem", marginBottom: "1rem" }}>
                            Game Launch
                        </Heading>
                        <div style={{ display: "grid", gap: 8 }}>
                            {shouldShowSetting("Close game before joining", gameLaunchSection.showAll) && <Setting id="joinCloseGameBefore" overrideTitle="Close game before joining" />}
                        </div>
                        <CSectionNote variant="tip">
                            This makes your join about 200-400 milliseconds slower, but hopefully prevents the game from simply not launching at all.
                            If you want faster joins, disable this and close your game manually before every join.
                        </CSectionNote>
                    </div>
                    <CDivider />
                </>
            )}

            {/* Link Verification */}
            {linkVerifSection.show && (
                <>
                    <div>
                        <Heading tag="h2" style={{ fontWeight: "bold", fontSize: "1.2rem", marginTop: "0.5rem", marginBottom: "1rem" }}>
                            Link Verification
                        </Heading>
                        <CSectionMessage variant="warning" style={{ marginBottom: "1rem" }}>
                            All configurations listed here will only work if you have set a Roblosecurity token to resolve links.
                            To configure a Roblosecure token, navigate to the plugin's settings page.
                        </CSectionMessage>
                        <div style={{ display: "grid", gap: 8 }}>
                            {shouldShowSetting("Server Link Verification Mode", linkVerifSection.showAll) && <Setting id="verifyMode" overrideTitle="Server Link Verification Mode" />}
                            {shouldShowSetting("Verification Fail Action", linkVerifSection.showAll) && <Setting id="verifyAfterJoinFailFallbackAction" overrideTitle="Verification Fail Action" style={{ marginTop: 4 }} />}
                            {shouldShowSetting("Allowed Place IDs", linkVerifSection.showAll) && (
                                <CSectionMessage variant="success" iconless={true}>
                                    <Setting id="verifyAllowedPlaceIds" overrideTitle="Allowed Place IDs" />
                                </CSectionMessage>
                            )}
                            {shouldShowSetting("Blocked Place IDs", linkVerifSection.showAll) && (
                                <CSectionMessage variant="danger" iconless={true}>
                                    <Setting id="verifyBlockedPlaceIds" overrideTitle="Blocked Place IDs" />
                                </CSectionMessage>
                            )}
                        </div>
                    </div>
                    <CDivider />
                </>
            )}

            {/* UI Options */}
            {uiSection.show && (
                <>
                    <div>
                        <Heading tag="h2" style={{ fontWeight: "bold", fontSize: "1.2rem", marginTop: "0.5rem", marginBottom: "1rem" }}>
                            UI Options
                        </Heading>
                        <div style={{ display: "grid", gap: 8 }}>
                            {shouldShowSetting("Chat Bar Button Shortcut Action", uiSection.showAll) && <Setting id="uiShortcutAction" overrideTitle="Chat Bar Button Shortcut Action" />}
                            {shouldShowSetting("Show Trigger Tags in Inactive Triggers", uiSection.showAll) && <Setting id="uiShowTagsInInactiveTriggers" overrideTitle="Show Trigger Tags in Inactive Triggers" />}
                        </div>
                    </div>
                    <CDivider />
                </>
            )}

            {/* Biome Detection */}
            {biomeDetectSection.show && (
                <>
                    <div>
                        <Heading tag="h2" style={{ fontWeight: "bold", fontSize: "1.2rem", marginTop: "0.5rem", marginBottom: "1rem" }}>
                            Biome Detection
                        </Heading>
                        <CSectionMessage variant="default" style={{ marginBottom: "1rem" }}>
                            Biome detection settings to validate biomes/weather after joining a server.
                            You need to configure the monitored account in the plugin's settings for this to work!
                        </CSectionMessage>
                        <div style={{ display: "grid", gap: 8 }}>
                            {shouldShowSetting("Biome Detector Enabled", biomeDetectSection.showAll) && <Setting id="biomeDetectorEnabled" overrideTitle="Biome Detector Enabled" />}
                            {shouldShowSetting("Stop Redundant Joins", biomeDetectSection.showAll) && <Setting id="biomeDetectorStopRedundantJoins" overrideTitle="Stop Redundant Joins" />}
                            {shouldShowSetting("Detection Refresh Rate", biomeDetectSection.showAll) && <Setting id="biomeDetectorPoolingRateMs" overrideTitle="Detection Refresh Rate" style={{ marginTop: 4 }} />}
                            {shouldShowSetting("Detection Refresh Rate", biomeDetectSection.showAll) && (
                                <CSectionNote variant="warning">
                                    You cannot set it under 250ms because it's not really necessary, you'll only stress your machine.
                                    Recommended to keep as 1000ms.
                                </CSectionNote>
                            )}
                            {shouldShowSetting("Detector Logging Level", biomeDetectSection.showAll) && <Setting id="biomeDetectorLoggingLevel" overrideTitle="Detector Logging Level" />}
                        </div>
                    </div>
                    <CDivider />
                </>
            )}

            {/* Other */}
            {otherSection.show && (
                <>
                    <div>
                        <Heading tag="h2" style={{ fontWeight: "bold", fontSize: "1.2rem", marginTop: "0.5rem", marginBottom: "1rem" }}>
                            Other
                        </Heading>
                        <div style={{ display: "grid", gap: 8 }}>
                            {shouldShowSetting("Load Channels on Startup", otherSection.showAll) && <Setting id="monitorNavigateToChannelsOnStartup" overrideTitle="Load Channels on Startup" />}
                            {shouldShowSetting("Greedy Mode", otherSection.showAll) && <Setting id="monitorGreedyMode" overrideTitle="Greedy Mode" />}
                            {shouldShowSetting("Greedy Mode Exception List", otherSection.showAll) && <Setting id="monitorGreedyExceptionList" overrideTitle="Greedy Mode Exception List" style={{ marginTop: 4 }} />}
                            {shouldShowSetting("Interpret Embeds", otherSection.showAll) && <Setting id="monitorInterpretEmbeds" overrideTitle="Interpret Embeds" />}
                            {shouldShowSetting("Ignored Users", otherSection.showAll) && (
                                <CSectionMessage variant="danger" iconless={true}>
                                    <Setting id="monitorBlockedUserList" overrideTitle="Ignored Users" />
                                </CSectionMessage>
                            )}
                        </div>
                    </div>
                    <CDivider />
                </>
            )}

            {/* Development Options */}
            {devSection.show && (
                <div>
                    <Heading tag="h2" style={{ fontWeight: "bold", fontSize: "1.2rem", marginTop: "0.5rem", marginBottom: "1rem" }}>
                        Development Options
                    </Heading>
                    <div style={{ display: "grid", gap: 8 }}>
                        {shouldShowSetting("Console Logging Level", devSection.showAll) && <Setting id="loggingLevel" overrideTitle="Console Logging Level" />}
                        {shouldShowSetting("Verification Fail Fallback Delay (ms)", devSection.showAll) && <Setting id="_dev_verification_fail_fallback_delay_ms" overrideTitle="Verification Fail Fallback Delay (ms)" style={{ marginTop: 4 }} />}

                        <div className={cl("flex", "flex-col", "gap-3", "mt-6")}>
                            <CButton style={{ width: "100%", marginBottom: Margins.MEDIUM }} onClick={async () => {
                                const process = await Native.getProcess({ type: "tasklist", processName: "RobloxPlayerBeta.exe" });
                                if (!process) {
                                    showToast("Roblox not running", Toasts.Type.FAILURE);
                                    return;
                                }
                                console.log("SolsRadar - Processes: ", process);
                                showToast(`Roblox PID: ${process[0].pid}`, Toasts.Type.SUCCESS);
                            }}>
                                Get Roblox PID
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
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function TestTabContent() {
    return (
        <div
            className={cl("flex", "flex-col", "gap-4")}
        >
            <CSectionMessage>
                This is a test tab for experimental features.
            </CSectionMessage>
            <TriggerUI />
        </div>
    );
}

export function PluginModal({ rootProps }: { rootProps: ModalProps; }) {
    const localStorageData = localStorage.getItem(LAST_ACTIVE_TAB_KEY);
    const [activeTab, setActiveTab] = React.useState<"joins" | "triggers" | "settings" | "test">(localStorageData ? JSON.parse(localStorageData)?.tab : "settings");

    const handleTabClick = (tab: "joins" | "triggers" | "settings" | "test") => {
        setActiveTab(tab);
        localStorage.setItem(LAST_ACTIVE_TAB_KEY, JSON.stringify({ tab }));
    };

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
                    <Heading tag="h2" className={cl("modal-title")}>
                        SolsRadar
                    </Heading>

                    <ModalCloseButton onClick={rootProps.onClose} />
                </div>
            </ModalHeader>
            <CDivider />
            <ModalContent className={cl("modal-content")} style={{ marginBottom: 8, minHeight: "fit-content" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridAutoRows: "minmax(40px, 1fr)", gridGap: Margins.MEDIUM, width: "100%" }}>
                    <CButton
                        onClick={() => handleTabClick("joins")}
                        variant={activeTab === "joins" ? "primary" : "secondary"}
                        style={{ minHeight: "fit-content" }}
                        title="Check information about your most recent joins"
                    >
                        Joins
                    </CButton>
                    <CButton
                        onClick={() => handleTabClick("triggers")}
                        variant={activeTab === "triggers" ? "primary" : "secondary"}
                        style={{ minHeight: "fit-content" }}
                        title="Configure your triggers"
                    >
                        Triggers
                    </CButton>
                    <CButton
                        onClick={() => handleTabClick("settings")}
                        variant={activeTab === "settings" ? "primary" : "secondary"}
                        style={{ minHeight: "fit-content" }}
                        title="Configure plugin options and behavior"
                    >
                        Settings
                    </CButton>
                    {/* <CButton
                        onClick={() => handleTabClick("test")}
                        variant={activeTab === "test" ? "primary" : "secondary"}
                        style={{ minHeight: "fit-content" }}
                        title="Experimental features and tests"
                    >
                        Test
                    </CButton> */}
                </div>
            </ModalContent>
            <CDivider />
            <ModalContent
                // className={cl("modal-content")}
                style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    padding: 0,
                    marginTop: 0,
                    width: "100%",
                    minHeight: "400px",
                }}
            >
                {(() => {
                    switch (activeTab) {
                        case "joins":
                            return <JoinsTabContent onCloseAll={rootProps.onClose} />;
                        case "triggers":
                            return <TriggersTabContent />;
                        case "settings":
                            return <SettingsTabContent />;
                        // case "test":
                        //   return <TestTabContent />;
                        default:
                            return (
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", textAlign: "center", gap: "1em" }}>
                                    <Heading tag="h2" className={cl("font-bold", "text-2xl", "mb-2")}>
                                        Uh oh, something went wrong...
                                    </Heading>
                                    <Paragraph className={cl("mb-4")}>
                                        The selected tab is no longer available.
                                    </Paragraph>
                                    <CButton onClick={() => handleTabClick("settings")} variant="primary">
                                        Go to Settings
                                    </CButton>
                                </div>
                            );
                    }
                })()}
            </ModalContent>

        </ModalRoot>
    );
}
