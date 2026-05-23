import type { ReactNode } from "react";
import {
  ErrorBoundary,
  type ErrorBoundaryPropsWithFallback,
  type FallbackProps,
} from "react-error-boundary";
import { AlertTriangle, RefreshCcw, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

type GlobalErrorBoundaryProps = {
  children: ReactNode;
};

export function GlobalErrorPage({ onRetry }: { onRetry: () => void }) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6 py-10 text-foreground">
      <div className="absolute inset-0 -z-10" />
      <div className="absolute top-12 left-1/2 -z-10 h-48 w-48 -translate-x-1/2 blur-3xl" />

      <section className="w-full max-w-xl p-6 backdrop-blur sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center border border-destructive/20 bg-destructive/10 text-destructive">
            <AlertTriangle className="size-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.24em] text-muted-foreground uppercase">
              Unexpected error
            </p>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Something went wrong
            </h1>
          </div>
        </div>

        <p className="text-sm leading-6 text-muted-foreground sm:text-base">
          The page ran into a problem and could not continue safely. Please try
          again, reload the page, or come back later if the issue keeps
          happening.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <Button className="h-11 gap-2" onClick={onRetry}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Try again
          </Button>
          <Button
            className="h-11 gap-2"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            <RefreshCcw className="size-4" aria-hidden="true" />
            Reload page
          </Button>
        </div>
      </section>
    </main>
  );
}

function GlobalErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return <GlobalErrorPage onRetry={resetErrorBoundary} />;
}

const handleGlobalError: ErrorBoundaryPropsWithFallback["onError"] = (
  error,
  errorInfo,
) => {
  console.error("Unhandled React error", error, errorInfo.componentStack);
};

export function GlobalErrorBoundary({ children }: GlobalErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={GlobalErrorFallback}
      onError={handleGlobalError}
    >
      {children}
    </ErrorBoundary>
  );
}
