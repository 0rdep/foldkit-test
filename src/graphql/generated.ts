export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

/** A boolean setting. */
export type BooleanSetting = {
  readonly __typename?: 'BooleanSetting';
  readonly type: BooleanSettingType;
  readonly value: Scalars['Boolean']['output'];
};

/** Single-value enums for strict literal typing */
export type BooleanSettingType =
  | 'boolean';

export type CompaniesFindManyOutput = {
  readonly __typename?: 'CompaniesFindManyOutput';
  readonly items: ReadonlyArray<Company>;
};

export type Company = {
  readonly __typename?: 'Company';
  readonly active: Scalars['Boolean']['output'];
  readonly id: Scalars['Int']['output'];
  readonly logoImageLink: Maybe<Scalars['String']['output']>;
  readonly name: Scalars['String']['output'];
  readonly pdfFooterText: Maybe<Scalars['String']['output']>;
  readonly signatureImageLink: Maybe<Scalars['String']['output']>;
  readonly supplierIds: ReadonlyArray<Scalars['Int']['output']>;
  readonly taxId: Maybe<Scalars['String']['output']>;
  readonly useCompanyCatalog: Scalars['Boolean']['output'];
};

export type CompanyQueries = {
  readonly __typename?: 'CompanyQueries';
  /** Get a company by id. */
  readonly byId: Company;
  /** Get companies visible to the current user. */
  readonly findMany: CompaniesFindManyOutput;
};


export type CompanyQueriesByIdArgs = {
  companyId: Scalars['ID']['input'];
};

export type CompanySettingsMutations = {
  readonly __typename?: 'CompanySettingsMutations';
  /** Update company settings. Replaces all provided settings. */
  readonly update: CompanySettingsOutput;
};


export type CompanySettingsMutationsUpdateArgs = {
  input: UpdateCompanySettingsInput;
};

export type CompanySettingsOutput = {
  readonly __typename?: 'CompanySettingsOutput';
  readonly companyId: Scalars['ID']['output'];
  readonly settings: Settings;
  readonly updatedAt: Maybe<Scalars['String']['output']>;
  readonly updatedBy: Maybe<Scalars['String']['output']>;
};

export type CompanySettingsQueries = {
  readonly __typename?: 'CompanySettingsQueries';
  /** Get all settings for a company. Returns defaults for unconfigured settings. */
  readonly find: CompanySettingsOutput;
};


export type CompanySettingsQueriesFindArgs = {
  companyId: Scalars['ID']['input'];
};

export type CreateFlowDefinitionInput = {
  readonly deliveryAutomation: InputMaybe<FlowDeliveryAutomationDefinitionInput>;
  readonly documentType: FlowDocumentType;
  readonly initialStatusId: Scalars['ID']['input'];
  readonly name: Scalars['String']['input'];
  readonly statuses: ReadonlyArray<FlowStatusDefinitionInput>;
  readonly transitions: ReadonlyArray<FlowTransitionDefinitionInput>;
};

export type DuplicateOrderInput = {
  readonly dropOffContactId: InputMaybe<Scalars['Int']['input']>;
  readonly orderId: Scalars['Int']['input'];
  readonly projectId: Scalars['Int']['input'];
};

export type DuplicateOrderOutput = {
  readonly __typename?: 'DuplicateOrderOutput';
  readonly orderId: Scalars['Int']['output'];
};

export type ExecuteFlowTransitionInput = {
  readonly comment: InputMaybe<Scalars['String']['input']>;
};

export type FlowAvailableTransition = {
  readonly __typename?: 'FlowAvailableTransition';
  readonly id: Scalars['ID']['output'];
  readonly label: Scalars['String']['output'];
  readonly toStatusId: Scalars['ID']['output'];
  readonly toStatusName: Scalars['String']['output'];
};

export type FlowBlockedEditableAction = {
  readonly __typename?: 'FlowBlockedEditableAction';
  readonly action: FlowEditableAction;
  readonly reason: Scalars['String']['output'];
};

