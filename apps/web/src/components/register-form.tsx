import { useForm } from "@tanstack/react-form";
import { useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { z } from "zod";
import { useToast as toast } from "@/hooks/use-toast";
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
import { register } from "@/lib/auth";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_.]+$/,
      "Username can only contain letters, numbers, underscores, and dots",
    ),
  email: z.email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    ),
  confirmPassword: z.string(),
});

/** How long the success animation plays before navigating to onboarding. */
const SUCCESS_REDIRECT_MS = 2100;

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [succeeded, setSucceeded] = useState(false);

  // Once registration succeeds, let the celebration animation play, then route
  // the new user into onboarding.
  useEffect(() => {
    if (!succeeded) return;
    const timer = setTimeout(() => {
      router.navigate({ to: "/onboarding" });
    }, SUCCESS_REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [succeeded, router]);

  const form = useForm({
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    canSubmitWhenInvalid: true,
    onSubmit: async ({ value }) => {
      const result = registerSchema.safeParse(value);
      if (!result.success) {
        return;
      }

      if (result.data.password !== result.data.confirmPassword) {
        toast.error("Password mismatch", {
          description: "Passwords do not match",
        });
        return;
      }

      try {
        const success = await register({
          name: result.data.name,
          username: result.data.username,
          email: result.data.email,
          password: result.data.password,
        });

        if (success) {
          // Trigger the success animation; the redirect effect navigates to
          // onboarding once it has played (also giving the auth client time to
          // settle session state before AuthGuard runs on the next route).
          setSucceeded(true);
        }
      } catch (error) {
        console.error("Registration failed:", error);
        toast.error("Registration failed", {
          description:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
        });
      }
    },
  });

  return (
    <>
      <AnimatePresence>
        {succeeded && <RegisterSuccessOverlay />}
      </AnimatePresence>
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            Enter your information below to create your account
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
                name="name"
                validators={{
                  onChange: ({ value }) => {
                    const result = registerSchema.shape.name.safeParse(value);
                    if (!result.success) {
                      return result.error.issues[0]?.message;
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="text"
                      placeholder="John Doe"
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
                name="username"
                validators={{
                  onChange: ({ value }) => {
                    const result =
                      registerSchema.shape.username.safeParse(value);
                    if (!result.success) {
                      return result.error.issues[0]?.message;
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Username</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="text"
                      placeholder="johndoe"
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
                name="email"
                validators={{
                  onChange: ({ value }) => {
                    const result = registerSchema.shape.email.safeParse(value);
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
              <form.Field
                name="password"
                validators={{
                  onChange: ({ value }) => {
                    const result =
                      registerSchema.shape.password.safeParse(value);
                    if (!result.success) {
                      return result.error.issues[0]?.message;
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Password</FieldLabel>
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
                  selector={(state) =>
                    [state.values, state.isSubmitting] as const
                  }
                >
                  {([values, isSubmitting]) => {
                    const isValid =
                      registerSchema.safeParse(values).success &&
                      values.password === values.confirmPassword;

                    return (
                      <Button type="submit" disabled={!isValid || isSubmitting}>
                        {isSubmitting
                          ? "Creating account..."
                          : "Create account"}
                      </Button>
                    );
                  }}
                </form.Subscribe>
                <Button variant="outline" type="button">
                  Sign up with Google
                </Button>
                <FieldDescription className="text-center">
                  Already have an account?{" "}
                  <Link to="/auth/login" className="hover:underline">
                    Login
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
        </Card>
      </div>
    </>
  );
}

/**
 * Full-screen celebration shown the moment registration succeeds. A spring-in
 * badge with a drawn checkmark, a pulsing ring, staggered copy, and a progress
 * bar whose fill is timed to the redirect into onboarding.
 */
function RegisterSuccessOverlay() {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-7 bg-background/95 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="relative flex items-center justify-center">
        {/* Pulsing rings radiating out from the badge */}
        {[0, 0.35].map((delay) => (
          <motion.span
            key={delay}
            className="absolute size-24 rounded-full bg-primary/20"
            initial={{ scale: 0.5, opacity: 0.6 }}
            animate={{ scale: 2, opacity: 0 }}
            transition={{
              duration: 1.6,
              ease: "easeOut",
              delay: 0.5 + delay,
              repeat: Infinity,
              repeatDelay: 0.4,
            }}
          />
        ))}

        {/* Badge springs in */}
        <motion.div
          className="relative flex size-24 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/30"
          initial={{ scale: 0, rotate: -12, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 18 }}
        >
          <svg
            viewBox="0 0 100 100"
            className="size-16 text-primary"
            fill="none"
          >
            <motion.circle
              cx="50"
              cy="50"
              r="44"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              initial={{ pathLength: 0, opacity: 0.4 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.7, ease: "easeInOut", delay: 0.15 }}
            />
            <motion.path
              d="M30 51 L44 65 L72 35"
              stroke="currentColor"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.6 }}
            />
          </svg>
        </motion.div>
      </div>

      {/* Staggered copy */}
      <motion.div
        className="flex flex-col items-center gap-1.5 text-center"
        initial="hidden"
        animate="visible"
        variants={{
          visible: { transition: { staggerChildren: 0.12, delayChildren: 0.8 } },
        }}
      >
        <motion.h2
          className="text-xl font-semibold"
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
          }}
        >
          You're all set!
        </motion.h2>
        <motion.p
          className="max-w-xs text-sm text-muted-foreground"
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
          }}
        >
          Taking you to a quick setup so we can personalize your experience…
        </motion.p>
      </motion.div>

      {/* Progress bar timed to the redirect */}
      <div className="h-0.5 w-48 overflow-hidden bg-border">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{
            duration: SUCCESS_REDIRECT_MS / 1000,
            ease: "easeInOut",
          }}
        />
      </div>
    </motion.div>
  );
}
