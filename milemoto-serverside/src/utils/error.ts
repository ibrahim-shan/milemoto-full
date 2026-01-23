export class AppError extends Error {
  public status: number;
  public code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function httpError(status: number, code: string, message: string): AppError {
  return new AppError(status, code, message);
}
