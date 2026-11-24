import heroSlide1 from '@/assets/hero-carousel-1.webp'
import heroSlide2 from '@/assets/hero-carousel-2.webp'
import heroSlide3 from '@/assets/hero-carousel-3.webp'
import heroSlide4 from '@/assets/hero-carousel-4.webp'
import heroSlide5 from '@/assets/hero-carousel-5.webp'

const BACKDROP_SLIDES = [heroSlide1, heroSlide2, heroSlide3, heroSlide4, heroSlide5]

/**
 * Ambient backdrop for the landing hero: the event photography crossfades in a
 * slow, infinite, CSS-only loop (no JavaScript timers) behind a dark overlay.
 * Purely decorative, so it is hidden from assistive technology. The animation
 * only runs when the user has not asked for reduced motion; otherwise the
 * first image renders as a static backdrop.
 */
export function HeroBackdrop() {
    return (
        <div
            aria-hidden="true"
            className="hero-backdrop absolute inset-0 overflow-hidden"
        >
            {BACKDROP_SLIDES.map((src, index) => (
                <img
                    key={src}
                    src={src}
                    alt=""
                    loading={index === 0 ? 'eager' : 'lazy'}
                    decoding="async"
                    className="hero-backdrop-slide absolute inset-0 size-full object-cover"
                />
            ))}
            <div className="absolute inset-0 bg-slate-950/80" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(13,148,136,0.35),_transparent_50%)]" />
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-slate-950/60" />
        </div>
    )
}
