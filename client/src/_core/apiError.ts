/**
 * API Error Handling — Retry logic, backoff, and error classification
 */

export type ApiErrorType =
  | "network"
  | "timeout"
  | "auth"
  | "validation"
  | "rate_limit"
  | "server"
  | "unknown";

export class ApiError extends Error {
  constructor(
    message: string,
    public type: ApiErrorType = "unknown",
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Error Classifier ──────────────────────────────────────────────────────

export function classifyError(error: Error | unknown): ApiError {
  if (error instanceof ApiError) return error;

  const message = error instanceof Error ? error.message : String(error);

  // Network errors
  if (
    message.includes("fetch failed") ||
    message.includes("NetworkError") ||
    message.includes("ERR_NETWORK")
  ) {
    return new ApiError("Network connection failed.", "network", undefined, true);
  }

  // Timeout
  if (
    message.includes("timeout") ||
    message.includes("aborted") ||
    message.includes("TimeoutError")
  ) {
    return new ApiError(
      "Request timed out. Please check your connection.",
      "timeout",
      undefined,
      true
    );
  }

  // Auth errors
  if (message.includes("401") || message.includes("Unauthorized")) {
    return new ApiError(
      "Your session has expired. Please log in again.",
      "auth",
      401,
      false
    );
  }

  // Rate limiting
  if (message.includes("429") || message.includes("Too Many Requests")) {
    return new ApiError(
      "Too many requests. Please slow down and try again.",
      "rate_limit",
      429,
      true
    );
  }

  // Validation errors
  if (message.includes("400") || message.includes("Bad Request")) {
    return new ApiError(
      "Invalid input. Please check and try again.",
      "validation",
      400,
      false
    );
  }

  // Server errors
  if (message.includes("500") || message.includes("Internal Server Error")) {
    return new ApiError(
      "Server error. Our team has been notified.",
      "server",
      500,
      true
    );
  }

  return new ApiError(message, "unknown", undefined, true);
}

// ─── Retry Logic ───────────────────────────────────────────────────────────

interface RetryOptions {
  maxAttempts?: number;
  backoffMs?: number; // Initial backoff
  maxBackoffMs?: number; // Max backoff
  backoffMultiplier?: number; // Exponential backoff multiplier
  jitter?: boolean; // Add randomness to prevent thundering herd
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  backoffMs: 1000,
  maxBackoffMs: 10000,
  backoffMultiplier: 2,
  jitter: true,
};

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error | null = null;
  let backoff = opts.backoffMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const apiError = classifyError(lastError);

      // Don't retry non-retryable errors
      if (!apiError.retryable) {
        throw apiError;
      }

      // Last attempt - throw
      if (attempt === opts.maxAttempts) {
        throw apiError;
      }

      // Calculate backoff
      let delay = backoff;
      if (opts.jitter) {
        delay = delay * (0.5 + Math.random());
      }
      delay = Math.min(delay, opts.maxBackoffMs);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Exponential backoff for next attempt
      backoff = Math.min(
        backoff * opts.backoffMultiplier,
        opts.maxBackoffMs
      );
    }
  }

  throw lastError || new ApiError("Max retries exceeded", "unknown");
}

// ─── Fetch with Retry ──────────────────────────────────────────────────────

export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return retryWithBackoff(
    async () => {
      const response = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(30000), // 30s timeout
      });

      if (!response.ok) {
        const error = new Error(
          `HTTP ${response.status}: ${response.statusText}`
        );
        (error as any).status = response.status;
        throw error;
      }

      return response;
    },
    retryOptions
  );
}

// ─── Error Recovery Suggestions ───────────────────────────────────────────

export function getErrorRecoverySuggestion(error: ApiError): string {
  switch (error.type) {
    case "network":
      return "Check your internet connection and try again.";
    case "timeout":
      return "Your connection is slow. Try again in a moment.";
    case "auth":
      return "Log in again to continue.";
    case "rate_limit":
      return "Wait a minute and try again.";
    case "validation":
      return "Please check your input and try again.";
    case "server":
      return "Try again in a few moments.";
    default:
      return "Please try again.";
  }
}

// ─── HTTP Status Helpers ──────────────────────────────────────────────────

export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

export function isClientError(status: number): boolean {
  return status >= 400 && status < 500;
}

export function isServerError(status: number): boolean {
  return status >= 500;
}

export function isRetryableStatus(status: number): boolean {
  return (
    status === 408 || // Request timeout
    status === 429 || // Too many requests
    (status >= 500 && status < 600) // Server errors
  );
}
