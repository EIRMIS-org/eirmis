import { ArrowDown, ArrowRight, Sparkles } from 'lucide-react'
import heroEventImage from '../../../mockup-plan/assets/hero-carousel-1.jpg'
import { Button } from '@/components/ui/button'
import { PublicEventDiscovery } from '@/features/landing/components/public-event-discovery'
import { RoleCardGrid } from '@/features/landing/components/role-card-grid'

export function LandingPage() {
  return (
    <main className="flex-1">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(13,148,136,0.28),_transparent_45%)]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20">
          <div className="grid items-end gap-8 lg:grid-cols-[1.05fr_0.75fr] lg:gap-16">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-teal-300">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Auditable event orchestration
              </p>
              <h1 className="mt-5 max-w-3xl font-heading text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
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
                  className="bg-white text-slate-950 hover:bg-slate-100"
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
                  className="border-white/25 bg-white/5 text-white hover:bg-white/10 hover:text-white"
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
          <div className="relative mt-10 overflow-hidden rounded-3xl border border-white/15 bg-slate-800 shadow-2xl sm:mt-14">
            <img
              src={heroEventImage}
              alt="A celebration prepared for an evening event"
              className="h-56 w-full object-cover sm:h-80 lg:h-[26rem]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/5 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-end justify-between gap-3 sm:bottom-7 sm:left-7 sm:right-7">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-200">
                  EIRMIS · Event operations
                </p>
                <p className="mt-1 font-heading text-lg font-bold text-white sm:text-2xl">
                  Every guest experience, thoughtfully connected.
                </p>
              </div>
              <span className="rounded-full border border-white/25 bg-black/25 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                M4 interactive preview
              </span>
            </div>
          </div>
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

      <footer className="border-t border-border bg-surface py-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 text-[11px] text-muted-foreground sm:px-6">
          <span>EIRMIS · Auditable event orchestration</span>
          <span>Mock preview · Public event discovery</span>
        </div>
      </footer>
    </main>
  )
}
