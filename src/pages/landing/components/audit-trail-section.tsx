import landingInvitation from '@/assets/landing_invitation.webp'
import landingQr from '@/assets/landing_qr.webp'
import landingRsvp from '@/assets/landing_rsvp.webp'

const PROOF_STEPS = [
    {
        step: '01',
        title: 'Invitation sent',
        description:
            'The organizer dispatches invitations; every send is logged with a timestamp and recipient.',
        image: landingInvitation,
        alt: 'Illustration of a guest holding up an envelope sealed with a heart',
        width: 1120,
        height: 1120,
    },
    {
        step: '02',
        title: 'RSVP approved',
        description:
            'Guests respond online; the organizer approves, waitlists, or declines — each decision recorded.',
        image: landingRsvp,
        alt: 'Illustration of a guest giving a thumbs-up next to an approved shield badge',
        width: 1120,
        height: 1120,
    },
    {
        step: '03',
        title: 'QR scanned at the door',
        description:
            'One pass per guest, verified in real time. Entrance counts stay reconciled with the approved list.',
        image: landingQr,
        alt: 'Illustration of a guest scanning a QR pass with a phone at the entrance',
        width: 1120,
        height: 1493,
    },
]

/**
 * Proof section: a three-step visual of the invitation → RSVP → check-in
 * pipeline, emphasizing the audit trail recorded at each step. Each step is
 * a full-width row with the illustration alternating sides on desktop
 * (left, right, left) and stacking image-first on mobile.
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

                <ol className="mt-10 list-none space-y-12 p-0 sm:space-y-16">
                    {PROOF_STEPS.map((step, index) => {
                        const imageRight = index % 2 === 1

                        return (
                            <li
                                key={step.step}
                                className="grid items-center gap-4 md:grid-cols-2 md:gap-8"
                            >
                                <div
                                    className={
                                        imageRight
                                            ? 'flex justify-center md:order-2 md:justify-start'
                                            : 'flex justify-center md:justify-end'
                                    }
                                >
                                    <img
                                        src={step.image}
                                        alt={step.alt}
                                        width={step.width}
                                        height={step.height}
                                        loading="lazy"
                                        decoding="async"
                                        className="h-auto max-h-64 w-auto max-w-full sm:max-h-80 md:max-h-[22rem]"
                                    />
                                </div>
                                <div
                                    className={
                                        imageRight ? 'md:order-1 md:text-right' : undefined
                                    }
                                >
                                    <span className="inline-flex items-center rounded-full border border-primary-border bg-primary-subtle px-3 py-1 font-heading text-xs font-bold tracking-widest text-primary">
                                        {step.step}
                                    </span>
                                    <h3 className="mt-3 font-heading text-lg font-bold text-foreground sm:text-xl">
                                        {step.title}
                                    </h3>
                                    <p
                                        className={`mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base ${imageRight ? 'md:ml-auto' : ''
                                            }`}
                                    >
                                        {step.description}
                                    </p>
                                </div>
                            </li>
                        )
                    })}
                </ol>
            </div>
        </section>
    )
}
