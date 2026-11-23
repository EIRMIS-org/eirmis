import { RouterProvider } from 'react-router-dom'
import { router } from './router'

/** App entry renders this — keeps App.tsx a one-liner. */
export function AppRouter() {
  return <RouterProvider router={router} />
}
