import { lazy, Suspense } from 'react'

const Styleguide = lazy(() => import('@/Styleguide'))

export function StyleguideRoute() {
  return (
    <Suspense fallback={<p>Loading style guide...</p>}>
      <Styleguide />
    </Suspense>
  )
}
