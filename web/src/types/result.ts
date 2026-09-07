export type SuccessResult<T = void> = [T] extends [void]
  ? { success: true }
  : { success: true; data: T };

export type FailureResult = {
  success: false;
  error: string;
};

export type Result<T = void> = SuccessResult<T> | FailureResult;
