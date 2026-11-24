/**
 * src/App.tsx
 *
 * Task 04 — App entry is now just the router. The full route table lives
 * in src/app/routing/router.tsx; providers (error boundary, theme,
 * query client, session, toaster) wrap this component in main.tsx.
 *
 * The /docs and /styleguide path checks that used to live here moved
 * into real routes (task 04).
 */

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/app/providers/use-session'
import { AppRouter } from '@/app/routing/app-router'

export function SessionCacheGuard() {
  const { role } = useSession()
  const queryClient = useQueryClient()
  const previousRoleRef = useRef(role)

  useEffect(() => {
    const previousRole = previousRoleRef.current
    previousRoleRef.current = role

    if (previousRole !== 'public' && role === 'public') {
      queryClient.clear()
    }
  }, [queryClient, role])

  return null
}

function App() {
  return (
    <>
      <SessionCacheGuard />
      <AppRouter />
    </>
  )
}

export default App
