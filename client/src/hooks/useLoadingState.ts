import { useState, useCallback } from "react";
import { toast } from "sonner";

interface UseLoadingStateOptions {
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (err: unknown) => void;
}

/**
 * Thin wrapper that tracks whether an async operation is running and
 * surfaces toast notifications on completion / failure.
 */
export function useLoadingState(options: UseLoadingStateOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);

  const run = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
      setIsLoading(true);
      setIsSuccess(false);
      setIsError(false);
      try {
        const result = await fn();
        setIsSuccess(true);
        if (options.successMessage) toast.success(options.successMessage);
        options.onSuccess?.();
        // Reset success flag after brief visual feedback
        setTimeout(() => setIsSuccess(false), 2000);
        return result;
      } catch (err) {
        setIsError(true);
        const msg = options.errorMessage ?? (err instanceof Error ? err.message : "Ocurrió un error");
        toast.error(msg);
        options.onError?.(err);
        setTimeout(() => setIsError(false), 3000);
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options.successMessage, options.errorMessage]
  );

  return { isLoading, isSuccess, isError, run };
}