export type FlowBlockedTransition = {
  readonly __typename?: 'FlowBlockedTransition';
  readonly id: Scalars['ID']['output'];
  readonly label: Scalars['String']['output'];
  readonly reason: Scalars['String']['output'];
};

export type FlowDefinition = {
  readonly __typename?: 'FlowDefinition';
  readonly companyId: Maybe<Scalars['Int']['output']>;
  readonly deliveryAutomation: Maybe<FlowDeliveryAutomationDefinition>;
  readonly documentType: FlowDocumentType;
  readonly id: Scalars['ID']['output'];
  readonly initialStatusId: Scalars['ID']['output'];
  readonly name: Scalars['String']['output'];
  readonly state: FlowDefinitionState;
  readonly statuses: ReadonlyArray<FlowStatusDefinition>;
  readonly transitions: ReadonlyArray<FlowTransitionDefinition>;
  readonly version: Scalars['Int']['output'];
};

export type FlowDeliveryAutomationDefinition = {
  readonly __typename?: 'FlowDeliveryAutomationDefinition';
  readonly enabled: Scalars['Boolean']['output'];
  readonly fullyDeliveredStatusId: Scalars['ID']['output'];
  readonly partiallyDeliveredCompletionRequiredStatusId: Scalars['ID']['output'];
  readonly partiallyDeliveredStatusId: Scalars['ID']['output'];
};

export type FlowDeliveryAutomationDefinitionInput = {
  readonly enabled: Scalars['Boolean']['input'];
  readonly fullyDeliveredStatusId: Scalars['ID']['input'];
  readonly partiallyDeliveredCompletionRequiredStatusId: Scalars['ID']['input'];
  readonly partiallyDeliveredStatusId: Scalars['ID']['input'];
};

export type FlowDefinitionState =
  | 'archived'
  | 'draft'
  | 'published';

export type FlowDocumentType =
  | 'order'
  | 'requisition';

export type FlowEditableAction =
  | 'ORDER_DELETE'
  | 'ORDER_DELIVERY_DATE'
  | 'ORDER_DISCOUNT'
  | 'ORDER_ITEM_EDIT'
  | 'ORDER_NOTE'
  | 'ORDER_SHIPMENTS'
  | 'ORDER_SUB_COMPANY'
  | 'ORDER_SUPPLIER'
  | 'REQUISITION_ATTACHMENTS'
  | 'REQUISITION_CREATE_ORDER'
  | 'REQUISITION_DELETE'
  | 'REQUISITION_DELIVERY_DATE'
  | 'REQUISITION_DISCOUNT'
  | 'REQUISITION_ITEM_EDIT'
  | 'REQUISITION_NOTE';

export type FlowEditableActionDefinition = {
  readonly __typename?: 'FlowEditableActionDefinition';
  readonly action: FlowEditableAction;
  readonly allowedRoles: ReadonlyArray<Scalars['String']['output']>;
};

export type FlowEditableActionDefinitionInput = {
  readonly action: FlowEditableAction;
  readonly allowedRoles: ReadonlyArray<Scalars['String']['input']>;
};

export type FlowMutations = {
  readonly __typename?: 'FlowMutations';
  /** Archive the active published version. */
  readonly archive: FlowDefinition;
  /** Create a company-owned flow definition draft. */
  readonly create: FlowDefinition;
  /** Execute an order transition and return the updated runtime state. */
  readonly executeOrderTransition: FlowRuntimeState;
  /** Execute a requisition transition and return the updated runtime state. */
  readonly executeRequisitionTransition: FlowRuntimeState;
  /** Publish the current draft version. */
  readonly publish: FlowDefinition;
  /** Update the current draft or create the next draft version. */
  readonly updateDraft: FlowDefinition;
};


export type FlowMutationsArchiveArgs = {
  companyId: InputMaybe<Scalars['ID']['input']>;
  flowId: Scalars['ID']['input'];
};


