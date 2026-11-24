import { ArrowDown, ArrowRight } from 'lucide-react'
import { HeroCarousel } from './components/hero-carousel'
import { Button } from '@/components/ui/button'
import { PublicEventDiscovery } from '@/features/landing/components/public-event-discovery'
import { RoleCardGrid } from '@/features/landing/components/role-card-grid'

export function LandingPage() {
  return (
    <>
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        <section className="relative overflow-hidden bg-slate-950 text-white">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(13,148,136,0.28),_transparent_45%)]"
          />
          <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20">
            <div className="grid items-end gap-8 lg:grid-cols-[1.05fr_0.75fr] lg:gap-16">
              <div>
                <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300">
                  Auditable event orchestration
                </p>
                <h1 className="mt-5 max-w-3xl font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                  Manage every event invitation &amp; RSVP.
                </h1>
              </div>
              <div className="max-w-xl lg:pb-1">
                <p className="text-sm leading-7 text-slate-300 sm:text-base">
                  One platform for invitation delivery, RSVP approvals,
                  passwordless guest rosters, digital VIP passes, and real-time
                  entrance scanning.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button
                    type="button"
                    className="bg-white text-slate-950 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    onClick={() =>
                      document
                        .getElementById('role-portals')
                        ?.scrollIntoView({ behavior: 'smooth' })
                    }
                  >
                    Choose your portal
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-teal-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    onClick={() =>
                      document
                        .getElementById('public-events')
                        ?.scrollIntoView({ behavior: 'smooth' })
                    }
                  >
                    Explore public events
                    <ArrowDown className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
            <HeroCarousel />
          </div>
        </section>

        <section
          id="role-portals"
          aria-labelledby="role-portals-heading"
          className="scroll-mt-20 py-16 sm:py-20"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  Role portals
                </p>
                <h2
                  id="role-portals-heading"
                  className="mt-2 font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
                >
                  Four portals, one platform
                </h2>
              </div>
              <p className="max-w-lg text-sm leading-relaxed text-muted-foreground">
                Choose your role to enter its purpose-built workspace. Sign-in is
                mocked for this preview.
              </p>
            </div>
            <RoleCardGrid />
          </div>
        </section>

        <PublicEventDiscovery />
      </main>

      <footer className="border-t border-border bg-surface py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 text-[11px] text-muted-foreground sm:px-6">
          <span>EIRMIS Â· Auditable event orchestration</span>
          <span>Mock preview Â· Public event discovery</span>
        </div>
      </footer>
    </>
  )
}
