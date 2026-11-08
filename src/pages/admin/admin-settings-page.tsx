import { OrgSettingsForm } from '@/features/admin/components/org-settings-form'

export function AdminSettingsPage() {
  return (
    <div className="container mx-auto max-w-5xl py-8 px-4 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Organization Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage system identity, event defaults, and security gateway parameters.
        </p>
      </div>
      <OrgSettingsForm />
    </div>
  )
}
