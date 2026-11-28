import { useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { AdminSubNav } from '@/features/admin/components/admin-sub-nav'
import { OrgSettingsForm } from '@/features/admin/components/org-settings-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function AdminSettingsPage() {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const blocker = useBlocker(hasUnsavedChanges)

  return (
    <>
      <AdminSubNav />
      <main id="main-content" className="flex-1">
        <div className="container mx-auto max-w-5xl py-8 px-4 space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Organization Settings
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage system identity, event defaults, and security gateway parameters.
            </p>
          </div>
          <OrgSettingsForm onDirtyChange={setHasUnsavedChanges} />
        </div>
      </main>

      <Dialog
        open={blocker.state === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.state === 'blocked') {
            blocker.reset()
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave with unsaved changes?</DialogTitle>
            <DialogDescription>
              You have unsaved changes to organization settings. Leaving this page
              now will discard them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (blocker.state === 'blocked') blocker.reset()
              }}
            >
              Stay on page
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (blocker.state === 'blocked') blocker.proceed()
              }}
            >
              Leave without saving
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
