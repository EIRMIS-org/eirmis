import {
  AlertCircle,
  FileCode2,
  Image as ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useCreateInvitationDesign,
  useInvitationDesign,
} from "@/features/organizer/hooks/use-invitation-design";
import {
  useAddInvitationImage,
  useDeleteInvitationImage,
  useUpdateInvitationImage,
} from "@/features/organizer/hooks/use-invitation-image-mutations";
import { useListInvitationImages } from "@/features/organizer/hooks/use-list-invitation-images";
import { useUploadInvitationHtml } from "@/features/organizer/hooks/use-upload-invitation-html";
import {
  FormRow,
  invitationDesignCreateResolver,
  invitationImageCreateResolver,
  invitationImageUpdateResolver,
} from "@/lib/forms";
import {
  invitationDesignCreateSchema,
  invitationImageCreateSchema,
  invitationImageUpdateSchema,
} from "@/lib/forms/schemas/invitation-design";

type InvitationImageRow = NonNullable<
  ReturnType<typeof useListInvitationImages>["data"]
>[number];

type DesignCreateInput = z.input<typeof invitationDesignCreateSchema>;
type DesignCreateOutput = z.output<typeof invitationDesignCreateSchema>;
type ImageCreateInput = z.input<typeof invitationImageCreateSchema>;
type ImageCreateOutput = z.output<typeof invitationImageCreateSchema>;
type ImageUpdateInput = z.input<typeof invitationImageUpdateSchema>;
type ImageUpdateOutput = z.output<typeof invitationImageUpdateSchema>;

function validationBadgeVariant(status: string | null | undefined) {
  switch (status) {
    case "passed":
      return "success" as const;
    case "failed":
      return "destructive" as const;
    case "pending":
      return "warning" as const;
    default:
      return "outline" as const;
  }
}

export interface InvitationDesignTabProps {
  eventId: string;
}

