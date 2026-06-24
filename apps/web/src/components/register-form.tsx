import { useForm } from "@tanstack/react-form";
import { useRouter, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { z } from "zod";
import { IconArrowRight } from "@tabler/icons-react";
import { Mascot } from "@/components/mascot";
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

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const [welcomeName, setWelcomeName] = useState<string | null>(null);

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
          setWelcomeName(result.data.name.trim().split(/\s+/)[0] ?? "there");
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
        {welcomeName && (
          <RegisterSuccessOverlay
            name={welcomeName}
            onContinue={() => router.navigate({ to: "/onboarding" })}
          />
        )}
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
                      const result =
                        registerSchema.shape.email.safeParse(value);
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
                        <Button
                          type="submit"
                          disabled={!isValid || isSubmitting}
                        >
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

function RegisterSuccessOverlay({
  name,
  onContinue,
}: {
  name: string;
  onContinue: () => void;
}) {
  const shouldReduceMotion = useReducedMotion();
  const [step, setStep] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [helloPlayKey, setHelloPlayKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setHelloPlayKey(1), 120);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isStarting) return;

    const timer = setTimeout(onContinue, shouldReduceMotion ? 150 : 700);
    return () => clearTimeout(timer);
  }, [isStarting, onContinue, shouldReduceMotion]);

  const isIntroduction = step === 0;
  const dialogue = isIntroduction
    ? `Hey, ${name}! I’m Toin. Welcome — I’ve been waiting to meet you.`
    : "I’ll ask a few quick questions, then shape your feed around what you care about.";

  return (
    <motion.div
      aria-describedby="welcome-description"
      aria-labelledby="welcome-title"
      aria-modal="true"
      className="fixed inset-0 z-50 overflow-hidden bg-background"
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="dialog"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 flex h-12 items-center justify-between border-b px-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:px-8"
      >
        <span>New player joined</span>
        <span>Toin // Guide</span>
      </div>

      <motion.div
        className="absolute bottom-44 left-4 z-10 sm:bottom-48 sm:left-10"
        initial={shouldReduceMotion ? false : { opacity: 0, x: -90, y: 24 }}
        animate={{
          opacity: isStarting ? 0 : 1,
          x: 0,
          y: isStarting ? -20 : 0,
        }}
        transition={
          isStarting
            ? { duration: 0.35 }
            : { type: "spring", stiffness: 140, damping: 18, delay: 0.1 }
        }
      >
        <Mascot
          activity={
            isStarting ? "celebrate" : isIntroduction ? "hello" : "bounce"
          }
          className="size-28 drop-shadow-[5px_7px_0_var(--border)] sm:size-36"
          label="Toin, your onboarding guide"
          playKey={isStarting ? 3 : isIntroduction ? helloPlayKey : 2}
        />
      </motion.div>

      <motion.section
        className="absolute inset-x-4 bottom-4 border-2 bg-background shadow-[6px_6px_0_var(--foreground)] sm:inset-x-8 sm:bottom-8"
        initial={shouldReduceMotion ? false : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: shouldReduceMotion ? 0 : 0.25 }}
      >
        <div className="flex h-8 items-center justify-between border-b bg-muted px-3">
          <h2
            className="text-xs font-semibold uppercase tracking-[0.2em]"
            id="welcome-title"
          >
            Toin
          </h2>
          <span className="text-[10px] text-muted-foreground">
            {step + 1} / 2
          </span>
        </div>

        <div className="flex min-h-28 flex-col justify-between gap-4 px-4 py-4 sm:min-h-32 sm:flex-row sm:items-end sm:px-6 sm:py-5">
          <AnimatePresence mode="wait">
            <motion.p
              aria-live="polite"
              className="max-w-3xl text-sm leading-relaxed sm:text-base"
              id="welcome-description"
              key={step}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
            >
              {dialogue}
            </motion.p>
          </AnimatePresence>

          <Button
            autoFocus
            className="h-9 shrink-0 px-4"
            disabled={isStarting}
            onClick={() => {
              if (isIntroduction) {
                setStep(1);
                return;
              }
              setIsStarting(true);
            }}
          >
            {isStarting
              ? "Let’s go!"
              : isIntroduction
                ? "Hi, Toin"
                : "Start onboarding"}
            <IconArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </motion.section>

      <motion.span
        aria-hidden="true"
        className="absolute bottom-2 right-2 size-2 bg-primary sm:bottom-4 sm:right-4"
        animate={
          shouldReduceMotion || isStarting ? undefined : { opacity: [0, 1, 0] }
        }
        transition={{ duration: 1.1, repeat: Infinity }}
      />
    </motion.div>
  );
}
