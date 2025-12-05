/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { openModal } from "@utils/modal";
import { findComponentByCodeLazy } from "@webpack";
import { useRef } from "@webpack/common";

import { settings } from "./settings";
import { PluginModal } from "./ui/PluginModal";

const HeaderBarIcon = findComponentByCodeLazy(".HEADER_BAR_BADGE_TOP:", '.iconBadge,"top"');

export function SolsRadarIcon({
    enabled = false
}: {
    enabled?: boolean;
}) {
    console.log("SolsRadarIcon :: enabled prop =", enabled);

    return (
        <svg
            viewBox="0 0 24 24"
            height={20}
            width={20}
            className="icon"
        >
            {/* ícone principal */}
            <path
                d="M12 11.9996L5.00197 6.33546C4.57285 5.98813 3.93869 6.05182 3.63599 6.5135C3.06678 7.38163 2.62413 8.35389 2.34078 9.41136C0.911364 14.746 4.07719 20.2294 9.41185 21.6588C14.7465 23.0882 20.2299 19.9224 21.6593 14.5877C23.0887 9.25308 19.9229 3.76971 14.5882 2.34029C11.9556 1.63489 9.28684 2.04857 7.0869 3.28972"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
            />

            {/* bolinha verde dentro da própria SVG */}
            {enabled && (
                <circle
                    cx="21" // canto inferior direito
                    cy="21"
                    r="3"
                    fill="#43a25a"
                    // stroke="var(--background-tertiary)"
                    strokeWidth="1"
                />
            )}
        </svg>
    );
}

export function TitlebarButton({ buttonClass }: { buttonClass: string; }) {
    const buttonRef = useRef<HTMLButtonElement>(null); // Type it properly if possible
    const { joinEnabled, uiShortcutAction } = settings.use(["joinEnabled", "uiShortcutAction"]);

    const toggleAutoJoin = () => {
        const newState = !settings.store.joinEnabled;
        settings.store.joinEnabled = newState;

        // Se shortcutAction for "toggleJoinAndNotifications", toggle notifications também
        if (uiShortcutAction === "toggleJoinAndNotifications") {
            settings.store.notifyEnabled = newState;
        }

        // const message = uiShortcutAction === "toggleJoinAndNotifications"
            // ? `AutoJoin and Notifications ${newState ? "enabled" : "disabled"}`
            // : `AutoJoin ${newState ? "enabled" : "disabled"}`;

        // const toastType = newState ? Toasts.Type.SUCCESS : Toasts.Type.MESSAGE;

        // showToast(message, toastType);
    };

    // right click
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        toggleAutoJoin(); // Toggle: inverte estado, toast, e indicador some/aparece via re-render
    };

    return (
        <HeaderBarIcon
            ref={buttonRef}
            className={`vc-toolbox-btn ${buttonClass}`}
            onClick={() => openModal(props => <PluginModal rootProps={props} />)}
            onContextMenu={handleContextMenu} // Right-click: toggle baseado em shortcutAction
            tooltip={`SolsRadar ${joinEnabled ? "(Active)" : ""}`} // Dinâmico: mostra status
            icon={() => <SolsRadarIcon enabled={joinEnabled} />} // Indicador verde só se joinEnabled=true
            selected={joinEnabled} // Feedback visual: "selecionado" quando ativo
        />
    );
}
