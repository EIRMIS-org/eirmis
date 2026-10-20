import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const emptySubscribe = () => () => { }

export function ThemeToggle({ floating = false }: { floating?: boolean }) {
    // Hydration-safe mounted check: false on server/first render, true after mount.
    const mounted = useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false,
    )
    const { resolvedTheme, setTheme } = useTheme()

    const isDark = resolvedTheme === 'dark'
    const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

    // Floating: fixed action button, bottom-right, below overlays (dialogs z-50,
    // custom modals z-[100], toasts z-[3000]) but above page content.
    const floatingClass =
        'fixed bottom-6 right-6 z-40 size-12 rounded-full border-border bg-surface text-foreground shadow-lg hover:bg-muted hover:border-border-hover'

    if (!mounted) {
        return (
            <Button
                variant="outline"
                size="icon"
                disabled
                aria-label="Toggle color theme"
                className={cn(floating && floatingClass)}
            >
                <SunIcon className={cn('size-4', floating && 'size-5')} />
            </Button>
        )
    }

    return (
        <Button
            variant="outline"
            size="icon"
            aria-label={label}
            title={label}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={cn(floating && floatingClass)}
        >
            {isDark ? (
                <SunIcon className={cn('size-4', floating && 'size-5')} />
            ) : (
                <MoonIcon className={cn('size-4', floating && 'size-5')} />
            )}
        </Button>
    )
}
