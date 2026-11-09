/**
 * src/pages/shared/placeholder-page.tsx
 *
 * Task 04 — Routing & Role Guards (M4 Frontend Week 1)
 *
 * Empty-route placeholder. Portal tasks (06–10) replace these elements
 * with real pages; the route table itself stays owned by Task 04.
 */

export interface PlaceholderPageProps {
    /** What this route will become. */
    title: string
    /** Which task fills it. */
    note?: string
}

export function PlaceholderPage({ title, note }: PlaceholderPageProps) {
    return (
        <main className="flex flex-1 items-center justify-center p-8">
            <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-10 py-14 text-center">
                <p className="font-heading text-lg font-bold text-foreground">
                    {title}
                </p>
                {note && (
                    <p className="mt-2 text-xs text-muted-foreground">{note}</p>
                )}
            </div>
        </main>
    )
}
