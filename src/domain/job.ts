// bisiyata dishmaya, leharbot ahava biyisral
export type JobKind = 'illustration' | 'colouring' | 'coverIllustration';
export type JobTarget = { kind: 'story'; pageId: string } | { kind: 'cover' };
export type JobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'paused';
export type JobStep = 'pending' | 'generating' | 'postprocessing' | 'saving' | 'done';

export interface Job {
  id: string;
  batchId: string;
  bookId: string;
  kind: JobKind;
  target: JobTarget;
  overwrite: boolean;
  dependsOnJobId: string | null;
  status: JobStatus;
  step: JobStep;
  attempts: number;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export type JobBatchState = 'running' | 'paused' | 'completed' | 'cancelled';

export interface JobBatch {
  id: string;
  bookId: string;
  jobIds: string[];
  createdAt: string;
  state: JobBatchState;
  pauseReason?: string;
}
