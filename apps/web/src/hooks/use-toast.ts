import { toast as baseToast, type HeadlessToastInput } from "@/lib/toast";

type ToastOptions = Omit<HeadlessToastInput, "title">;

function messageToast(title: string, options?: ToastOptions) {
  return baseToast.headless({
    title,
    ...options,
  });
}

const toastApi = {
  headless: (input: HeadlessToastInput) => baseToast.headless(input),
  message: (title: string, options?: ToastOptions) =>
    messageToast(title, options),
  success: (title: string, options?: ToastOptions) =>
    messageToast(title, { ...options, variant: "success" }),
  error: (title: string, options?: ToastOptions) =>
    messageToast(title, { ...options, variant: "error" }),
  info: (title: string, options?: ToastOptions) =>
    messageToast(title, { ...options, variant: "info" }),
  warning: (title: string, options?: ToastOptions) =>
    messageToast(title, { ...options, variant: "warning" }),
  dismiss: (id?: string | number) => baseToast.dismiss(id),
};

type UseToast = (() => typeof toastApi) & typeof toastApi;

const useToast = Object.assign(() => toastApi, toastApi) as UseToast;

export { useToast };
