import { useState, useCallback, useRef, useEffect } from "react";
import Cropper from "react-easy-crop";
import type { Area, Point } from "react-easy-crop";
import { useForm } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { updateProfile } from "@/lib/auth";
import { uploadImages } from "@/lib/api/uploads";
import { updateAvatar, updateUserProfile } from "@/lib/api/users";

const editProfileSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  bio: z.string().max(500, "Bio must be 500 characters or less").nullable(),
});

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (err) => reject(err));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create image blob"));
          return;
        }
        resolve(new File([blob], "avatar.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  });
}

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  defaultValues: {
    name: string;
    image?: string;
    bio?: string | null;
  };
  onSuccess?: () => void;
}

export function EditProfileDialog({
  open,
  onOpenChange,
  userId: _userId,
  defaultValues,
  onSuccess,
}: EditProfileDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current avatar URL (set after a successful upload)
  const [avatarUrl, setAvatarUrl] = useState(defaultValues.image ?? "");

  // Crop state
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Reset state whenever the dialog opens
  useEffect(() => {
    if (open) {
      setAvatarUrl(defaultValues.image ?? "");
      setRawImageSrc(null);
      setUploadError(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  }, [open, defaultValues.image]);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      setRawImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setUploadError(null);
    });
    reader.readAsDataURL(file);
    // Reset so the same file can be re-selected
    e.target.value = "";
  };

  const handleCropCancel = () => {
    setRawImageSrc(null);
    setUploadError(null);
  };

  const handleCropApply = async () => {
    if (!rawImageSrc || !croppedAreaPixels) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const croppedFile = await getCroppedImg(rawImageSrc, croppedAreaPixels);
      const result = await uploadImages([croppedFile]);
      const uploaded = result.images[0];
      if (uploaded) {
        setAvatarUrl(uploaded.url);
      }
      setRawImageSrc(null);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Upload failed. Please try again.",
      );
    } finally {
      setIsUploading(false);
    }
  };

  const form = useForm({
    defaultValues: {
      name: defaultValues.name,
      bio: defaultValues.bio ?? null,
    },
    onSubmit: async ({ value }) => {
      // Update name via Better Auth (image field intentionally omitted —
      // Better Auth does not persist it to the DB in this project).
      const success = await updateProfile({ name: value.name });

      if (!success) return;

      // Persist bio in our own user_profiles table.
      await updateUserProfile({ bio: value.bio ?? null });

      // Persist avatar separately in our own user_profiles table.
      if (avatarUrl && avatarUrl !== (defaultValues.image ?? "")) {
        await updateAvatar(avatarUrl);
      }

      // Invalidate the profile query so all consumers refresh.
      await queryClient.invalidateQueries();

      onOpenChange(false);
      onSuccess?.();
    },
  });

  // Sync name field when dialog re-opens with different defaultValues
  useEffect(() => {
    if (open) {
      form.setFieldValue("name", defaultValues.name);
      form.setFieldValue("bio", defaultValues.bio ?? null);
    }
  }, [open, defaultValues.name, defaultValues.bio, form]);

  const isCropping = rawImageSrc !== null;
  const initials = (defaultValues.name || "?").charAt(0).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            {isCropping
              ? "Drag to reposition. Use the slider to zoom."
              : "Make changes to your profile here. Click save when you're done."}
          </DialogDescription>
        </DialogHeader>

        {isCropping ? (
          <div className="flex flex-col gap-4">
            {/* Crop area */}
            <div className="overflow-hidden relative w-full h-72 bg-black rounded-lg">
              <Cropper
                image={rawImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            {/* Zoom slider */}
            <div className="flex gap-3 items-center px-1">
              <span className="text-sm text-muted-foreground min-w-[36px]">
                Zoom
              </span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1"
                aria-label="Zoom"
              />
            </div>

            {uploadError && (
              <p className="text-sm text-red-500">{uploadError}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCropCancel}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCropApply}
                disabled={isUploading || !croppedAreaPixels}
              >
                {isUploading ? "Uploading..." : "Apply"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <FieldGroup>
              {/* Avatar preview + upload trigger */}
              <div className="flex flex-col gap-3 items-center pb-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative cursor-pointer group"
                  aria-label="Change profile photo"
                >
                  <Avatar className="size-28">
                    <AvatarImage src={avatarUrl} alt="Profile avatar" />
                    <AvatarFallback className="text-xl">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  {/* Hover overlay */}
                  <div className="flex absolute inset-0 justify-center items-center rounded-full opacity-0 transition-opacity group-hover:opacity-100 bg-black/40">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-white"
                    >
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                  </div>
                </button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change Photo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>

              {/* Name field */}
              <form.Field
                name="name"
                validators={{
                  onChange: ({ value }) => {
                    const result =
                      editProfileSchema.shape.name.safeParse(value);
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
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                    />
                    {field.state.meta.errors.length > 0 && (
                      <span className="text-red-500 text-xm">
                        {field.state.meta.errors.join(", ")}
                      </span>
                    )}
                  </Field>
                )}
              </form.Field>

              {/* Bio field */}
              <form.Field
                name="bio"
                validators={{
                  onChange: ({ value }) => {
                    const result = editProfileSchema.shape.bio.safeParse(value);
                    if (!result.success) {
                      return result.error.issues[0]?.message;
                    }
                    return undefined;
                  },
                }}
              >
                {(field) => {
                  const bioLength = (field.state.value ?? "").length;
                  return (
                    <Field>
                      <div className="flex justify-between items-center">
                        <FieldLabel htmlFor={field.name}>Bio</FieldLabel>
                        <span
                          className={`text-xs ${bioLength > 480 ? "text-destructive" : "text-muted-foreground"}`}
                        >
                          {bioLength}/500
                        </span>
                      </div>
                      <textarea
                        id={field.name}
                        name={field.name}
                        rows={3}
                        maxLength={500}
                        value={field.state.value ?? ""}
                        onBlur={field.handleBlur}
                        onChange={(e) =>
                          field.handleChange(
                            e.target.value === "" ? null : e.target.value,
                          )
                        }
                        placeholder="Tell people a little about yourself…"
                        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                      />
                      {field.state.meta.errors.length > 0 && (
                        <span className="text-red-500 text-xs">
                          {field.state.meta.errors.join(", ")}
                        </span>
                      )}
                    </Field>
                  );
                }}
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
        )}
      </DialogContent>
    </Dialog>
  );
}
