/**
 * Lightweight, dependency-free crash + performance monitoring.
 *
 * Why not Firebase Crashlytics directly?
 * The project uses the *JS* `firebase` SDK (for phone auth). Crashlytics and
 * Performance Monitoring are NOT available through the JS SDK on React Native —
 * they require the native `@react-native-firebase/crashlytics` /
 * `@react-native-firebase/perf` modules and a native rebuild.
 *
 * This service gives you working capture today with zero new dependencies, and
 * is structured so you can forward events to Sentry or @react-native-firebase
 * later by filling in `sendToRemote()` (see PRODUCTION_RELEASE_CHANGES.md).
 */

interface ErrorUtilsShim {
  getGlobalHandler?: () => (error: any, isFatal?: boolean) => void
  setGlobalHandler?: (handler: (error: any, isFatal?: boolean) => void) => void
}

declare const ErrorUtils: ErrorUtilsShim

type MonitoringContext = Record<string, string | number | boolean | null | undefined>

const REMOTE_URL = process.env.EXPO_PUBLIC_MONITORING_URL // optional ingest endpoint

let initialized = false
const traces: Record<string, number> = {}

/**
 * Best-effort forward to a remote sink. No-op if no URL configured.
 * Replace the body with Sentry.captureException / crashlytics().recordError
 * when you adopt a full SDK.
 */
async function sendToRemote(payload: Record<string, unknown>) {
  if (!REMOTE_URL) return
  try {
    await fetch(REMOTE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, ts: new Date().toISOString() }),
    })
  } catch {
    // Never let monitoring throw.
  }
}

export const Monitoring = {
  /**
   * Install global JS error handler. Call once at app startup.
   */
  init() {
    if (initialized) return
    initialized = true

    try {
      if (typeof ErrorUtils !== 'undefined' && ErrorUtils.setGlobalHandler) {
        const previousHandler = ErrorUtils.getGlobalHandler?.()
        ErrorUtils.setGlobalHandler((error: any, isFatal?: boolean) => {
          Monitoring.logError(error, { fatal: !!isFatal, source: 'globalHandler' })
          previousHandler?.(error, isFatal)
        })
      }
    } catch {
      // ignore
    }

    // Capture unhandled promise rejections where supported.
    try {
      const g: any = global as any
      if (g?.process?.on) {
        g.process.on('unhandledRejection', (reason: any) => {
          Monitoring.logError(reason, { source: 'unhandledRejection' })
        })
      }
    } catch {
      // ignore
    }
  },

  logError(error: unknown, context: MonitoringContext = {}) {
    const err = error instanceof Error ? error : new Error(String(error))
    if (__DEV__) {
      console.error('[Monitoring] error:', err.message, context)
    }
    void sendToRemote({
      type: 'error',
      message: err.message,
      stack: err.stack,
      context,
    })
  },

  logEvent(name: string, params: MonitoringContext = {}) {
    if (__DEV__) {
      console.log('[Monitoring] event:', name, params)
    }
    void sendToRemote({ type: 'event', name, params })
  },

  /** Start a named performance trace. */
  startTrace(name: string) {
    traces[name] = Date.now()
  },

  /** Stop a named performance trace and report its duration (ms). */
  stopTrace(name: string, params: MonitoringContext = {}) {
    const start = traces[name]
    if (start == null) return
    const durationMs = Date.now() - start
    delete traces[name]
    if (__DEV__) {
      console.log(`[Monitoring] trace "${name}": ${durationMs}ms`, params)
    }
    void sendToRemote({ type: 'trace', name, durationMs, params })
  },
}