export type FlowMutationsCreateArgs = {
  companyId: InputMaybe<Scalars['ID']['input']>;
  input: CreateFlowDefinitionInput;
};


export type FlowMutationsExecuteOrderTransitionArgs = {
  input: InputMaybe<ExecuteFlowTransitionInput>;
  orderId: Scalars['Int']['input'];
  transitionId: Scalars['ID']['input'];
};


export type FlowMutationsExecuteRequisitionTransitionArgs = {
  input: InputMaybe<ExecuteFlowTransitionInput>;
  requisitionId: Scalars['Int']['input'];
  transitionId: Scalars['ID']['input'];
};


export type FlowMutationsPublishArgs = {
  companyId: InputMaybe<Scalars['ID']['input']>;
  flowId: Scalars['ID']['input'];
};


export type FlowMutationsUpdateDraftArgs = {
  companyId: InputMaybe<Scalars['ID']['input']>;
  flowId: Scalars['ID']['input'];
  input: UpdateFlowDraftInput;
};

export type FlowQueries = {
  readonly __typename?: 'FlowQueries';
  /** Get available flow definitions. If documentType is omitted, returns all default definitions. */
  readonly definitions: ReadonlyArray<FlowDefinition>;
  /** Get all persisted versions for a flow definition. */
  readonly history: ReadonlyArray<FlowDefinition>;
  /** Get evaluated flow state for an order. */
  readonly orderState: Maybe<FlowRuntimeState>;
  /** Get evaluated flow state for a requisition. */
  readonly requisitionState: Maybe<FlowRuntimeState>;
};


export type FlowQueriesDefinitionsArgs = {
  companyId: InputMaybe<Scalars['ID']['input']>;
  documentType: InputMaybe<FlowDocumentType>;
};


export type FlowQueriesHistoryArgs = {
  companyId: InputMaybe<Scalars['ID']['input']>;
  flowId: Scalars['ID']['input'];
};


export type FlowQueriesOrderStateArgs = {
  orderId: Scalars['Int']['input'];
};


export type FlowQueriesRequisitionStateArgs = {
  requisitionId: Scalars['Int']['input'];
};

export type FlowRuntimeEditPolicy = {
  readonly __typename?: 'FlowRuntimeEditPolicy';
  readonly blockedActions: ReadonlyArray<FlowBlockedEditableAction>;
  readonly editableActions: ReadonlyArray<FlowEditableAction>;
  readonly editableItemIds: ReadonlyArray<Scalars['Int']['output']>;
};

export type FlowRuntimeState = {
  readonly __typename?: 'FlowRuntimeState';
  readonly availableTransitions: ReadonlyArray<FlowAvailableTransition>;
  readonly blockedTransitions: ReadonlyArray<FlowBlockedTransition>;
  readonly currentStatus: FlowStatusDefinition;
  readonly documentId: Scalars['Int']['output'];
  readonly documentType: FlowDocumentType;
  readonly editPolicy: FlowRuntimeEditPolicy;
  readonly flowId: Scalars['ID']['output'];
  readonly flowVersion: Scalars['Int']['output'];
};

export type FlowStatusDefinition = {
  readonly __typename?: 'FlowStatusDefinition';
  readonly editableActions: ReadonlyArray<FlowEditableActionDefinition>;
  readonly id: Scalars['ID']['output'];
  readonly kind: FlowStatusKind;
  readonly name: Scalars['String']['output'];
};

export type FlowStatusDefinitionInput = {
  readonly editableActions: ReadonlyArray<FlowEditableActionDefinitionInput>;
  readonly id: Scalars['ID']['input'];
  readonly kind: FlowStatusKind;
  readonly name: Scalars['String']['input'];
};

export type FlowStatusKind =
  | 'draft'
  | 'final'
  | 'normal';

export type FlowTransitionDefinition = {
	readonly __typename?: 'FlowTransitionDefinition';
	readonly allowedRoles: ReadonlyArray<Scalars['String']['output']>;
	readonly automationOnly: Maybe<Scalars['Boolean']['output']>;
	readonly fromStatusId: Scalars['ID']['output'];
  readonly id: Scalars['ID']['output'];
  readonly toStatusId: Scalars['ID']['output'];
};

