/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import * as Types from './generated';

export type FlowDefinitionState =
  | 'archived'
  | 'draft'
  | 'published';

export type FlowDocumentType =
  | 'order'
  | 'requisition';

export type FlowEditableField =
  | 'attachments'
  | 'deliveryDate'
  | 'discount'
  | 'items'
  | 'note';

export type FlowStatusKind =
  | 'approval'
  | 'draft'
  | 'final'
  | 'normal';

export type FlowDefinitionFieldsFragment = { readonly id: string, readonly companyId: number | null, readonly documentType: Types.FlowDocumentType, readonly name: string, readonly version: number, readonly state: Types.FlowDefinitionState, readonly initialStatusId: string, readonly statuses: ReadonlyArray<{ readonly id: string, readonly name: string, readonly kind: Types.FlowStatusKind, readonly editableFields: ReadonlyArray<Types.FlowEditableField>, readonly approval: { readonly allowSelfApproval: boolean, readonly onRejectedTransitionId: string | null, readonly rules: ReadonlyArray<{ readonly id: string, readonly minAmount: number | null, readonly onApprovedTransitionId: string, readonly approvers: ReadonlyArray<{ readonly type: string, readonly userId: number | null, readonly roleId: string | null }> }> } | null }>, readonly transitions: ReadonlyArray<{ readonly id: string, readonly label: string, readonly fromStatusId: string, readonly toStatusId: string, readonly allowedRoles: ReadonlyArray<string>, readonly requiresComment: boolean | null, readonly sortOrder: string }> };

export type FlowRuntimeStateFieldsFragment = { readonly documentId: number, readonly documentType: Types.FlowDocumentType, readonly flowId: string, readonly flowVersion: number, readonly currentStatus: { readonly id: string, readonly name: string, readonly kind: Types.FlowStatusKind, readonly editableFields: ReadonlyArray<Types.FlowEditableField>, readonly approval: { readonly allowSelfApproval: boolean, readonly onRejectedTransitionId: string | null, readonly rules: ReadonlyArray<{ readonly id: string, readonly minAmount: number | null, readonly onApprovedTransitionId: string, readonly approvers: ReadonlyArray<{ readonly type: string, readonly userId: number | null, readonly roleId: string | null }> }> } | null }, readonly editPolicy: { readonly editableFields: ReadonlyArray<Types.FlowEditableField>, readonly editableItemIds: ReadonlyArray<number>, readonly canDelete: boolean, readonly canDuplicate: boolean }, readonly availableTransitions: ReadonlyArray<{ readonly id: string, readonly label: string, readonly toStatusId: string, readonly toStatusName: string }>, readonly blockedTransitions: ReadonlyArray<{ readonly id: string, readonly label: string, readonly reason: string }>, readonly pendingApproval: { readonly statusId: string, readonly approvalRuleId: string, readonly recordedApprovals: number, readonly canCurrentUserApprove: boolean, readonly canCurrentUserReject: boolean } | null };

export type FlowDefinitionsQueryVariables = Exact<{
  documentType: Types.FlowDocumentType | null | undefined;
}>;


export type FlowDefinitionsQuery = { readonly Flow: { readonly definitions: ReadonlyArray<{ readonly id: string, readonly companyId: number | null, readonly documentType: Types.FlowDocumentType, readonly name: string, readonly version: number, readonly state: Types.FlowDefinitionState, readonly initialStatusId: string, readonly statuses: ReadonlyArray<{ readonly id: string, readonly name: string, readonly kind: Types.FlowStatusKind, readonly editableFields: ReadonlyArray<Types.FlowEditableField>, readonly approval: { readonly allowSelfApproval: boolean, readonly onRejectedTransitionId: string | null, readonly rules: ReadonlyArray<{ readonly id: string, readonly minAmount: number | null, readonly onApprovedTransitionId: string, readonly approvers: ReadonlyArray<{ readonly type: string, readonly userId: number | null, readonly roleId: string | null }> }> } | null }>, readonly transitions: ReadonlyArray<{ readonly id: string, readonly label: string, readonly fromStatusId: string, readonly toStatusId: string, readonly allowedRoles: ReadonlyArray<string>, readonly requiresComment: boolean | null, readonly sortOrder: string }> }> } };

export type RequisitionFlowStateQueryVariables = Exact<{
  requisitionId: number;
}>;


export type RequisitionFlowStateQuery = { readonly Flow: { readonly requisitionState: { readonly documentId: number, readonly documentType: Types.FlowDocumentType, readonly flowId: string, readonly flowVersion: number, readonly currentStatus: { readonly id: string, readonly name: string, readonly kind: Types.FlowStatusKind, readonly editableFields: ReadonlyArray<Types.FlowEditableField>, readonly approval: { readonly allowSelfApproval: boolean, readonly onRejectedTransitionId: string | null, readonly rules: ReadonlyArray<{ readonly id: string, readonly minAmount: number | null, readonly onApprovedTransitionId: string, readonly approvers: ReadonlyArray<{ readonly type: string, readonly userId: number | null, readonly roleId: string | null }> }> } | null }, readonly editPolicy: { readonly editableFields: ReadonlyArray<Types.FlowEditableField>, readonly editableItemIds: ReadonlyArray<number>, readonly canDelete: boolean, readonly canDuplicate: boolean }, readonly availableTransitions: ReadonlyArray<{ readonly id: string, readonly label: string, readonly toStatusId: string, readonly toStatusName: string }>, readonly blockedTransitions: ReadonlyArray<{ readonly id: string, readonly label: string, readonly reason: string }>, readonly pendingApproval: { readonly statusId: string, readonly approvalRuleId: string, readonly recordedApprovals: number, readonly canCurrentUserApprove: boolean, readonly canCurrentUserReject: boolean } | null } } };

export type OrderFlowStateQueryVariables = Exact<{
  orderId: number;
}>;


export type OrderFlowStateQuery = { readonly Flow: { readonly orderState: { readonly documentId: number, readonly documentType: Types.FlowDocumentType, readonly flowId: string, readonly flowVersion: number, readonly currentStatus: { readonly id: string, readonly name: string, readonly kind: Types.FlowStatusKind, readonly editableFields: ReadonlyArray<Types.FlowEditableField>, readonly approval: { readonly allowSelfApproval: boolean, readonly onRejectedTransitionId: string | null, readonly rules: ReadonlyArray<{ readonly id: string, readonly minAmount: number | null, readonly onApprovedTransitionId: string, readonly approvers: ReadonlyArray<{ readonly type: string, readonly userId: number | null, readonly roleId: string | null }> }> } | null }, readonly editPolicy: { readonly editableFields: ReadonlyArray<Types.FlowEditableField>, readonly editableItemIds: ReadonlyArray<number>, readonly canDelete: boolean, readonly canDuplicate: boolean }, readonly availableTransitions: ReadonlyArray<{ readonly id: string, readonly label: string, readonly toStatusId: string, readonly toStatusName: string }>, readonly blockedTransitions: ReadonlyArray<{ readonly id: string, readonly label: string, readonly reason: string }>, readonly pendingApproval: { readonly statusId: string, readonly approvalRuleId: string, readonly recordedApprovals: number, readonly canCurrentUserApprove: boolean, readonly canCurrentUserReject: boolean } | null } } };
