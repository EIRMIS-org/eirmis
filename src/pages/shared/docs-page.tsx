/**
 * src/pages/shared/docs-page.tsx
 *
 * Task 04 — migrated from src/App.tsx (was a window.location.pathname
 * check; now a real route). Serves the generated OpenAPI reference in an
 * iframe via the dev-server middleware in vite.config.ts.
 */

export function DocsPage() {
    return (
        <div className="flex h-screen w-full flex-col bg-background">
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-bold tracking-tight text-foreground">
                        EIRMIS API Reference
                    </span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        OpenAPI 3.1
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href="/"
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                        ← Back to App
                    </a>
                    <a
                        href="/styleguide"
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                    >
                        Styleguide
                    </a>
                </div>
            </header>
            <iframe
                src="/docs/index.html"
                title="EIRMIS OpenAPI Documentation"
                className="w-full flex-1 border-0"
            />
        </div>
    )
}
