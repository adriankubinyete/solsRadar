/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ModalCloseButton, ModalContent, ModalHeader, ModalProps, ModalRoot, openModal } from "@utils/modal";
import { Forms, NavigationRouter, React } from "@webpack/common";

import { Margins } from "../constants";
import { JoinStore, JoinTag, RecentJoin, TAG_CONFIGS } from "../JoinStore";
import { cl, formatTimeAgo } from "../utils";
import {
    CBadge,
    CButton,
    CCard,
    CDivider,
    CEmptyState,
    CInput,
    CSelect,
} from "./BaseComponents";

const AVATAR_FALLBACK = "https://discord.com/assets/881ed827548f38c6.svg";

// ==================== MAIN COMPONENT ====================

export function JoinStoreUI({ onCloseAll }: { onCloseAll?: () => void; }) {
    const [joins, setJoins] = React.useState<RecentJoin[]>(JoinStore.all);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [filterTag, setFilterTag] = React.useState<string>("all");

    // Subscribe to store changes
    React.useEffect(() => {
        const unsubscribe = JoinStore.subscribe(setJoins);
        return unsubscribe;
    }, []);

    // Filter options
    const tagOptions = [
        { label: "All Joins", value: "all" },
        { label: "✅ Real", value: "biome-verified-real" },
        { label: "🎣 Bait", value: "biome-verified-bait" },
        { label: "⚠️ Timeout", value: "biome-verified-timeout" },
        { label: "❌ Failed", value: "failed" },
    ];

    // Apply filters
    const filteredJoins = React.useMemo(() => {
        let result = joins;

        console.log("Applying filters...");
        console.log(joins);

        if (!joins.length) return [];

        // Filter by tag
        if (filterTag !== "all") {
            if (filterTag === "pending") {
                result = result.filter(j =>
                    j.tags.includes("unknown" as JoinTag) ||
                    j.tags.includes("not-verified" as JoinTag)
                );
            } else {
                result = result.filter(j => j.tags.includes(filterTag as JoinTag));
            }
        }

        // Filter by search term
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(j =>
                j.title.toLowerCase().includes(term) ||
                j.authorName?.toLowerCase().includes(term) ||
                j.description?.toLowerCase().includes(term)
            );
        }

        return result;
    }, [joins, filterTag, searchTerm]);

    const handleClearAll = () => {
        JoinStore.clear();
        // if (confirm("Are you sure you want to clear all joins?")) {
        //     JoinStore.clear();
        // }
    };

    const handleAddFakeJoin = () => {
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
    };

    const handleCardClick = (join: RecentJoin) => {
        openModal(props => (
            <JoinDetailModal
                join={join}
                rootProps={props}
                onClose={props.onClose}
                onCloseAll={onCloseAll}
            />
        ));
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Header with stats */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "nowrap",
                }}
            >
                {/* Left side — stats */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 1 }}>
                    <CBadge variant="primary">{joins.length} Total</CBadge>
                    <CBadge variant="success">
                        {joins.filter(j => j.tags.includes("link-verified-safe")).length} Verified
                    </CBadge>
                    <CBadge variant="danger">
                        {joins.filter(j => j.tags.includes("link-verified-unsafe")).length} Fake
                    </CBadge>
                </div>

                {/* Right side — fixed button group */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                    <CButton variant="primary" size="small" onClick={handleAddFakeJoin}>
                        Add Fake Join
                    </CButton>
                    <CButton variant="danger" size="small" onClick={handleClearAll}>
                        Clear All
                    </CButton>
                </div>
            </div>

            {/* Filters */}
            <div
                style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                }}
            >
                <div style={{ flex: 1, minWidth: 200 }}>
                    <CInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Search by title, author..."
                        fullWidth
                        icon="🔍"
                        variant="slim"
                    />
                </div>
                <CSelect
                    options={tagOptions}
                    value={filterTag}
                    onChange={setFilterTag}
                />
            </div>

            <CDivider />

            {/* Join list */}
            {filteredJoins.length === 0 ? (
                <CEmptyState
                    icon="📭"
                    title="No joins found"
                    description={
                        searchTerm || filterTag !== "all"
                            ? "Try adjusting your filters"
                            : "Joins will appear here when you snipe server links"
                    }
                />
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {filteredJoins.map(join => (
                        <JoinCard
                            key={join.id}
                            join={join}
                            onClick={() => handleCardClick(join)}
                        />
                    ))}
                </div>
            )}

            {/* Footer info */}
            {filteredJoins.length > 0 && (
                <div style={{ fontSize: 12, color: "#b9bbbe", textAlign: "center" }}>
                    Showing {filteredJoins.length} of {joins.length} joins
                    {(searchTerm || filterTag !== "all") && " (filtered)"}
                </div>
            )}
        </div>
    );
}

// ==================== JOIN CARD ====================

type JoinCardProps = {
    join: RecentJoin;
    onClick: () => void;
};

