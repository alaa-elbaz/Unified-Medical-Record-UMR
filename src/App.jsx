import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext.jsx'
import { DarkModeProvider } from './context/DarkModeContext.jsx'
import { PublicSettingsProvider } from './components/PublicSettingsProvider.jsx'
import MaintenanceGate from './components/MaintenanceGate.jsx'
import AnnouncementBanner from './components/AnnouncementBanner.jsx'
import AppRouter from './router/AppRouter.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import AiChatbotWidget from './components/chat/AiChatbotWidget.jsx'

export default function App() {
  return (
    <ErrorBoundary>
      <DarkModeProvider>
        <PublicSettingsProvider>
          <AuthProvider>
            <MaintenanceGate>
              <AnnouncementBanner />
              <AppRouter />
              <AiChatbotWidget />
            </MaintenanceGate>
            <Toaster
              position="top-center"
              richColors
              closeButton
              // Long Arabic toasts can stack and overlap on top-center;
              // explicitly setting `expand` plus a tighter `gap` produces
              // a cleaner stack on mobile.
              expand
              gap={8}
            />
          </AuthProvider>
        </PublicSettingsProvider>
      </DarkModeProvider>
    </ErrorBoundary>
  )
}
