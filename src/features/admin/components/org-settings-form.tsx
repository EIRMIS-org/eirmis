import * as React from 'react'
import { Controller, useForm } from 'react-hook-form'
import type { z } from 'zod'
import { Save, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SettingsSection } from '@/components/eirmis/settings-section'
import { useOrgSettings, useUpdateOrgSettings } from '../hooks/use-org-settings'
import {
  orgSettingsUpdateSchema,
  orgSettingsUpdateResolver,
  type OrgSettingsUpdate,
} from '@/lib/forms/schemas/org-settings'

const COMMON_TIMEZONES = [
  { value: 'Asia/Manila', label: 'Asia/Manila (PHT, UTC+8)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+9)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
]

export function OrgSettingsForm() {
  const { data: rawData, isLoading, isError } = useOrgSettings()
  const { mutate: updateSettings, isPending } = useUpdateOrgSettings()

  const settings = Array.isArray(rawData) ? rawData[0] : rawData

  const form = useForm<
    z.input<typeof orgSettingsUpdateSchema>,
    unknown,
    OrgSettingsUpdate
  >({
    resolver: orgSettingsUpdateResolver,
    defaultValues: {
      org_name: '',
      default_timezone: 'Asia/Manila',
      default_capacity_ceiling: 150,
      sender_domain: 'invites.eirmis.org',
      malware_sandbox_enabled: true,
      self_registration_gate_enabled: true,
    },
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = form

  React.useEffect(() => {
    if (settings) {
      reset({
        org_name: settings.org_name ?? '',
        default_timezone: settings.default_timezone ?? 'Asia/Manila',
        default_capacity_ceiling: settings.default_capacity_ceiling ?? 150,
        sender_domain: settings.sender_domain ?? 'invites.eirmis.org',
        malware_sandbox_enabled: settings.malware_sandbox_enabled ?? true,
        self_registration_gate_enabled: settings.self_registration_gate_enabled ?? true,
      })
    }
  }, [settings, reset])

  const onSubmit = (values: OrgSettingsUpdate) => {
    updateSettings(values)
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Failed to load organization settings. Please try again or refresh the page.
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
      {/* Section 1: General Organization Info */}
      <SettingsSection
        title="General Organization Info"
        description="Global organization identity and outbound email transport domain for invitation dispatches."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org_name">Organization / System Instance Name</Label>
            <Input
              id="org_name"
              placeholder="e.g. EIRMIS Enterprise Cloud Platform"
              {...register('org_name')}
            />
            {errors.org_name && (
              <p className="text-xs text-destructive">{errors.org_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sender_domain">Verified Sender Domain</Label>
            <Input
              id="sender_domain"
              placeholder="invites.eirmis.org"
              {...register('sender_domain')}
            />
            {errors.sender_domain && (
              <p className="text-xs text-destructive">{errors.sender_domain.message}</p>
            )}
          </div>
        </div>
      </SettingsSection>

      {/* Section 2: Event Defaults */}
      <SettingsSection
        title="Event Defaults"
        description="Default scheduling parameters, timezones, and capacity limits applied to newly created events."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="default_timezone">Default Event Timezone</Label>
            <Controller
              name="default_timezone"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? 'Asia/Manila'}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="default_timezone" className="w-full">
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMON_TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.default_timezone && (
              <p className="text-xs text-destructive">{errors.default_timezone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="default_capacity_ceiling">Default Capacity Ceiling</Label>
            <Input
              id="default_capacity_ceiling"
              type="number"
              min={1}
              {...register('default_capacity_ceiling', { valueAsNumber: true })}
            />
            {errors.default_capacity_ceiling && (
              <p className="text-xs text-destructive">
                {errors.default_capacity_ceiling.message}
              </p>
            )}
          </div>
        </div>
      </SettingsSection>

      {/* Section 3: Security & Gates */}
      <SettingsSection
        title="Security & Gates"
        description="Security sandbox enforcement and registration approval gates for new organizers."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="malware_sandbox_enabled" className="text-sm font-medium">
                Malware Sandbox
              </Label>
              <p className="text-xs text-muted-foreground">
                Require clean hash verdict before serving custom HTML invitations.
              </p>
            </div>
            <Controller
              name="malware_sandbox_enabled"
              control={control}
              render={({ field }) => (
                <Switch
                  id="malware_sandbox_enabled"
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="self_registration_gate_enabled" className="text-sm font-medium">
                Self-Registration Gate
              </Label>
              <p className="text-xs text-muted-foreground">
                Require administrator approval before newly registered organizers can publish events.
              </p>
            </div>
            <Controller
              name="self_registration_gate_enabled"
              control={control}
              render={({ field }) => (
                <Switch
                  id="self_registration_gate_enabled"
                  checked={Boolean(field.value)}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
        </div>
      </SettingsSection>

      {/* Save Button */}
      <div className="flex justify-end pt-4 border-t">
        <Button
          type="submit"
          disabled={isPending || !isDirty}
          className="gap-2"
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save Organization Settings
        </Button>
      </div>
    </form>
  )
}
