/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { React } from "@webpack/common";

import { CButton, CButtonProps, CInput, CInputProps, CSelect, CSelectProps } from "./BaseComponents";

// ==================== STYLED INPUT ====================

export type StyledInputProps = CInputProps;

/**
 * Input estilizado - apenas um alias para CInput
 */
export function StyledInput(props: StyledInputProps) {
    return <CInput {...props} />;
}

// ==================== STYLED SELECT ====================

export type StyledSelectProps = CSelectProps;

/**
 * Select estilizado - apenas um alias para CSelect
 */
export function StyledSelect(props: StyledSelectProps) {
    return <CSelect {...props} />;
}

// ==================== STYLED BUTTON ====================

export type StyledButtonProps = CButtonProps;

/**
 * Button estilizado - apenas um alias para CButton
 */
export function StyledButton(props: StyledButtonProps) {
    return <CButton {...props} />;
}
