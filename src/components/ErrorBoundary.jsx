import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    // Console (developer aid)
    console.error('[ErrorBoundary]', error, info)
    this.setState({ info })

    // Best-effort report to a tracker if one is wired up. We don't hardcode
    // Sentry; instead we look for a global hook so apps that adopt one
    // (e.g. window.Sentry?.captureException) get reports automatically and
    // apps that don't pay nothing.
    try {
      if (typeof window !== 'undefined') {
        if (window.Sentry?.captureException) {
          window.Sentry.captureException(error, { extra: info })
        } else if (typeof window.onClientError === 'function') {
          window.onClientError(error, info)
        }
      }
    } catch (reportErr) {
      console.warn('[ErrorBoundary] failed to forward error to tracker', reportErr)
    }
  }

  render() {
    if (this.state.hasError) {
      const showDetails = typeof import.meta !== 'undefined' && import.meta.env?.DEV
      return (
        <div
          className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6 text-center"
          dir="rtl"
        >
          <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full space-y-4">
            <div className="text-5xl">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-800">حدث خطأ غير متوقع</h1>
            <p className="text-gray-500">
              نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.
            </p>

            {showDetails && this.state.error && (
              <details className="text-left bg-red-50 rounded-lg p-3 text-xs text-red-800 max-h-48 overflow-auto" dir="ltr">
                <summary className="cursor-pointer font-bold mb-1">Technical details (dev only)</summary>
                <pre className="whitespace-pre-wrap break-all">
                  {String(this.state.error?.message || this.state.error)}
                  {this.state.info?.componentStack || ''}
                </pre>
              </details>
            )}

            <div className="flex gap-2 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, error: null, info: null })}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
              >
                إعادة المحاولة
              </button>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null, info: null })
                  window.location.href = '/'
                }}
                className="px-6 py-2.5 bg-primary text-white rounded-lg hover:opacity-90 transition font-medium"
              >
                العودة للرئيسية
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
