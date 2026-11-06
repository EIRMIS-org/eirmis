/**
 * src/app/errors/error-boundary.tsx
 *
 * Task 02 — App Shell & Providers (M4 Frontend Week 1)
 *
 * Top-level ErrorBoundary. Catches render-time errors from the entire
 * provider tree below it and renders a fallback with a retry action.
 * Logs to console for now; a reporting hook (e.g. Sentry) can be added
 * in a later milestone without changing the call site.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'

interface ErrorBoundaryProps {
    children: ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = {
        hasError: false,
        error: null,
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: ErrorInfo): void {
        // TODO(M5): forward to an error-reporting service.
        console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack)
    }

    private handleRetry = (): void => {
        this.setState({ hasError: false, error: null })
    }

    render(): ReactNode {
        if (this.state.hasError) {
            return (
                <div
                    role="alert"
                    className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center"
                >
                    <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
                    <p className="max-w-md text-sm text-muted-foreground">
                        An unexpected error occurred while rendering the app. You can try again — if the
                        problem persists, report it to the team.
                    </p>
                    {this.state.error && (
                        <pre className="max-w-lg overflow-auto rounded-lg border border-border bg-surface p-3 text-left text-xs text-muted-foreground">
                            {this.state.error.message}
                        </pre>
                    )}
                    <button
                        type="button"
                        onClick={this.handleRetry}
                        className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
                    >
                        Try again
                    </button>
                </div>
            )
        }

        return this.props.children
    }
}
