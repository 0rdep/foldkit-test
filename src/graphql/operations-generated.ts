import * as Types from './generated'

export type CompanyFindManyQuery = {
  readonly Company: {
    readonly findMany: {
      readonly items: ReadonlyArray<{
        readonly id: number
        readonly name: string
        readonly active: boolean
      }>
    }
  }
}

export type FlowDefinitionFieldsFragment = {
  readonly id: string
  readonly companyId: number | null
  readonly documentType: Types.FlowDocumentType
  readonly name: string
  readonly version: number
  readonly state: Types.FlowDefinitionState
  readonly initialStatusId: string
  readonly statuses: ReadonlyArray<{
    readonly id: string
    readonly name: string
    readonly kind: Types.FlowStatusKind
    readonly editableActions: ReadonlyArray<{
      readonly action: Types.FlowEditableAction
      readonly allowedRoles: ReadonlyArray<string>
    }>
  }>
  readonly transitions: ReadonlyArray<{
    readonly id: string
    readonly label: string
    readonly fromStatusId: string
    readonly toStatusId: string
    readonly allowedRoles: ReadonlyArray<string>
    readonly requiresComment: boolean | null
    readonly sortOrder: string
  }>
}

export type FlowDefinitionsQuery = {
  readonly Flow: {
    readonly definitions: ReadonlyArray<FlowDefinitionFieldsFragment>
  }
}

export type FlowDefinitionsQueryVariables = {
  readonly documentType?: Types.FlowDocumentType | null
  readonly companyId?: string | null
}

export type FlowDefinitionHistoryQuery = {
  readonly Flow: {
    readonly history: ReadonlyArray<FlowDefinitionFieldsFragment>
  }
}

export type FlowDefinitionHistoryQueryVariables = {
  readonly flowId: string
  readonly companyId?: string | null
}

export type UpdateFlowDraftMutation = {
  readonly Flow: { readonly updateDraft: FlowDefinitionFieldsFragment }
}

export type PublishFlowMutation = {
  readonly Flow: { readonly publish: FlowDefinitionFieldsFragment }
}

export type ArchiveFlowMutation = {
  readonly Flow: { readonly archive: FlowDefinitionFieldsFragment }
}
