import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { MoonIcon, SunIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

const emptySubscribe = () => () => { }

export function ThemeToggle() {
    // Hydration-safe mounted check: false on server/first render, true after mount.
    const mounted = useSyncExternalStore(
        emptySubscribe,
        () => true,
        () => false,
    )
    const { resolvedTheme, setTheme } = useTheme()

    if (!mounted) {
        return (
            <Button
                variant="outline"
                size="icon"
                disabled
                aria-label="Toggle color theme"
            >
                <SunIcon className="size-4" />
            </Button>
        )
    }

    const isDark = resolvedTheme === 'dark'

    return (
        <Button
            variant="outline"
            size="icon"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
        >
            {isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
        </Button>
    )
}
