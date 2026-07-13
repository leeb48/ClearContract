"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { RecordModel } from "pocketbase";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logout } from "@/lib/auth";
import { pb } from "@/lib/pb";
import {
  businessDetailsSchema,
  changePasswordSchema,
  LOGO_MAX_BYTES,
  LOGO_MIME_TYPES,
  profileSchema,
  type BusinessDetailsInput,
  type ChangePasswordInput,
  type ProfileInput,
} from "@/lib/validators/settings";

export default function AccountSettingsPage() {
  const [settings, setSettings] = useState<RecordModel | null>(null);
  const user = pb().authStore.record;

  useEffect(() => {
    if (!user) return;
    pb()
      .collection("business_settings")
      .getFirstListItem(`user="${user.id}"`)
      .then(setSettings)
      .catch(() => toast.error("Could not load business settings"));
  }, [user]);

  if (!user) return null;

  return (
    <div className="grid gap-6">
      <ProfileCard />
      {settings ? (
        <BusinessCard settings={settings} onSaved={setSettings} />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Business details</CardTitle>
            <CardDescription>Loading…</CardDescription>
          </CardHeader>
        </Card>
      )}
      <SecurityCard />
      <DangerCard />
    </div>
  );
}

function ProfileCard() {
  const user = pb().authStore.record!;
  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name ?? "", phone: user.phone ?? "" },
  });

  async function onSubmit(data: ProfileInput) {
    try {
      await pb().collection("users").update(user.id, data);
      toast.success("Profile saved");
    } catch {
      toast.error("Could not save profile");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Your name is used for the dashboard greeting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4"
          noValidate
        >
          <div className="grid gap-2">
            <Label htmlFor="profile-name">Name</Label>
            <Input id="profile-name" {...field("name")} />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input id="profile-email" value={user.email} disabled />
            <p className="text-xs text-zinc-500">
              Email changes arrive with email verification (Phase 4).
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profile-phone">Phone</Label>
            <Input id="profile-phone" type="tel" {...field("phone")} />
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>
          <div>
            <Button type="submit" disabled={isSubmitting}>
              Save profile
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Rendered only once settings has loaded, so the form initializes from real
// values — resetting an already-visible form would race against user input.
function BusinessCard({
  settings,
  onSaved,
}: {
  settings: RecordModel;
  onSaved: (r: RecordModel) => void;
}) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoInputKey, setLogoInputKey] = useState(0);
  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<BusinessDetailsInput>({
    resolver: zodResolver(businessDetailsSchema),
    defaultValues: {
      company_name: settings.company_name ?? "",
      business_address: settings.business_address ?? "",
    },
  });
  const record = settings;

  const logoUrl = record.logo
    ? pb().files.getURL(record, record.logo, { thumb: "600x0" })
    : null;

  async function onSubmit(data: BusinessDetailsInput) {
    try {
      const form = new FormData();
      form.append("company_name", data.company_name);
      form.append("business_address", data.business_address);
      if (logoFile) {
        if (!LOGO_MIME_TYPES.includes(logoFile.type)) {
          toast.error("Logo must be an image (JPEG, PNG, WebP, or SVG)");
          return;
        }
        if (logoFile.size > LOGO_MAX_BYTES) {
          toast.error("Logo must be 5MB or smaller");
          return;
        }
        form.append("logo", logoFile);
      }
      const updated = await pb()
        .collection("business_settings")
        .update(record.id, form);
      onSaved(updated);
      setLogoFile(null);
      setLogoInputKey((k) => k + 1);
      toast.success("Business details saved");
    } catch {
      toast.error("Could not save business details");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business details</CardTitle>
        <CardDescription>Shown on your quotes and invoices.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4"
          noValidate
        >
          <div className="grid gap-2">
            <Label htmlFor="company-name">Company name</Label>
            <Input
              id="company-name"
              placeholder="James Driveways"
              {...field("company_name")}
            />
            {errors.company_name && (
              <p className="text-sm text-red-600">
                {errors.company_name.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="business-address">Business address</Label>
            <Input id="business-address" {...field("business_address")} />
            {errors.business_address && (
              <p className="text-sm text-red-600">
                {errors.business_address.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="logo">Logo</Label>
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- PocketBase-served file, unknown dimensions
              <img
                src={logoUrl}
                alt="Current logo"
                className="h-16 w-fit rounded border object-contain p-1"
              />
            )}
            <Input
              key={logoInputKey}
              id="logo"
              type="file"
              accept={LOGO_MIME_TYPES.join(",")}
              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-zinc-500">
              JPEG, PNG, WebP, or SVG, up to 5MB.
            </p>
          </div>
          <div>
            <Button type="submit" disabled={isSubmitting}>
              Save business details
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function SecurityCard() {
  const {
    register: field,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  async function onSubmit(data: ChangePasswordInput) {
    const user = pb().authStore.record!;
    const email = user.email;
    try {
      await pb().collection("users").update(user.id, data);
      // A password change invalidates the current token — re-auth to stay logged in.
      await pb().collection("users").authWithPassword(email, data.password);
      reset();
      toast.success("Password changed");
    } catch {
      toast.error("Could not change password — check your current password");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>Change your password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4"
          noValidate
        >
          <div className="grid gap-2">
            <Label htmlFor="old-password">Current password</Label>
            <Input
              id="old-password"
              type="password"
              autoComplete="current-password"
              {...field("oldPassword")}
            />
            {errors.oldPassword && (
              <p className="text-sm text-red-600">
                {errors.oldPassword.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              {...field("password")}
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              {...field("passwordConfirm")}
            />
            {errors.passwordConfirm && (
              <p className="text-sm text-red-600">
                {errors.passwordConfirm.message}
              </p>
            )}
          </div>
          <div>
            <Button type="submit" disabled={isSubmitting}>
              Change password
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function DangerCard() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    const user = pb().authStore.record!;
    setDeleting(true);
    try {
      await pb().collection("users").delete(user.id);
      logout();
      router.replace("/");
    } catch {
      toast.error("Could not delete account");
      setDeleting(false);
    }
  }

  return (
    <Card className="border-red-200 dark:border-red-900">
      <CardHeader>
        <CardTitle>Danger zone</CardTitle>
        <CardDescription>
          Deleting your account removes your business settings and, in later
          phases, all quotes and customers. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {confirming ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">
              Really delete your account?
            </span>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Yes, delete everything"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirming(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="destructive" onClick={() => setConfirming(true)}>
            Delete account
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
