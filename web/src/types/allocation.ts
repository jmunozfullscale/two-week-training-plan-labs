export interface AllocationDraft {
  deviceId: number;
  engineerId: number;
  startDate: string;
  endDate: string;
  status: string;
  payload?: string;
}

export type FieldErrors = Record<string, string>;

export type ValidationRule = (draft: AllocationDraft) => FieldErrors;

export interface UseAllocationEditorOptions {
  initialData?: Partial<AllocationDraft>;
  validationRules?: ValidationRule[];
  fetchInitialData?: (signal?: AbortSignal) => Promise<Partial<AllocationDraft>>;
  onSave?: (draft: AllocationDraft, signal?: AbortSignal) => Promise<void>;
  enableAbortOnUnmount?: boolean;
}

export class ValidationError extends Error {
  fieldErrors: FieldErrors;

  constructor(message: string, fieldErrors: FieldErrors) {
    super(message);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}

