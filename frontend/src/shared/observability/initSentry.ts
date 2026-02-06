import * as Sentry from '@sentry/react'

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined
  if (!dsn) return

  const release = (import.meta.env.VITE_BUILD_SHA as string | undefined) ?? undefined

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release,
    // Keep it minimal and privacy-friendly.
    sendDefaultPii: false,
    tracesSampleRate: 0,
  })
}
