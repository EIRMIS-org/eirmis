import { AlertCircle, ArrowLeft, RefreshCw, User } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useListOrganizerProfile } from "@/features/organizer/hooks/use-list-organizer-profile";
import { useUpdateOrganizerProfile } from "@/features/organizer/hooks/use-update-organizer-profile";
import { FormRow, organizerProfileUpdateResolver } from "@/lib/forms";
import { organizerProfileUpdateSchema } from "@/lib/forms/schemas/organizer-profile";

type ProfileFormInput = z.input<typeof organizerProfileUpdateSchema>;
type ProfileFormOutput = z.output<typeof organizerProfileUpdateSchema>;

function statusVariant(status: string) {
  switch (status) {
    case "active":
      return "success" as const;
    case "pending":
      return "warning" as const;
    case "suspended":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
}

export function OrganizerSettingsPage() {
  const profileQuery = useListOrganizerProfile();
  const updateProfile = useUpdateOrganizerProfile();

  const profile = profileQuery.data?.[0] ?? null;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormInput, unknown, ProfileFormOutput>({
    resolver: organizerProfileUpdateResolver,
    defaultValues: {
      full_name: profile?.full_name ?? "",
    },
  });

  useEffect(() => {
    if (!profile) return;
    reset({ full_name: profile.full_name });
  }, [profile, reset]);

  const onSubmit = (values: ProfileFormOutput) => {
    if (!profile) return;
    updateProfile.mutate({
      id: profile.id,
      body: { full_name: values.full_name },
    });
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          to="/organizer"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to events
        </Link>
      </div>

      <header className="mb-7">
        <p className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <User aria-hidden="true" className="size-4" />
          Organizer settings
        </p>
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
          Profile settings
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          View your organizer account details and update your display name.
        </p>
      </header>

      {profileQuery.isPending ? (
        <Card aria-label="Loading organizer profile">
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : profileQuery.isError ? (
        <div
          role="alert"
          className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Unable to load your organizer profile.
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void profileQuery.refetch()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        </div>
      ) : !profile ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
          No organizer profile record was found for this account.
        </div>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3">
            <div>
              <CardTitle>Organizer account</CardTitle>
              <CardDescription>
                Signed in as {profile.email}
              </CardDescription>
            </div>
            <Badge
              variant={statusVariant(profile.status)}
              className="capitalize"
            >
              {profile.status}
            </Badge>
          </CardHeader>
          <CardContent>
            <form
              noValidate
              className="space-y-5"
              onSubmit={handleSubmit(onSubmit)}
            >
              <FormRow
                id="organizer-email"
                label="Email address"
                value={profile.email}
                readOnly
                disabled
                description="Email is managed by your authentication provider."
              />

              <FormRow
                id="organizer-full-name"
                label="Display name"
                placeholder="Your full name"
                error={errors.full_name?.message}
                {...register("full_name")}
              />

              <div className="flex items-center justify-between border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">
                  Account created{" "}
                  {new Date(profile.created_at).toLocaleDateString()}
                </p>
                <Button
                  type="submit"
                  disabled={
                    !isDirty || isSubmitting || updateProfile.isPending
                  }
                >
                  {updateProfile.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </main>
  );
}
