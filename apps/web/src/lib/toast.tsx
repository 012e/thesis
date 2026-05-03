"use client";

import { type ReactNode } from "react";
import {
  Toaster,
  toast as sonnerToast,
  type ToasterProps,
  type ExternalToast,
} from "sonner";
import { IconX } from "@tabler/icons-react";

type ToastId = string | number;

type HeadlessAction = {
  label: string;
  onClick: () => void;
};

type HeadlessToastInput = {
  title: ReactNode;
  description?: ReactNode;
  action?: HeadlessAction;
  cancel?: HeadlessAction;
  variant?: "default" | "success" | "error" | "info" | "warning";
} & ExternalToast;

type HeadlessToastProps = {
  id: ToastId;
  title: ReactNode;
  description?: ReactNode;
  action?: HeadlessAction;
  cancel?: HeadlessAction;
  variant?: "default" | "success" | "error" | "info" | "warning";
};

const variantStyles: Record<
  NonNullable<HeadlessToastProps["variant"]>,
  {
    container: string;
    action: string;
  }
> = {
  default: {
    container: "border-border bg-background text-foreground",
    action: "bg-primary/10 text-primary hover:bg-primary/15",
  },
  success: {
    container: "border-emerald-600 bg-emerald-50 text-emerald-900",
    action: "bg-emerald-200 text-emerald-900 hover:bg-emerald-300",
  },
  error: {
    container: "border-rose-700 bg-rose-50 text-rose-900",
    action: "bg-rose-200 text-rose-900 hover:bg-rose-300",
  },
  info: {
    container: "border-sky-700 bg-sky-50 text-sky-900",
    action: "bg-sky-200 text-sky-900 hover:bg-sky-300",
  },
  warning: {
    container: "border-amber-700 bg-amber-50 text-amber-900",
    action: "bg-amber-200 text-amber-900 hover:bg-amber-300",
  },
};

function HeadlessToast({
  id,
  title,
  description,
  action,
  cancel,
  variant = "default",
}: HeadlessToastProps) {
  const style = variantStyles[variant];

  return (
    <div
      className={`w-full border p-4 shadow-lg md:max-w-[420px] ${style.container}`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          {description ? (
            <div className="mt-1 text-sm opacity-85">{description}</div>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Dismiss notification"
          className="shrink-0 p-1 opacity-70 transition-opacity hover:opacity-100"
          onClick={() => {
            sonnerToast.dismiss(id);
          }}
        >
          <IconX className="size-4" />
        </button>
        {action ? (
          <button
            type="button"
            className={`shrink-0 px-3 py-1 text-sm font-medium transition-colors ${style.action}`}
            onClick={() => {
              action.onClick();
              sonnerToast.dismiss(id);
            }}
          >
            {action.label}
          </button>
        ) : null}
      </div>
      {cancel ? (
        <button
          type="button"
          className="mt-3 text-xs text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => {
            cancel.onClick();
            sonnerToast.dismiss(id);
          }}
        >
          {cancel.label}
        </button>
      ) : null}
    </div>
  );
}

const toast = Object.assign(sonnerToast, {
  headless(toastInput: HeadlessToastInput) {
    const { title, description, action, cancel, ...options } = toastInput;

    return sonnerToast.custom(
      (id) => (
        <HeadlessToast
          id={id}
          title={title}
          description={description}
          action={action}
          cancel={cancel}
          variant={variant}
        />
      ),
      options,
    );
  },
});

export { Toaster, toast, type ToasterProps, type HeadlessToastInput };
