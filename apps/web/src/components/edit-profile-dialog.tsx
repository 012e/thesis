import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateProfile } from "@/lib/auth/update-profile";

const editProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  image: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues: {
    name: string;
    image?: string;
  };
  onSuccess?: () => void;
}

export function EditProfileDialog({
  open,
  onOpenChange,
  defaultValues,
  onSuccess,
}: EditProfileDialogProps) {
  const form = useForm({
    defaultValues: {
      name: defaultValues.name,
      image: defaultValues.image || "",
    },
    onSubmit: async ({ value }) => {
      const success = await updateProfile({
        name: value.name,
        image: value.image || undefined,
      });

      if (success) {
        onOpenChange(false);
        onSuccess?.();
      }
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
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
                  const result = editProfileSchema.shape.name.safeParse(value);
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
              name="image"
              validators={{
                onChange: ({ value }) => {
                  if (!value) return undefined;
                  const result = editProfileSchema.shape.image.safeParse(value);
                  if (!result.success) {
                    return result.error.issues[0]?.message;
                  }
                  return undefined;
                },
              }}
            >
              {(field) => (
                <Field>
                  <FieldLabel htmlFor={field.name}>
                    Profile Image URL
                  </FieldLabel>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="url"
                    placeholder="https://example.com/image.jpg"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldDescription>
                    Enter a URL to your profile image (optional)
                  </FieldDescription>
                  {field.state.meta.errors.length > 0 && (
                    <span className="text-sm text-red-500">
                      {field.state.meta.errors.join(", ")}
                    </span>
                  )}
                </Field>
              )}
            </form.Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
            >
              {([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              )}
            </form.Subscribe>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