function JoinCard({ join, onClick }: JoinCardProps) {
    const primaryTag = JoinStore.getPrimaryTag(join);
    const primaryConfig = TAG_CONFIGS[primaryTag];

    const isUnsafe = join.tags.some(tag =>
        ["link-verified-unsafe", "failed", "biome-verified-bait"].includes(tag)
    );

    const variant = isUnsafe ? "danger" : join.tags.includes("link-verified-safe") ? "success" : "default";

    console.log("Icon For card id: ", join.id, join.iconUrl);

    return (
        <CCard onClick={onClick} variant={variant} hoverable>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {/* Server Icon */}
                <ServerIcon iconUrl={join.iconUrl} />

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title */}
                    <div
                        style={{
                            fontWeight: 600,
                            color: "#fff",
                            fontSize: 15,
                            marginBottom: 4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                        }}
                    >
                        {join.title}
                    </div>

                    {/* Description */}
                    {join.description && (
                        <div
                            style={{
                                fontSize: 13,
                                color: "#b9bbbe",
                                marginBottom: 6,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                            }}
                        >
                            {join.description}
                        </div>
                    )}

                    {/* Tags */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                        {join.tags.slice(0, 3).map(tag => {
                            const config = TAG_CONFIGS[tag];
                            if (!config) return null;

                            const SUCCESS_TAGS = ["link-verified-safe", "biome-verified-real"];
                            const DANGER_TAGS = ["link-verified-unsafe", "failed"];
                            const WARNING_TAGS = ["biome-verified-bait", "biome-verified-timeout"];

                            const badgeVariant = SUCCESS_TAGS.includes(tag)
                                ? "success"
                                : DANGER_TAGS.includes(tag)
                                    ? "danger"
                                    : WARNING_TAGS.includes(tag)
                                        ? "warning"
                                        : "secondary";

                            return (
                                <CBadge key={tag} variant={badgeVariant} size="small">
                                    {config.emoji} {config.label}
                                </CBadge>
                            );
                        })}
                        {join.tags.length > 3 && (
                            <CBadge variant="secondary" size="small">
                                +{join.tags.length - 3}
                            </CBadge>
                        )}
                    </div>

                    {/* Footer */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            fontSize: 12,
                            color: "#999",
                        }}
                    >
                        {join.authorName && (
                            <>
                                <img
                                    src={join.authorAvatarUrl || AVATAR_FALLBACK}
                                    alt=""
                                    onError={e => {
                                        (e.currentTarget as HTMLImageElement).src = AVATAR_FALLBACK;
                                    }}
                                    style={{
                                        width: 16,
                                        height: 16,
                                        borderRadius: "50%",
                                    }}
                                />
                                <span>{join.authorName}</span>
                                <span>•</span>
                            </>
                        )}
                        <span>{formatTimeAgo(join.timestamp)}</span>
                    </div>
                </div>

                {/* Arrow indicator */}
                <div style={{ color: "#999", fontSize: 18, flexShrink: 0 }}>→</div>
            </div>
        </CCard>
    );
}

// ==================== SERVER ICON ====================

function ServerIcon({ iconUrl }: { iconUrl?: string; }) {
    const [imgSrc, setImgSrc] = React.useState(iconUrl || AVATAR_FALLBACK);

    return (
        <img
            src={imgSrc}
            alt=""
            onError={() => setImgSrc(AVATAR_FALLBACK)}
            style={{
                width: 60,
                height: 60,
                objectFit: "cover",
                borderRadius: 8,
                flexShrink: 0,
            }}
        />
    );
}

// ==================== JOIN DETAIL MODAL ====================

type JoinDetailModalProps = {
    join: RecentJoin;
    rootProps: ModalProps;
    onClose: () => void;
    onCloseAll?: () => void; // close all modals
};

