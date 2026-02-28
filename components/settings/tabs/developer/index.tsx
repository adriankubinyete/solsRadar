/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Logger } from "@utils/Logger";
import { React, RunningGameStore } from "@webpack/common";
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
            <Button onClick={() => logger.debug(getRobloxProcess())}>
                getRobloxProcess
            </Button>

            <Button onClick={() => logger.debug(RunningGameStore.getRunningGames())}>
                getRunningGames
            </Button>
        </div>
    );
}

