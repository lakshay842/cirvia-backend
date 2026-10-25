export interface AuditMeta {
  ip?: string;
  browser?: string;
}

export interface UploadedReportFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export interface ReportTimelineEntry {
  id: string;
  type: 'created' | 'status' | 'note' | 'assignment' | 'attachment' | 'action';
  title: string;
  description?: string;
  performedBy?: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}
