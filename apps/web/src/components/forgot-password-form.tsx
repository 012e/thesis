import { useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
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
import { requestPasswordReset } from "@/lib/auth";
import { useState } from "react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const [emailSent, setEmailSent] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const success = await requestPasswordReset({
          email: value.email,
        });

        if (success) {
          setEmailSent(true);
        }
      } catch (error) {
        console.error("Failed to request password reset:", error);
        toast.error("Request failed", {
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        });
      }
    },
  });

  if (emailSent) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardHeader>
            <CardTitle>Check your email</CardTitle>
            <CardDescription>
              We&apos;ve sent you a password reset link. Please check your inbox
              and follow the instructions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <FieldDescription className="text-center">
                Didn&apos;t receive the email?{" "}
                <button
                  onClick={() => setEmailSent(false)}
                  className="hover:underline"
                >
                  Try again
                </button>
              </FieldDescription>
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
          <CardTitle>Forgot your password?</CardTitle>
          <CardDescription>
            Enter your email address and we&apos;ll send you a link to reset
            your password
          </CardDescription>
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
                name="email"
                validators={{
                  onChange: ({ value }) => {
                    const result =
                      forgotPasswordSchema.shape.email.safeParse(value);
                    if (!result.success) {
                      return result.error.issues[0]?.message;
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="email"
                      placeholder="m@example.com"
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
                      {isSubmitting ? "Sending..." : "Send reset link"}
                    </Button>
                  )}
                </form.Subscribe>
                <FieldDescription className="text-center">
                  Remember your password?{" "}
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