function JoinDetailModal({ join, rootProps, onClose, onCloseAll }: JoinDetailModalProps) {
    const primaryTag = JoinStore.getPrimaryTag(join);
    const primaryConfig = TAG_CONFIGS[primaryTag];

    const handleJumpToMessage = () => {
        if (!join.messageJumpUrl) {
            alert("Message URL not available");
            return;
        }

        try {
            const url = new URL(join.messageJumpUrl);
            NavigationRouter.transitionTo(url.pathname);
            onClose();
            if (onCloseAll) onCloseAll();
        } catch (err) {
            alert("Failed to navigate to message");
            console.error(err);
        }
    };

    const handleDeleteJoin = () => {
        JoinStore.delete(join.id);
        onClose();
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
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <img
                            src={join.iconUrl || AVATAR_FALLBACK}
                            alt=""
                            onError={e => {
                                (e.currentTarget as HTMLImageElement).src =
                                    AVATAR_FALLBACK;
                            }}
                            style={{
                                width: 32,
                                height: 32,
                                borderRadius: 6,
                            }}
                        />

                        <div style={{ flex: 1 }}>
                            <Forms.FormTitle tag="h2" className={cl("modal-title")}>
                                {join.title} (#id:{join.id})
                            </Forms.FormTitle>
                        </div>
                    </div>

                    <ModalCloseButton onClick={onClose} />
                </div>
            </ModalHeader>
            <CDivider />
            <ModalContent>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: Margins.MEDIUM }}>
                    {/* Primary Status */}
                    <div>
                        <div
                            style={{
                                fontSize: 14,
                                color: "#b9bbbe",
                                marginBottom: 8,
                                fontWeight: 600,
                            }}
                        >
                            Status
                        </div>
                        <div
                            style={{
                                fontSize: 20,
                                fontWeight: 600,
                                color: primaryConfig.color,
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                            }}
                        >
                            <span style={{ fontSize: 24 }}>{primaryConfig.emoji}</span>
                            {primaryConfig.label}
                        </div>
                    </div>

                    <CDivider />

                    {/* All Tags */}
                    <div>
                        <div
                            style={{
                                fontSize: 14,
                                color: "#b9bbbe",
                                marginBottom: 8,
                                fontWeight: 600,
                            }}
                        >
                            Tags
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {join.tags.map(tag => {
                                const config = TAG_CONFIGS[tag];
                                if (!config) return null;

                                const SUCCESS_TAGS = ["link-verified-safe", "biome-verified-real"];
                                const DANGER_TAGS = ["link-verified-unsafe", "failed"];
                                const WARNING_TAGS = ["biome-verified-bait", "biome-verified-timeout"];

                                const badgeVariant = SUCCESS_TAGS.includes(tag)
                                    ? "success"
                                    : DANGER_TAGS.includes(tag)
                                        ? "danger"
                                        : WARNING_TAGS.includes(tag)
                                            ? "warning"
                                            : "secondary";

                                // const badgeVariant =
                                //     tag === "verified" || tag === "safe"
                                //         ? "success"
                                //         : tag === "fake" || tag === "scam" || tag === "failed"
                                //             ? "danger"
                                //             : tag === "biome-bait"
                                //                 ? "warning"
                                //                 : "secondary";

                                return (
                                    <CBadge key={tag} variant={badgeVariant}>
                                        {config.emoji} {config.label}
                                    </CBadge>
                                );
                            })}
                        </div>
                    </div>

                    <CDivider />

                    {/* Details */}
                    <div>
                        <div
                            style={{
                                fontSize: 14,
                                color: "#b9bbbe",
                                marginBottom: 8,
                                fontWeight: 600,
                            }}
                        >
                            Details
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {join.description && (
                                <DetailRow label="Description" value={join.description} />
                            )}
                            {join.authorName && (
                                <DetailRow
                                    label="Posted by"
                                    value={
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <img
                                                src={join.authorAvatarUrl || AVATAR_FALLBACK}
                                                alt=""
                                                onError={e => {
                                                    (e.currentTarget as HTMLImageElement).src =
                                                        AVATAR_FALLBACK;
                                                }}
                                                style={{
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: "50%",
                                                }}
                                            />
                                            {join.authorName}
                                        </div>
                                    }
                                />
                            )}
                            <DetailRow
                                label="Time"
                                value={`${formatTimeAgo(join.timestamp)} (${new Date(
                                    join.timestamp
                                ).toLocaleString()})`}
                            />
                            {join.serverId && (
                                <DetailRow label="Server ID" value={join.serverId} />
                            )}
                        </div>
                    </div>

                    {/* Metadata */}
                    {join.metadata && Object.keys(join.metadata).length > 0 && (
                        <>
                            <CDivider />
                            <div>
                                <div
                                    style={{
                                        fontSize: 14,
                                        color: "#b9bbbe",
                                        marginBottom: 8,
                                        fontWeight: 600,
                                    }}
                                >
                                    Additional Info
                                </div>
                                <div
                                    style={{
                                        background: "rgba(255,255,255,0.05)",
                                        padding: 12,
                                        borderRadius: 6,
                                        fontSize: 13,
                                        fontFamily: "monospace",
                                        color: "#b9bbbe",
                                        overflowX: "auto",
                                    }}
                                >
                                    <pre style={{ margin: 0 }}>
                                        {JSON.stringify(join.metadata, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </>
                    )}

                    <CDivider />

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {join.messageJumpUrl && (
                            <CButton variant="primary" onClick={handleJumpToMessage} fullWidth>
                                Jump to Message
                            </CButton>
                        )}
                        <CButton variant="danger" onClick={handleDeleteJoin} fullWidth>
                            Delete from History
                        </CButton>
                    </div>
                </div>
            </ModalContent>
        </ModalRoot>
    );
}

// ==================== DETAIL ROW ====================

function DetailRow({ label, value }: { label: string; value: React.ReactNode; }) {
    return (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ color: "#b9bbbe", fontSize: 13 }}>{label}:</span>
            <span style={{ color: "#fff", fontSize: 13, textAlign: "right" }}>{value}</span>
        </div>
    );
}
