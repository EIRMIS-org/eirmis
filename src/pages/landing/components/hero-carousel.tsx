import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import heroSlide1 from '@/assets/hero-carousel-1.webp'
import heroSlide2 from '@/assets/hero-carousel-2.webp'
import heroSlide3 from '@/assets/hero-carousel-3.webp'
import heroSlide4 from '@/assets/hero-carousel-4.webp'
import heroSlide5 from '@/assets/hero-carousel-5.webp'
import { cn } from '@/lib/utils'

interface HeroSlide {
  src: string
  alt: string
}

const HERO_SLIDES: HeroSlide[] = [
  { src: heroSlide1, alt: 'Couple celebrating together at an event' },
  { src: heroSlide2, alt: 'Elegant event table prepared for guests' },
  { src: heroSlide3, alt: 'Guests raising glasses at a celebration' },
  { src: heroSlide4, alt: 'Guests gathering at a busy event' },
  { src: heroSlide5, alt: 'Guests toasting together outdoors' },
]

const AUTO_ADVANCE_MS = 6000

function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = React.useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  React.useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handleChange = () => setPrefersReduced(mediaQuery.matches)
    handleChange()
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return prefersReduced
}

export function HeroCarousel() {
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [isPaused, setIsPaused] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  const goToSlide = React.useCallback((nextIndex: number) => {
    const total = HERO_SLIDES.length
    setActiveIndex(((nextIndex % total) + total) % total)
  }, [])

  React.useEffect(() => {
    if (prefersReducedMotion || isPaused) {
      return
    }
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % HERO_SLIDES.length)
    }, AUTO_ADVANCE_MS)
    return () => window.clearInterval(timer)
  }, [prefersReducedMotion, isPaused])

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      goToSlide(activeIndex - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      goToSlide(activeIndex + 1)
    }
  }

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(event.relatedTarget as Node | null)) {
      setIsPaused(false)
    }
  }

  return (
    <div
      ref={containerRef}
      role="region"
      aria-roledescription="carousel"
      aria-label="Event moments"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={handleBlur}
      className="relative mt-10 overflow-hidden rounded-3xl border border-white/15 bg-slate-800 shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-300 sm:mt-14"
    >
      <div className="relative h-56 w-full sm:h-80 lg:h-[26rem]">
        {HERO_SLIDES.map((slide, index) => {
          const isActive = index === activeIndex
          const isFirst = index === 0
          return (
            <div
              key={slide.src}
              aria-label={`Slide ${index + 1} of ${HERO_SLIDES.length}`}
              aria-hidden={!isActive}
              className={cn(
                'absolute inset-0 transition-opacity duration-500',
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none',
              )}
            >
              <img
                src={slide.src}
                alt={slide.alt}
                loading={isFirst ? 'eager' : 'lazy'}
                fetchPriority={isFirst ? 'high' : undefined}
                className="h-full w-full object-cover"
              />
            </div>
          )
        })}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-slate-950/80 via-slate-950/5 to-transparent"
        />
        <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-end justify-between gap-3 sm:bottom-7 sm:left-7 sm:right-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-200">
              EIRMIS · Event operations
            </p>
            <p className="mt-1 font-heading text-lg font-bold text-white sm:text-2xl">
              Every guest experience, thoughtfully connected.
            </p>
          </div>
          <div className="pointer-events-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToSlide(activeIndex - 1)}
              aria-label="Previous event image"
              className="flex size-8 items-center justify-center rounded-full border border-white/20 bg-slate-950/60 text-white backdrop-blur-xs transition hover:bg-slate-950/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <div
              role="tablist"
              aria-label="Choose event image"
              className="flex items-center gap-1.5 px-1"
            >
              {HERO_SLIDES.map((slide, index) => {
                const selected = index === activeIndex
                return (
                  <button
                    key={slide.src}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-label={`Show event image ${index + 1}`}
                    onClick={() => goToSlide(index)}
                    className={cn(
                      'h-2 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300',
                      selected ? 'w-6 bg-teal-300' : 'w-2 bg-white/45 hover:bg-white/75',
                    )}
                  />
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => goToSlide(activeIndex + 1)}
              aria-label="Next event image"
              className="flex size-8 items-center justify-center rounded-full border border-white/20 bg-slate-950/60 text-white backdrop-blur-xs transition hover:bg-slate-950/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-300"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}