export interface ToolError {
  error: true;
  code: string;
  message: string;
  suggestion?: string;
  retryable: boolean;
}

export function toolError(
  code: string,
  message: string,
  opts?: { suggestion?: string; retryable?: boolean }
): ToolError {
  return {
    error: true,
    code,
    message,
    suggestion: opts?.suggestion,
    retryable: opts?.retryable ?? false,
  };
}

export function connectionError(target: string, port: number): ToolError {
  return toolError("CONNECTION_REFUSED", `Cannot reach ${target}:${port}`, {
    suggestion: `Check if the service is running and accessible from this machine.`,
    retryable: true,
  });
}

export function timeoutError(target: string, timeoutMs: number): ToolError {
  return toolError("TIMEOUT", `Request to ${target} timed out after ${timeoutMs}ms`, {
    suggestion: `The service may be overloaded. Try again in a moment.`,
    retryable: true,
  });
}
