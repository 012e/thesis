"use client";

import { type ReactNode } from "react";
import {
  Toaster,
  toast as sonnerToast,
  type ToasterProps,
  type ExternalToast,
} from "sonner";

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
} & ExternalToast;

type HeadlessToastProps = {
  id: ToastId;
  title: ReactNode;
  description?: ReactNode;
  action?: HeadlessAction;
  cancel?: HeadlessAction;
};

function HeadlessToast({
  id,
  title,
  description,
  action,
  cancel,
}: HeadlessToastProps) {
  return (
    <div className="w-full rounded-lg border border-border bg-background p-4 shadow-lg md:max-w-[420px]">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {description ? (
            <div className="mt-1 text-sm text-muted-foreground">{description}</div>
          ) : null}
        </div>
        {action ? (
          <button
            type="button"
            className="shrink-0 rounded-md bg-primary/10 px-3 py-1 text-sm font-medium text-primary transition-colors hover:bg-primary/15"
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
        />
      ),
      options,
    );
  },
});

export { Toaster, toast, type ToasterProps, type HeadlessToastInput };
