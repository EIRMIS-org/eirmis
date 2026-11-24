import { ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PublicEventDiscovery } from '@/features/landing/components/public-event-discovery'
import { AuditTrailSection } from './components/audit-trail-section'
import { HeroBackdrop } from './components/hero-backdrop'
import { HeroSignInCard } from './components/hero-signin-card'

export function LandingPage() {
  return (
    <>
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <section className="relative overflow-hidden bg-slate-950 text-white">
          <HeroBackdrop />
          <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pb-28 sm:pt-24 lg:pb-32 lg:pt-28">
            <div className="grid items-center gap-14 lg:grid-cols-[1.1fr_0.75fr] lg:gap-20">
              <div>
                <h1 className="max-w-2xl font-heading text-5xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
                  Every invitation, RSVP, and check-in &mdash; accounted for.
                </h1>
                <p className="mt-6 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
                  EIRMIS runs invitation delivery, RSVP approvals, passwordless
                  guest rosters, digital passes, and real-time entrance scanning
                  &mdash; with an audit trail behind every action.
                </p>
                <div className="mt-9 flex flex-wrap items-center gap-4">
                  <Button
                    type="button"
                    size="lg"
                    className="bg-white text-slate-950 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    onClick={() =>
                      document
                        .getElementById('public-events')
                        ?.scrollIntoView({ behavior: 'smooth' })
                    }
                  >
                    Explore open events
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </Button>
                  <p className="text-xs text-slate-400">
                    No sign-in needed to browse.
                  </p>
                </div>
              </div>
              <HeroSignInCard />
            </div>
          </div>
        </section>

        <AuditTrailSection />

        <PublicEventDiscovery />
      </main>

      <footer className="border-t border-border bg-surface py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 text-[11px] text-muted-foreground sm:px-6">
          <span>EIRMIS &middot; Auditable event orchestration</span>
          <span>&copy; 2026 EIRMIS</span>
        </div>
      </footer>
    </>
  )
}
