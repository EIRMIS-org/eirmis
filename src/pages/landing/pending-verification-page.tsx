import { Clock } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useSession } from '@/app/providers/use-session'

export function PendingVerificationPage() {
  const navigate = useNavigate()
  const { signOut } = useSession()

  function handleSignOut() {
    signOut()
    navigate('/')
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 items-center justify-center bg-surface px-4 py-16 focus:outline-none sm:px-6"
    >
      <section
        aria-labelledby="pending-verification-heading"
        className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm"
      >
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border border-warning-border bg-warning-bg text-warning">
          <Clock className="size-5" aria-hidden="true" />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-warning">
          Account status: Pending review
        </p>
        <h1
          id="pending-verification-heading"
          className="mt-2 font-heading text-2xl font-extrabold tracking-tight text-foreground"
        >
          Your organizer account is awaiting verification
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          An administrator reviews new organizer requests before portal access is
          enabled. Once your account is activated, you can sign in to manage
          events and invitations.
        </p>
        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link to="/">Back to home</Link>
          </Button>
          <Button type="button" variant="outline" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </section>
    </main>
  )
}