export type FlowTransitionDefinitionInput = {
	readonly allowedRoles: ReadonlyArray<Scalars['String']['input']>;
	readonly automationOnly: InputMaybe<Scalars['Boolean']['input']>;
	readonly fromStatusId: Scalars['ID']['input'];
  readonly id: Scalars['ID']['input'];
  readonly toStatusId: Scalars['ID']['input'];
};

export type GenerateShipmentPdfFromSourceImagesInput = {
  readonly imageKeys: ReadonlyArray<Scalars['String']['input']>;
  readonly orderId: Scalars['Int']['input'];
  readonly shipmentId: Scalars['Int']['input'];
  readonly type: ShipmentDocumentType;
};

export type GenerateShipmentPdfFromSourceImagesOutput = {
  readonly __typename?: 'GenerateShipmentPdfFromSourceImagesOutput';
  readonly url: Scalars['String']['output'];
};

export type GenerateShipmentPdfFromStagedSourceImagesInput = {
  readonly clientUploadId: Scalars['String']['input'];
  readonly imageKeys: ReadonlyArray<Scalars['String']['input']>;
  readonly orderId: Scalars['Int']['input'];
  readonly shipmentId: Scalars['Int']['input'];
  readonly type: ShipmentDocumentType;
};

export type GenerateShipmentPdfFromStagedSourceImagesOutput = {
  readonly __typename?: 'GenerateShipmentPdfFromStagedSourceImagesOutput';
  readonly url: Scalars['String']['output'];
};

export type Mutation = {
  readonly __typename?: 'Mutation';
  readonly CompanySettings: CompanySettingsMutations;
  readonly Flow: FlowMutations;
  readonly Order: OrderMutations;
  readonly Shipment: ShipmentMutations;
};

/** A number setting. */
export type NumberSetting = {
  readonly __typename?: 'NumberSetting';
  readonly type: NumberSettingType;
  readonly value: Scalars['Float']['output'];
};

export type NumberSettingType =
  | 'number';

/** An option (select) setting. */
export type OptionSetting = {
  readonly __typename?: 'OptionSetting';
  readonly options: ReadonlyArray<Scalars['String']['output']>;
  readonly type: OptionSettingType;
  readonly value: Scalars['String']['output'];
};

export type OptionSettingType =
  | 'option';

export type OrderMutations = {
  readonly __typename?: 'OrderMutations';
  /** Duplicate an order with the same configuration and items. */
  readonly duplicate: DuplicateOrderOutput;
};


export type OrderMutationsDuplicateArgs = {
  input: DuplicateOrderInput;
};

export type PrepareShipmentSourceImageUploadInput = {
  readonly mimeType: ShipmentSourceImageMimeType;
  readonly orderId: Scalars['Int']['input'];
  readonly shipmentId: Scalars['Int']['input'];
  readonly type: ShipmentDocumentType;
};

export type PrepareShipmentSourceImageUploadOutput = {
  readonly __typename?: 'PrepareShipmentSourceImageUploadOutput';
  readonly key: Scalars['String']['output'];
  readonly uploadUrl: Scalars['String']['output'];
};

export type PrepareStagedShipmentSourceImageUploadInput = {
  readonly clientUploadId: Scalars['String']['input'];
  readonly mimeType: ShipmentSourceImageMimeType;
  readonly orderId: Scalars['Int']['input'];
  readonly type: ShipmentDocumentType;
};

export type PrepareStagedShipmentSourceImageUploadOutput = {
  readonly __typename?: 'PrepareStagedShipmentSourceImageUploadOutput';
  readonly key: Scalars['String']['output'];
  readonly uploadUrl: Scalars['String']['output'];
};

export type Query = {
  readonly __typename?: 'Query';
  readonly Company: CompanyQueries;
  readonly CompanySettings: CompanySettingsQueries;
  readonly Flow: FlowQueries;
};

