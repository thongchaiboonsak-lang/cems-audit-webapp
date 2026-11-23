export type AuditType = 'RATA' | 'CORRELATION' | 'BOTH';

export type ItemScope = 'COMMON' | 'RATA' | 'CORRELATION';

export type CheckStatus = 'PENDING' | 'PASS' | 'FAIL' | 'NA';

export type StageNumber = 1 | 2 | 3 | 4;

export interface ChecklistItemDef {
  id: string;
  code: string;
  stage: StageNumber;
  appliesTo: ItemScope;
  title: string;
  shortTooltip: string;
  howToCheck: string[];
  passCriteria: string;
  photoGuide: string;
  watchOut: string;
  requirePhoto: boolean;
  referenceStandard: string;
  isCustom?: boolean;
}

export interface EvidencePhoto {
  id: string;
  photoCode: string; // e.g., IMG-01
  dataUrl: string; // compressed JPEG data URL (with optional watermark)
  caption: string;
  capturedAt: string; // ISO string
  watermarkApplied: boolean;
}

export interface AuditResponse {
  itemId: string;
  status: CheckStatus;
  remark: string;
  measuredValue?: string;
  photos: EvidencePhoto[];
  checkedAt?: string;
}

export interface SignatureBlock {
  name: string;
  position: string;
  company: string;
  dataUrl: string; // PNG data URL from canvas
  signedAt?: string;
}

export interface AuditJobMetadata {
  docNumber: string;
  companyName: string;
  plantName: string;
  stackName: string;
  auditType: AuditType;
  parameters: string[];
  auditDate: string;
  subcontractorName: string;
  subcontractorRegNo: string;
  subcontractorLead: string;
  workersTopCount: string;
  workersBottomCount: string;
  vehicleCount: string;
  vehicleTypes: string;
  inspectorName: string;
  inspectorDept: string;
  overallConclusion: 'PASS' | 'PASS_WITH_CONDITION' | 'FAIL' | 'IN_PROGRESS';
  overallSummaryNote: string;
}

export interface AuditRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string;
  driveFolderUrl?: string;
  metadata: AuditJobMetadata;
  responses: Record<string, AuditResponse>;
  inspectorSignature: SignatureBlock;
  subcontractorSignature: SignatureBlock;
  approverSignature?: SignatureBlock;
}

export interface GoogleSheetConfig {
  webAppUrl: string;
  autoWatermark: boolean;
  uploadPhotosToDrive: boolean;
  defaultCompanyName: string;
  companyLogoDataUrl?: string;
}
