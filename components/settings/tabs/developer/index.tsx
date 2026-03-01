/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Card } from "@components/Card";
import { Logger } from "@utils/Logger";
import { React, RunningGameStore } from "@webpack/common";
import { Pill } from "userplugins/sradar/components/Pill";
import { getRobloxProcess } from "userplugins/sradar/services/RobloxService";

const logger = new Logger("SolRadar.Developer");

const s = {
    container: {
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        gap: "1rem"
    } as React.CSSProperties
};

export function DeveloperTab() {
    return (
        <div style={s.container}>
            <div style={{ display: "flex", gap: "1rem", flexDirection: "row", alignItems: "center", justifyContent: "center", height: "100%" }}>
                <Button onClick={() => logger.debug(getRobloxProcess())}>
                    getRobloxProcess
                </Button>

                <Button onClick={() => logger.debug(RunningGameStore.getRunningGames())}>
                    getRunningGames
                </Button>
            </div>
            <div style={{ display: "flex", gap: "1rem", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
                <Card variant="danger" defaultPadding>
                    <Button onClick={() => logger.debug(RunningGameStore.getRunningGames())}>
                        getRunningGames : DANGER
                    </Button>
                </Card>

                <Card variant="normal" defaultPadding>
                    <Button onClick={() => logger.debug(RunningGameStore.getRunningGames())}>
                        getRunningGames : NORMAL
                    </Button>
                </Card>

                <Card variant="warning" defaultPadding >
                    <Button onClick={() => logger.debug(RunningGameStore.getRunningGames())}>
                        getRunningGames : WARNING
                    </Button>
                </Card>
            </div>
            <div style={{ display: "flex", gap: "1rem", flexDirection: "row", alignItems: "center", justifyContent: "center", height: "100%" }}>
                <div style={{ display: "flex", gap: "1rem", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
                    <Pill variant="brand">default</Pill>
                    <Pill border="strong" variant="blue">b:strong v:blue</Pill>
                    <Pill border="subtle" variant="brand">b:subtle v:brand</Pill>
                    <Pill radius="md" variant="green">r:md v:green</Pill>
                    <Pill radius="none" variant="muted">r:none v:muted</Pill>
                    <Pill iconOnly emoji="✌️" variant="pink" title="iconOnly v:pink" />
                    <Pill variant="purple">v:purple</Pill>
                    <Pill variant="red">v:red</Pill>
                    <Pill variant="yellow">v:yellow</Pill>
                </div>
                <div style={{ display: "flex", gap: "1rem", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
                    <Pill size="xs" variant="brand">default</Pill>
                    <Pill size="xs" border="strong" variant="blue">b:strong v:blue</Pill>
                    <Pill size="xs" border="subtle" variant="brand">b:subtle v:brand</Pill>
                    <Pill size="xs" radius="md" variant="green">r:md v:green</Pill>
                    <Pill size="xs" radius="none" variant="muted">r:none v:muted</Pill>
                    <Pill size="xs" iconOnly emoji="✌️" variant="pink" title="iconOnly v:pink" />
                    <Pill size="xs" variant="purple">v:purple</Pill>
                    <Pill size="xs" variant="red">v:red</Pill>
                    <Pill size="xs" variant="yellow">v:yellow</Pill>
                </div>
                <div style={{ display: "flex", gap: "1rem", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
                    <Pill size="small" variant="brand">default</Pill>
                    <Pill size="small" border="strong" variant="blue">b:strong v:blue</Pill>
                    <Pill size="small" border="subtle" variant="brand">b:subtle v:brand</Pill>
                    <Pill size="small" radius="md" variant="green">r:md v:green</Pill>
                    <Pill size="small" radius="none" variant="muted">r:none v:muted</Pill>
                    <Pill size="small" iconOnly emoji="✌️" variant="pink" title="iconOnly v:pink" />
                    <Pill size="small" variant="purple">v:purple</Pill>
                    <Pill size="small" variant="red">v:red</Pill>
                    <Pill size="small" variant="yellow">v:yellow</Pill>
                </div>
            </div>
        </div>
    );
}