/** All available settings with their current values. */
export type Settings = {
  readonly __typename?: 'Settings';
  readonly disableCompanyCatalogToggle: BooleanSetting;
  readonly disableShipmentReceiveToggle: BooleanSetting;
  readonly requireShipmentCertificate: BooleanSetting;
  readonly requireShipmentCertificateFix: BooleanSetting;
  readonly requireShipmentMerchandise: BooleanSetting;
};

/** Input for updating settings. All fields are optional - only provided settings will be updated. */
export type SettingsInput = {
  readonly disableCompanyCatalogToggle: InputMaybe<Scalars['Boolean']['input']>;
  readonly disableShipmentReceiveToggle: InputMaybe<Scalars['Boolean']['input']>;
  readonly requireShipmentCertificate: InputMaybe<Scalars['Boolean']['input']>;
  readonly requireShipmentCertificateFix: InputMaybe<Scalars['Boolean']['input']>;
  readonly requireShipmentMerchandise: InputMaybe<Scalars['Boolean']['input']>;
};

export type ShipmentDocumentType =
  | 'certificate'
  | 'certificate_fix'
  | 'merchandise';

export type ShipmentMutations = {
  readonly __typename?: 'ShipmentMutations';
  /**
   * Read previously uploaded source images from S3 and generate a shipment PDF.
   * All imageKeys must be scoped to the orderId/shipmentId/type prefix.
   */
  readonly generatePdfFromSourceImages: GenerateShipmentPdfFromSourceImagesOutput;
  /**
   * Read staged source images from S3 and generate a shipment PDF after shipment
   * creation. All imageKeys must be scoped to the orderId/clientUploadId/type prefix.
   */
  readonly generatePdfFromStagedSourceImages: GenerateShipmentPdfFromStagedSourceImagesOutput;
  /**
   * Generate a presigned S3 PUT URL for uploading a shipment source image.
   * Mobile should PUT the image bytes directly to uploadUrl, then pass the key
   * to generatePdfFromSourceImages.
   */
  readonly prepareSourceImageUpload: PrepareShipmentSourceImageUploadOutput;
  /**
   * Generate a presigned S3 PUT URL for uploading a staged source image before
   * the shipment exists. Mobile should use one clientUploadId per document card.
   */
  readonly prepareStagedSourceImageUpload: PrepareStagedShipmentSourceImageUploadOutput;
};


export type ShipmentMutationsGeneratePdfFromSourceImagesArgs = {
  input: GenerateShipmentPdfFromSourceImagesInput;
};


export type ShipmentMutationsGeneratePdfFromStagedSourceImagesArgs = {
  input: GenerateShipmentPdfFromStagedSourceImagesInput;
};


export type ShipmentMutationsPrepareSourceImageUploadArgs = {
  input: PrepareShipmentSourceImageUploadInput;
};


export type ShipmentMutationsPrepareStagedSourceImageUploadArgs = {
  input: PrepareStagedShipmentSourceImageUploadInput;
};

export type ShipmentSourceImageMimeType =
  | 'jpeg'
  | 'png';

/** A text setting. */
export type TextSetting = {
  readonly __typename?: 'TextSetting';
  readonly type: TextSettingType;
  readonly value: Scalars['String']['output'];
};

export type TextSettingType =
  | 'text';

export type UpdateCompanySettingsInput = {
  readonly companyId: Scalars['ID']['input'];
  readonly settings: SettingsInput;
};

export type UpdateFlowDraftInput = {
  readonly deliveryAutomation: InputMaybe<FlowDeliveryAutomationDefinitionInput>;
  readonly initialStatusId: Scalars['ID']['input'];
  readonly name: InputMaybe<Scalars['String']['input']>;
  readonly statuses: ReadonlyArray<FlowStatusDefinitionInput>;
  readonly transitions: ReadonlyArray<FlowTransitionDefinitionInput>;
};
