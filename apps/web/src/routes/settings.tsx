import { useForm } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  IconBan,
  IconHash,
  IconLock,
  IconStar,
  IconX,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { TagPreferenceDto, TagPreferenceKindDto } from "@repo/shared-dto";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PageSpinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSession } from "@/hooks/use-session";
import {
  useDeleteTagPreference,
  useSetTagPreference,
  useTagPreferences,
} from "@/hooks/use-tag-preferences";
import { useTagSuggestions } from "@/hooks/use-tag-suggestions";
import { useToast as toast } from "@/hooks/use-toast";
import { changePassword, updateProfile } from "@/lib/auth";
import { formatDate } from "@/components/admin/types";
import { setGlobalAIContext } from "@/lib/atoms/ai-context";

const settingsSearchSchema = z.object({
  tab: z.enum(["account-security", "interests"]).optional(),
});

export const Route = createFileRoute("/settings")({
  validateSearch: settingsSearchSchema,
  beforeLoad: () => {
    setGlobalAIContext({
      type: "page",
      page: "setting",
      label: "Setting",
    });
  },
  component: SettingsPage,
});

const displayNameSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    ),
  confirmPassword: z.string(),
});

type SessionUser = NonNullable<ReturnType<typeof useSession>["data"]>["user"];

function SettingsPage() {
  const { data: session, isPending, refetch } = useSession();
  const { tab = "account-security" } = Route.useSearch();
  const navigate = useNavigate({ from: "/settings" });

  if (isPending || !session) {
    return <PageSpinner />;
  }

  const handleTabChange = (nextTab: "account-security" | "interests") => {
    void navigate({
      search: { tab: nextTab === "account-security" ? undefined : nextTab },
      replace: true,
    });
  };

  return (
    <main className="flex flex-col gap-5 p-4 sm:p-5">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        </div>
      </header>

      <Tabs value={tab} className="gap-4">
        <TabsList
          variant="line"
          className="flex h-auto max-w-full flex-wrap justify-start gap-1"
        >
          <TabsTrigger
            value="account-security"
            className="px-2.5 py-1.5"
            onClick={() => handleTabChange("account-security")}
          >
            <IconLock />
            Account & Security
          </TabsTrigger>
          <TabsTrigger
            value="interests"
            className="px-2.5 py-1.5"
            onClick={() => handleTabChange("interests")}
          >
            <IconHash />
            Interests
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="account-security"
          className="space-y-4 text-sm/relaxed"
        >
          <AccountSecurityTab user={session.user} onSessionRefresh={refetch} />
        </TabsContent>
        <TabsContent value="interests" className="space-y-4 text-sm/relaxed">
          <InterestsTab />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function InterestsTab() {
  const [query, setQuery] = useState("");
  const preferences = useTagPreferences();
  const suggestions = useTagSuggestions(query.trim(), 8);
  const setPreference = useSetTagPreference();
  const deletePreference = useDeleteTagPreference();

  const selectedPreferenceBySlug = useMemo(() => {
    const map = new Map<string, TagPreferenceKindDto>();
    for (const tag of preferences.data?.preferred ?? []) {
      map.set(tag.slug, "preferred");
    }
    for (const tag of preferences.data?.blocked ?? []) {
      map.set(tag.slug, "blocked");
    }
    return map;
  }, [preferences.data]);

  const handleSetPreference = (
    slug: string,
    preference: TagPreferenceKindDto,
  ) => {
    setPreference.mutate(
      { slug, preference },
      {
        onSuccess: (updated) => {
          if (!updated) {
            toast.error("Tag not found");
            return;
          }
          toast.success(
            preference === "preferred" ? "Tag preferred" : "Tag blocked",
          );
          setQuery("");
        },
        onError: (error: Error) => toast.error(error.message),
      },
    );
  };

  const handleRemovePreference = (slug: string) => {
    deletePreference.mutate(slug, {
      onSuccess: () => toast.success("Tag preference removed"),
      onError: (error: Error) => toast.error(error.message),
    });
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Preferred Tags</CardTitle>
          <CardDescription>
            Topics you want to see more often in personalized feeds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PreferenceList
            tags={preferences.data?.preferred ?? []}
            emptyLabel="No preferred tags yet."
            onRemove={handleRemovePreference}
            isPending={deletePreference.isPending}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Blocked Tags</CardTitle>
          <CardDescription>
            Topics hidden from For you and Following feeds.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PreferenceList
            tags={preferences.data?.blocked ?? []}
            emptyLabel="No blocked tags yet."
            onRemove={handleRemovePreference}
            isPending={deletePreference.isPending}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Tag</CardTitle>
          <CardDescription>
            Search existing tags and choose how they should shape your feed.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="relative">
            <IconHash className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tags"
              className="pl-9"
            />
          </div>
          <div className="divide-y border">
            {query.trim().length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                Type a tag name to add it.
              </div>
            ) : suggestions.isLoading ? (
              <div className="p-4 text-sm text-muted-foreground">
                Searching tags...
              </div>
            ) : suggestions.isError ? (
              <div className="p-4 text-sm text-destructive">
                Failed to search tags.
              </div>
            ) : (suggestions.data?.items ?? []).length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground">
                No matching tags.
              </div>
            ) : (
              suggestions.data?.items.map((tag) => {
                const currentPreference = selectedPreferenceBySlug.get(
                  tag.slug,
                );
                const isPending =
                  setPreference.isPending &&
                  setPreference.variables?.slug === tag.slug;

                return (
                  <div
                    key={tag.slug}
                    className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">#{tag.displayName}</span>
                        {currentPreference && (
                          <Badge variant="secondary">{currentPreference}</Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tag.postCount} {tag.postCount === 1 ? "post" : "posts"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          currentPreference === "preferred"
                            ? "default"
                            : "outline"
                        }
                        disabled={isPending}
                        onClick={() =>
                          handleSetPreference(tag.slug, "preferred")
                        }
                      >
                        <IconStar />
                        Prefer
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          currentPreference === "blocked"
                            ? "destructive"
                            : "outline"
                        }
                        disabled={isPending}
                        onClick={() => handleSetPreference(tag.slug, "blocked")}
                      >
                        <IconBan />
                        Block
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PreferenceList({
  tags,
  emptyLabel,
  onRemove,
  isPending,
}: {
  tags: TagPreferenceDto[];
  emptyLabel: string;
  onRemove: (slug: string) => void;
  isPending: boolean;
}) {
  if (tags.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge
          key={tag.slug}
          variant="secondary"
          className="gap-1.5 py-1 pr-1 pl-2"
        >
          #{tag.displayName}
          <button
            type="button"
            className="p-0.5 hover:bg-muted-foreground/15 disabled:opacity-50"
            disabled={isPending}
            onClick={() => onRemove(tag.slug)}
            aria-label={`Remove ${tag.displayName}`}
          >
            <IconX className="size-3.5" />
          </button>
        </Badge>
      ))}
    </div>
  );
}

function AccountSecurityTab({
  user,
  onSessionRefresh,
}: {
  user: SessionUser;
  onSessionRefresh: () => void;
}) {
  const nameForm = useForm({
    defaultValues: {
      name: user.name || "",
    },
    onSubmit: async ({ value }) => {
      const success = await updateProfile({ name: value.name });
      if (success) {
        onSessionRefresh();
      }
    },
  });

  const passwordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      if (value.newPassword !== value.confirmPassword) {
        toast.error("Password mismatch", {
          description: "New password and confirmation do not match",
        });
        return;
      }

      const success = await changePassword({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
        revokeOtherSessions: true,
      });

      if (success) {
        passwordForm.reset();
      }
    },
  });

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Account Overview</CardTitle>
          <CardDescription>
            Basic identity information from your authenticated session.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <AccountRow label="Display name" value={user.name || "Not set"} />
          <AccountRow label="Email" value={user.email || "Not set"} />
          <AccountRow label="Account ID" value={user.id} />
          <AccountRow label="Created" value={formatDate(user.createdAt)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile Identity</CardTitle>
          <CardDescription>
            Update the display name attached to your account and shown in the
            app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              nameForm.handleSubmit();
            }}
          >
            <FieldGroup>
              <nameForm.Field
                name="name"
                validators={{
                  onChange: ({ value }) => {
                    const result =
                      displayNameSchema.shape.name.safeParse(value);
                    return result.success
                      ? undefined
                      : result.error.issues[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>Display name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="text"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                    {field.state.meta.errors.length > 0 && (
                      <span className="text-xs text-destructive">
                        {field.state.meta.errors.join(", ")}
                      </span>
                    )}
                  </Field>
                )}
              </nameForm.Field>

              <Field>
                <nameForm.Subscribe
                  selector={(state) => [state.canSubmit, state.isSubmitting]}
                >
                  {([canSubmit, isSubmitting]) => (
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={!canSubmit || isSubmitting}
                      >
                        {isSubmitting ? "Saving..." : "Save display name"}
                      </Button>
                    </div>
                  )}
                </nameForm.Subscribe>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Change your password. Other sessions are revoked after a successful
            update.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              passwordForm.handleSubmit();
            }}
          >
            <FieldGroup>
              <passwordForm.Field
                name="currentPassword"
                validators={{
                  onChange: ({ value }) => {
                    const result =
                      passwordSchema.shape.currentPassword.safeParse(value);
                    return result.success
                      ? undefined
                      : result.error.issues[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      Current password
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                    {field.state.meta.errors.length > 0 && (
                      <span className="text-xs text-destructive">
                        {field.state.meta.errors.join(", ")}
                      </span>
                    )}
                  </Field>
                )}
              </passwordForm.Field>

              <passwordForm.Field
                name="newPassword"
                validators={{
                  onChange: ({ value }) => {
                    const result =
                      passwordSchema.shape.newPassword.safeParse(value);
                    return result.success
                      ? undefined
                      : result.error.issues[0]?.message;
                  },
                }}
              >
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>New password</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                    {field.state.meta.errors.length > 0 && (
                      <span className="text-xs text-destructive">
                        {field.state.meta.errors.join(", ")}
                      </span>
                    )}
                  </Field>
                )}
              </passwordForm.Field>

              <passwordForm.Field
                name="confirmPassword"
                validators={{
                  onChangeListenTo: ["newPassword"],
                  onChangeAsyncDebounceMs: 500,
                  onChangeAsync: async ({ value, fieldApi }) => {
                    const newPassword =
                      fieldApi.form.getFieldValue("newPassword");
                    return value && value !== newPassword
                      ? "Passwords do not match"
                      : undefined;
                  },
                }}
              >
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor={field.name}>
                      Confirm new password
                    </FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      type="password"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                    />
                    {field.state.meta.errors.length > 0 && (
                      <span className="text-xs text-destructive">
                        {field.state.meta.errors.join(", ")}
                      </span>
                    )}
                  </Field>
                )}
              </passwordForm.Field>

              <Field>
                <passwordForm.Subscribe
                  selector={(state) =>
                    [
                      state.values.currentPassword,
                      state.values.newPassword,
                      state.values.confirmPassword,
                      state.isSubmitting,
                    ] as const
                  }
                >
                  {([
                    currentPassword,
                    newPassword,
                    confirmPassword,
                    isSubmitting,
                  ]) => {
                    const canSubmit =
                      currentPassword.length > 0 &&
                      passwordSchema.shape.newPassword.safeParse(newPassword)
                        .success &&
                      confirmPassword === newPassword;

                    return (
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={!canSubmit || isSubmitting}
                        >
                          {isSubmitting ? "Changing..." : "Change password"}
                        </Button>
                      </div>
                    );
                  }}
                </passwordForm.Subscribe>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AccountRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_1fr] sm:items-center">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="break-all text-sm">{value}</div>
    </div>
  );
}
