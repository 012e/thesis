import { useForm } from "@tanstack/react-form";
import { useRouter, useSearch, Link } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { resetPassword } from "@/lib/auth";
import { useEffect } from "react";

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    ),
  confirmPassword: z.string(),
});

export function ResetPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const search = useSearch({ strict: false }) as { token?: string };
  // Derive error state directly from the search token to avoid calling
  // setState synchronously inside an effect (react-hooks/set-state-in-effect).
  const hasError = !search.token;

  useEffect(() => {
    if (!search.token) {
      // show a notification when token is missing/invalid
      toast.error("Invalid reset link", {
        description: "Please request a new password reset link",
      });
      // Do not call setHasError here to avoid synchronous state updates
      // inside the effect body — the initial state already reflects
      // whether the token is present.
    }
  }, [search.token]);

  const form = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      if (value.password !== value.confirmPassword) {
        toast.error("Password mismatch", {
          description: "Passwords do not match",
        });
        return;
      }

      if (!search.token) {
        toast.error("Invalid reset link", {
          description: "Please request a new password reset link",
        });
        return;
      }

      try {
        const success = await resetPassword({
          newPassword: value.password,
          token: search.token,
        });

        if (success) {
          router.navigate({ to: "/auth/login" });
        }
      } catch (error) {
        console.error("Failed to reset password:", error);
        toast.error("Reset failed", {
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        });
      }
    },
  });

  if (hasError) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle>Invalid reset link</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <Link to="/auth/forgot-password">
                <Button className="w-full">Request new link</Button>
              </Link>
              <FieldDescription className="text-center">
                <Link to="/auth/login" className="hover:underline">
                  Back to login
                </Link>
              </FieldDescription>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Reset your password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              <form.Field
                name="password"
                validators={{
                  onChange: ({ value }) => {
                    const result =
                      resetPasswordSchema.shape.password.safeParse(value);
                    if (!result.success) {
                      return result.error.issues[0]?.message;
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>New Password</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <span className="text-sm text-red-500">
                        {field.state.meta.errors.join(", ")}
                      </span>
                    )}
                  </Field>
                )}
              </form.Field>
              <form.Field
                name="confirmPassword"
                validators={{
                  onChangeListenTo: ["password"],
                  onChangeAsyncDebounceMs: 500,
                  onChangeAsync: async ({ value, fieldApi }) => {
                    const password = fieldApi.form.getFieldValue("password");
                    if (value && value !== password) {
                      return "Passwords do not match";
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      Confirm Password
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <span className="text-sm text-red-500">
                        {field.state.meta.errors.join(", ")}
                      </span>
                    )}
                  </Field>
                )}
              </form.Field>
              <Field>
                <form.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                >
                  {([canSubmit, isSubmitting]) => (
                    <Button type="submit" disabled={!canSubmit || isSubmitting}>
                      {isSubmitting ? "Resetting..." : "Reset password"}
                    </Button>
                  )}
                </form.Subscribe>
                <FieldDescription className="text-center">
                  <Link to="/auth/login" className="hover:underline">
                    Back to login
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