export function InvitationDesignTab({ eventId }: InvitationDesignTabProps) {
  const designQuery = useInvitationDesign(eventId);
  const createDesign = useCreateInvitationDesign();
  const uploadHtml = useUploadInvitationHtml();

  const imagesQuery = useListInvitationImages(eventId);
  const addImage = useAddInvitationImage();
  const updateImage = useUpdateInvitationImage();
  const deleteImage = useDeleteInvitationImage();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isAddImageOpen, setIsAddImageOpen] = useState(false);
  const [editingImage, setEditingImage] = useState<InvitationImageRow | null>(
    null,
  );
  const [deletingImage, setDeletingImage] =
    useState<InvitationImageRow | null>(null);

  const currentDesign = designQuery.data?.[0] ?? null;
  const images = imagesQuery.data ?? [];

  const designForm = useForm<DesignCreateInput, unknown, DesignCreateOutput>({
    resolver: invitationDesignCreateResolver,
    defaultValues: {
      event_id: eventId,
      design_type: currentDesign?.design_type ?? "images",
    },
  });

  useEffect(() => {
    designForm.reset({
      event_id: eventId,
      design_type: currentDesign?.design_type ?? "images",
    });
  }, [currentDesign?.design_type, designForm, eventId]);

  const addImageForm = useForm<ImageCreateInput, unknown, ImageCreateOutput>({
    resolver: invitationImageCreateResolver,
    defaultValues: {
      event_id: eventId,
      storage_path: "",
      sort_order: images.length + 1,
      caption: "",
    },
  });

  useEffect(() => {
    if (!isAddImageOpen) return;
    addImageForm.reset({
      event_id: eventId,
      storage_path: "",
      sort_order: images.length + 1,
      caption: "",
    });
  }, [addImageForm, eventId, images.length, isAddImageOpen]);

  const editImageForm = useForm<ImageUpdateInput, unknown, ImageUpdateOutput>({
    resolver: invitationImageUpdateResolver,
    defaultValues: {
      sort_order: 1,
      caption: "",
    },
  });

  useEffect(() => {
    if (!editingImage) return;
    editImageForm.reset({
      sort_order: editingImage.sort_order,
      caption: editingImage.caption ?? "",
    });
  }, [editImageForm, editingImage]);

  const handleDesignSubmit = (values: DesignCreateOutput) => {
    createDesign.mutate({
      event_id: eventId,
      design_type: values.design_type,
    });
  };

  const handleHtmlUpload = () => {
    if (!selectedFile) return;
    uploadHtml.mutate(
      { eventId, file: selectedFile },
      {
        onSuccess: () => {
          setSelectedFile(null);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        },
      },
    );
  };

  const handleAddImageSubmit = (values: ImageCreateOutput) => {
    addImage.mutate(
      {
        event_id: eventId,
        storage_path: values.storage_path,
        sort_order: values.sort_order,
        caption: values.caption || null,
      },
      {
        onSuccess: () => {
          setIsAddImageOpen(false);
        },
      },
    );
  };

  const handleEditImageSubmit = (values: ImageUpdateOutput) => {
    if (!editingImage) return;
    updateImage.mutate(
      {
        id: editingImage.id,
        body: {
          sort_order: values.sort_order,
          caption: values.caption || null,
        },
      },
      {
        onSuccess: () => {
          setEditingImage(null);
        },
      },
    );
  };

  const confirmDeleteImage = () => {
    if (!deletingImage) return;
    deleteImage.mutate(deletingImage.id, {
      onSuccess: () => {
        setDeletingImage(null);
      },
    });
  };

  const renderDesignSection = () => {
    if (designQuery.isPending) {
      return (
        <div className="space-y-3" aria-label="Loading invitation design">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-12 w-full" />
        </div>
      );
    }

    if (designQuery.isError) {
      return (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Unable to load invitation design.
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void designQuery.refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {currentDesign ? (
          <div className="grid gap-4 rounded-xl border border-border bg-muted/30 p-4 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Active mode
              </p>
              <p className="mt-1 font-medium capitalize text-foreground">
                {currentDesign.design_type}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Validation status
              </p>
              <div className="mt-1">
                <Badge
                  variant={validationBadgeVariant(
                    currentDesign.validation_status,
                  )}
                >
                  {currentDesign.validation_status ?? "not applicable"}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                HTML file path
              </p>
              <p className="mt-1 truncate font-mono text-xs text-foreground">
                {currentDesign.html_storage_path ?? "None uploaded"}
              </p>
            </div>
            {currentDesign.validation_notes && (
              <div className="sm:col-span-3">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Validation notes
                </p>
                <p className="mt-1 text-destructive">
                  {currentDesign.validation_notes}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            <FileCode2 className="mx-auto mb-2 h-7 w-7" />
            No invitation design configured for this event yet. Choose a mode
            below to get started.
          </div>
        )}

        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={designForm.handleSubmit(handleDesignSubmit)}
        >
          <div className="min-w-48">
            <Label htmlFor="design-type-select">Design mode</Label>
            <select
              id="design-type-select"
              className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...designForm.register("design_type")}
            >
              <option value="images">Image gallery</option>
              <option value="html">Custom HTML</option>
            </select>
          </div>
          <Button
            type="submit"
            disabled={
              designForm.formState.isSubmitting || createDesign.isPending
            }
          >
            {createDesign.isPending ? "Saving…" : "Save design mode"}
          </Button>
        </form>
      </div>
    );
  };

  const renderGallerySection = () => {
    if (imagesQuery.isPending) {
      return (
        <div className="space-y-2" aria-label="Loading gallery images">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }

    if (imagesQuery.isError) {
      return (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Unable to load gallery images.
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void imagesQuery.refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      );
    }

    if (images.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center">
          <ImageIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            No gallery images added yet
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add images to display in the guest invitation gallery.
          </p>
          <Button
            className="mt-4"
            size="sm"
            onClick={() => setIsAddImageOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Add gallery image
          </Button>
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Storage path</TableHead>
            <TableHead>Caption</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {images.map((image) => (
            <TableRow key={image.id}>
              <TableCell className="font-medium text-foreground">
                {image.sort_order}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {image.storage_path}
              </TableCell>
              <TableCell>{image.caption ?? "No caption"}</TableCell>
              <TableCell className="text-right">
                <div className="inline-flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingImage(image)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => setDeletingImage(image)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Invitation design</CardTitle>
            <CardDescription>
              Choose between an image gallery or a custom self-contained HTML
              invitation.
            </CardDescription>
          </CardHeader>
          <CardContent>{renderDesignSection()}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upload HTML invitation</CardTitle>
            <CardDescription>
              Upload a standalone `.html` file. Uploaded files are scanned for
              external links and malware before being served to guests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-64 flex-1">
                <Label htmlFor="invitation-html-file">HTML file</Label>
                <Input
                  ref={fileInputRef}
                  id="invitation-html-file"
                  type="file"
                  accept=".html,.htm,text/html"
                  className="mt-1.5"
                  onChange={(event) =>
                    setSelectedFile(event.target.files?.[0] ?? null)
                  }
                />
              </div>
              <Button
                type="button"
                disabled={!selectedFile || uploadHtml.isPending}
                onClick={handleHtmlUpload}
              >
                <Upload className="h-4 w-4" />
                {uploadHtml.isPending ? "Uploading…" : "Upload HTML"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>Gallery images</CardTitle>
              <CardDescription>
                Manage and order the images shown in the invitation gallery.
              </CardDescription>
            </div>
            <Button onClick={() => setIsAddImageOpen(true)}>
              <Plus className="h-4 w-4" />
              Add image
            </Button>
          </CardHeader>
          <CardContent>{renderGallerySection()}</CardContent>
        </Card>
      </div>

      <Dialog open={isAddImageOpen} onOpenChange={setIsAddImageOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add gallery image</DialogTitle>
            <DialogDescription>
              Register an image storage path and optional caption for this
              event.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            className="space-y-4"
            onSubmit={addImageForm.handleSubmit(handleAddImageSubmit)}
          >
            <FormRow
              id="add-image-path"
              label="Storage path"
              placeholder={`designs/${eventId}/gallery/003.jpg`}
              error={addImageForm.formState.errors.storage_path?.message}
              {...addImageForm.register("storage_path")}
            />
            <FormRow
              id="add-image-order"
              label="Sort order"
              type="number"
              min={0}
              error={addImageForm.formState.errors.sort_order?.message}
              {...addImageForm.register("sort_order", { valueAsNumber: true })}
            />
            <FormRow
              id="add-image-caption"
              label="Caption"
              placeholder="Optional alt text or caption"
              error={addImageForm.formState.errors.caption?.message}
              {...addImageForm.register("caption")}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddImageOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  addImageForm.formState.isSubmitting || addImage.isPending
                }
              >
                {addImage.isPending ? "Adding…" : "Add image"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingImage)}
        onOpenChange={(open) => {
          if (!open) setEditingImage(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit gallery image</DialogTitle>
            <DialogDescription>
              Update the display order or caption for this gallery image.
            </DialogDescription>
          </DialogHeader>
          <form
            noValidate
            className="space-y-4"
            onSubmit={editImageForm.handleSubmit(handleEditImageSubmit)}
          >
            <FormRow
              id="edit-image-order"
              label="Sort order"
              type="number"
              min={0}
              error={editImageForm.formState.errors.sort_order?.message}
              {...editImageForm.register("sort_order", {
                valueAsNumber: true,
              })}
            />
            <FormRow
              id="edit-image-caption"
              label="Caption"
              placeholder="Optional alt text or caption"
              error={editImageForm.formState.errors.caption?.message}
              {...editImageForm.register("caption")}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingImage(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  editImageForm.formState.isSubmitting || updateImage.isPending
                }
              >
                {updateImage.isPending ? "Saving…" : "Save image"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deletingImage)}
        onOpenChange={(open) => {
          if (!open) setDeletingImage(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete gallery image</DialogTitle>
            <DialogDescription>
              Remove{" "}
              <span className="font-mono text-xs">
                {deletingImage?.storage_path}
              </span>{" "}
              from this event&apos;s gallery?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingImage(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteImage.isPending}
              onClick={confirmDeleteImage}
            >
              {deleteImage.isPending ? "Deleting…" : "Delete image"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
