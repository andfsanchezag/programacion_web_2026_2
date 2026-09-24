/** Aurora Banco — punto de entrada (F1). */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/tokens.css'
import './styles/global.css'
import './styles/components.css'
import { createServices } from './application/container'
import { ServicesProvider, SessionProvider } from './application/session/SessionProvider'
import { AppRouter } from './app/AppRouter'
import { ErrorBoundary } from './app/ErrorBoundary'

const services = createServices()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ServicesProvider services={services}>
          <SessionProvider>
            <AppRouter />
          </SessionProvider>
        </ServicesProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
