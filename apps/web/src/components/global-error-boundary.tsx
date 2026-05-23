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

function GlobalErrorFallback({ resetErrorBoundary }: FallbackProps) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6 py-10 text-foreground">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,var(--color-primary)/0.22,transparent_34%),radial-gradient(circle_at_bottom_right,var(--color-destructive)/0.16,transparent_32%)]" />
      <div className="absolute top-12 left-1/2 -z-10 h-48 w-48 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

      <section className="w-full max-w-xl rounded-3xl border border-border/70 bg-card/85 p-6 shadow-2xl shadow-primary/10 backdrop-blur sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive">
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
          <Button className="h-11 gap-2" onClick={resetErrorBoundary}>
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

        <div className="mt-8 rounded-2xl border border-border/70 bg-muted/40 p-4 text-xs leading-5 text-muted-foreground">
          If reloading does not help, retry later. Your browser session is still
          intact, but unsaved changes on this page may need to be entered again.
        </div>
      </section>
    </main>
  );
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
