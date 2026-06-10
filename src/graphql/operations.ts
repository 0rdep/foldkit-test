export const FlowDefinitionsQueryText = `#graphql
query FlowDefinitions($documentType: FlowDocumentType) {
  Flow {
    definitions(documentType: $documentType) {
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
    editableFields
    approval {
      allowSelfApproval
      onRejectedTransitionId
      rules {
        id
        minAmount
        onApprovedTransitionId
        approvers {
          type
          userId
          roleId
        }
      }
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
mutation UpdateFlowDraft($flowId: ID!, $input: UpdateFlowDraftInput!) {
  Flow {
    updateDraft(flowId: $flowId, input: $input) {
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
    editableFields
    approval {
      allowSelfApproval
      onRejectedTransitionId
      rules {
        id
        minAmount
        onApprovedTransitionId
        approvers {
          type
          userId
          roleId
        }
      }
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
mutation PublishFlow($flowId: ID!) {
  Flow {
    publish(flowId: $flowId) {
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
    editableFields
    approval {
      allowSelfApproval
      onRejectedTransitionId
      rules {
        id
        minAmount
        onApprovedTransitionId
        approvers {
          type
          userId
          roleId
        }
      }
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
