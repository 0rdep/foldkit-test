export const CompanyFindManyQueryText = `#graphql
query CompanyFindMany {
  Company {
    findMany {
      items {
        id
        name
        active
      }
    }
  }
}
`

export const FlowDefinitionsQueryText = `#graphql
query FlowDefinitions($documentType: FlowDocumentType, $companyId: ID) {
  Flow {
    definitions(documentType: $documentType, companyId: $companyId) {
      ...FlowDefinitionFields
    }
  }
}

fragment FlowDefinitionFields on FlowDefinition {
  id
  companyId
  documentType
  name
  version
  state
  initialStatusId
  statuses {
    id
    name
    kind
    editableActions {
      action
      allowedRoles
    }
  }
  transitions {
    id
    label
    fromStatusId
    toStatusId
    allowedRoles
    requiresComment
    sortOrder
  }
}
`

export const UpdateFlowDraftMutationText = `#graphql
mutation UpdateFlowDraft($flowId: ID!, $input: UpdateFlowDraftInput!, $companyId: ID) {
  Flow {
    updateDraft(flowId: $flowId, input: $input, companyId: $companyId) {
      ...FlowDefinitionFields
    }
  }
}

fragment FlowDefinitionFields on FlowDefinition {
  id
  companyId
  documentType
  name
  version
  state
  initialStatusId
  statuses {
    id
    name
    kind
    editableActions {
      action
      allowedRoles
    }
  }
  transitions {
    id
    label
    fromStatusId
    toStatusId
    allowedRoles
    requiresComment
    sortOrder
  }
}
`

export const FlowDefinitionHistoryQueryText = `#graphql
query FlowDefinitionHistory($flowId: ID!, $companyId: ID) {
  Flow {
    history(flowId: $flowId, companyId: $companyId) {
      ...FlowDefinitionFields
    }
  }
}

fragment FlowDefinitionFields on FlowDefinition {
  id
  companyId
  documentType
  name
  version
  state
  initialStatusId
  statuses {
    id
    name
    kind
    editableActions {
      action
      allowedRoles
    }
  }
  transitions {
    id
    label
    fromStatusId
    toStatusId
    allowedRoles
    requiresComment
    sortOrder
  }
}
`

export const PublishFlowMutationText = `#graphql
mutation PublishFlow($flowId: ID!, $companyId: ID) {
  Flow {
    publish(flowId: $flowId, companyId: $companyId) {
      ...FlowDefinitionFields
    }
  }
}

fragment FlowDefinitionFields on FlowDefinition {
  id
  companyId
  documentType
  name
  version
  state
  initialStatusId
  statuses {
    id
    name
    kind
    editableActions {
      action
      allowedRoles
    }
  }
  transitions {
    id
    label
    fromStatusId
    toStatusId
    allowedRoles
    requiresComment
    sortOrder
  }
}
`
