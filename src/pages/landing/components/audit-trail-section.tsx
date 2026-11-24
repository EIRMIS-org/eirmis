import { MailCheck, ShieldCheck, ScanLine } from 'lucide-react'

const PROOF_STEPS = [
    {
        icon: MailCheck,
        step: '01',
        title: 'Invitation sent',
        description:
            'The organizer dispatches invitations; every send is logged with a timestamp and recipient.',
    },
    {
        icon: ShieldCheck,
        step: '02',
        title: 'RSVP approved',
        description:
            'Guests respond online; the organizer approves, waitlists, or declines — each decision recorded.',
    },
    {
        icon: ScanLine,
        step: '03',
        title: 'QR scanned at the door',
        description:
            'One pass per guest, verified in real time. Entrance counts stay reconciled with the approved list.',
    },
]

/**
 * Proof section: a three-step visual of the invitation → RSVP → check-in
 * pipeline, emphasizing the audit trail recorded at each step.
 */
export function AuditTrailSection() {
    return (
        <section
            aria-labelledby="audit-trail-heading"
            className="border-t border-border/70 bg-muted/40 py-16 sm:py-20"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <h2
                    id="audit-trail-heading"
                    className="max-w-2xl font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
                >
                    Every step leaves a record
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                    From the first invitation to the final scan, EIRMIS keeps an auditable
                    trail — so headcounts, disputes, and post-event reports are settled by
                    data, not memory.
                </p>

                <ol className="mt-10 grid list-none gap-8 p-0 md:grid-cols-3 md:gap-6">
                    {PROOF_STEPS.map((step, index) => {
                        const Icon = step.icon

                        return (
                            <li key={step.step} className="relative">
                                {index < PROOF_STEPS.length - 1 && (
                                    <div
                                        aria-hidden="true"
                                        className="absolute left-12 top-6 hidden h-px w-[calc(100%-3rem)] border-t border-dashed border-border md:block"
                                    />
                                )}
                                <div className="flex items-center gap-3">
                                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl border border-primary-border bg-primary-subtle text-primary">
                                        <Icon className="size-5" aria-hidden="true" />
                                    </span>
                                    <span className="font-heading text-xs font-bold tracking-widest text-muted-foreground">
                                        {step.step}
                                    </span>
                                </div>
                                <h3 className="mt-4 font-heading text-base font-bold text-foreground">
                                    {step.title}
                                </h3>
                                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                                    {step.description}
                                </p>
                            </li>
                        )
                    })}
                </ol>
            </div>
        </section>
    )
}
