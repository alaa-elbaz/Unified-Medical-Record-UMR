import { useEffect } from 'react'

const APP_NAME = 'MedCore'

/**
 * Sets `document.title` to a per-page string for the lifetime of the
 * component, restoring the original on unmount. Use instead of pulling in
 * react-helmet for a tiny dependency surface.
 *
 * Usage:
 *   usePageTitle('لوحة المريض')   // → "لوحة المريض · MedCore"
 *   usePageTitle()                  // → "MedCore" (just the app name)
 */
export function usePageTitle(title) {
  useEffect(() => {
    const previous = document.title
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
    return () => { document.title = previous }
  }, [title])
}
