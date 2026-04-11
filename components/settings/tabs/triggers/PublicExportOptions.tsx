/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/* eslint-disable @stylistic/no-multi-spaces */

import { FormSwitch } from "@components/FormSwitch";
import { Paragraph } from "@components/Paragraph";
import { React } from "@webpack/common";

import { RedactField } from "../../../../stores/TriggerStore";

export function PublicExportOptions({ onChange }: { onChange: (fields: Set<RedactField>) => void; }) {
    const [redactFields, setRedactFields] = React.useState<Set<RedactField>>(
        () => new Set(["webhookUrl", "webhookForwarding", "notificationSound"])
    );

    const options: { field: RedactField; label: string; }[] = [
        { field: "customTriggers", label: "Exclude custom triggers" },
        { field: "webhookUrl", label: "Strip webhook URLs" },
        { field: "webhookForwarding", label: "Disable forwarding rules" },
        { field: "notificationSound", label: "Strip notification sounds" },
        { field: "enabled", label: "Export all triggers as disabled" },
    ];

    const toggle = (field: RedactField, checked: boolean) => {
        setRedactFields(prev => {
            const next = new Set(prev);
            checked ? next.add(field) : next.delete(field);
            onChange(next);
            return next;
        });
    };

    return (
        // i have no ####### clue how to make it auto use the max width possible. width:100% did NOT work
        // this is kind of a hack, idk if its consistent (probably not on insanely small screens)
        <div style={{ minWidth: "350px", display: "flex", flexDirection: "column", gap: 2 }}>
            <Paragraph>Choose what to redact from the export:</Paragraph>
            {options.map(({ field, label }) => (
                <FormSwitch
                    key={field}
                    title={label}
                    value={redactFields.has(field)}
                    onChange={checked => toggle(field, checked)}
                    hideBorder
                />
            ))}
        </div>
    );
}
