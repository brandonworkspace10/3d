/**
 * Pipeline node types and data shapes for the 3D product pipeline.
 */

export type ProcessingStatus = "idle" | "processing" | "complete" | "error";

export type PipelineNodeType =
  | "imageUpload"
  | "backgroundRemover"
  | "lighting"
  | "generate3d"
  | "spinVideo"
  | "backgroundReplace";

export type ValidationErrorType = "blur" | "resolution" | "angles";

export interface ValidationError {
  imageId: string;
  type: ValidationErrorType;
  message: string;
}

export type ValidationStatus = "idle" | "validating" | "passed" | "failed";

export interface ImageUploadData extends Record<string, unknown> {
  label: string;
  images: {
    id: string;
    url: string;
    name: string;
    size: number;
  }[];
  validation: {
    status: ValidationStatus;
    errors: ValidationError[];
  };
}

export interface BackgroundRemoverData extends Record<string, unknown> {
  label: string;
  status: ProcessingStatus;
  inputUrls: string[];
  outputUrls: string[];
  error?: string;
}

export interface LightingData extends Record<string, unknown> {
  label: string;
  status: ProcessingStatus;
  inputUrls: string[];
  outputUrls: string[];
  error?: string;
  validationMessage?: string;
}

export interface Generate3DData extends Record<string, unknown> {
  label: string;
  status: ProcessingStatus;
  progress: number;
  outputs: {
    glb?: string;
    usdz?: string;
    viewerUrl?: string;
  };
  error?: string;
}

export interface SpinVideoData extends Record<string, unknown> {
  label: string;
  status: ProcessingStatus;
  videoUrl?: string;
  error?: string;
  validationMessage?: string;
}

export interface BackgroundReplaceData extends Record<string, unknown> {
  label: string;
  status: ProcessingStatus;
  backgroundUrl?: string;
  renderUrl?: string;
  error?: string;
  validationMessage?: string;
}

export interface PromptNodeData extends Record<string, unknown> {
  label: string;
  parentType: "lighting" | "spinVideo" | "backgroundReplace";
  prompt: string;
  promptMissing?: boolean;
}

/** Output from the pipeline execution - represents the final result. */
export type PipelineOutputKind = "3d" | "video" | "image";

export interface PipelineOutputData extends Record<string, unknown> {
  label: string;
  status: "idle" | "complete" | "error";
  kind?: PipelineOutputKind;
  error?: string;
  /** 3D outputs (glb, usdz, viewerUrl) */
  outputs3d?: Generate3DData["outputs"];
  /** Video URL from spin render */
  videoUrl?: string;
  /** Rendered image URL from background replace */
  renderUrl?: string;
}

/** Which source node types can connect to which target node types. */
export const ALLOWED_CONNECTIONS: Record<PipelineNodeType, PipelineNodeType[]> = {
  imageUpload: ["backgroundRemover", "lighting", "generate3d"],
  backgroundRemover: ["lighting", "generate3d"],
  lighting: ["generate3d"],
  generate3d: ["spinVideo", "backgroundReplace"],
  spinVideo: [],
  backgroundReplace: [],
};

export function canConnect(
  sourceType: PipelineNodeType,
  targetType: PipelineNodeType
): boolean {
  return ALLOWED_CONNECTIONS[sourceType]?.includes(targetType) ?? false;
}
