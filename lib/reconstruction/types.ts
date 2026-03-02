export type JobStatus = "queued" | "running" | "succeeded" | "failed";

export interface JobOutputs {
  glbUrl: string;
  usdzUrl?: string;
  previewUrl: string;
}

export interface JobRecord {
  jobId: string;
  status: JobStatus;
  progress: number; // 0-100
  outputs?: JobOutputs;
  error?: string;
  createdAt: number;
  updatedAt: number;
  inputImageCount?: number;
  logs?: string[];
}

export interface CreateJobInput {
  /** Image URLs (e.g. /uploads/xxx.jpg) - resolved from project root */
  imageUrls?: string[];
  /** Multipart form field name for images */
  formField?: string;
}
