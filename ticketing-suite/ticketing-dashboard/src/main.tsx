import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './theme/ThemeProvider'
import { NotificationProvider } from './lib/notifications'
import { I18nProvider } from './lib/i18n'
import { FeaturesProvider } from './contexts/FeaturesContext'
import { queryClient } from './lib/queryClient'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProtectedRoute } from './components/ProtectedRoute'
import App from './views/App'
import Dashboard from './views/Dashboard'
import TicketView from './views/TicketView'
import Login from './views/Login'
import HealthDashboard from './views/HealthDashboard'
import UserProfile from './views/UserProfile'
import SiteManagement from './views/SiteManagement'
import RecurringTickets from './components/RecurringTickets'

const router = createBrowserRouter([
  { 
    path: '/login', 
    element: <Login/> 
  },
  { 
    path:'/', 
    element: <ProtectedRoute><App/></ProtectedRoute>, 
    children:[
      { index:true, element:<Dashboard/> },
      { path:'tickets/:id', element:<TicketView/> },
      { path:'health', element:<HealthDashboard/> },
      { path:'profile', element:<UserProfile/> },
      { path:'sites', element:<SiteManagement/> },
      { path:'recurring', element:<RecurringTickets/> },
      { path:'*', element:<Dashboard/> } // Catch-all route
    ]
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />
  }
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <I18nProvider>
            <FeaturesProvider>
              <NotificationProvider>
                <RouterProvider router={router} />
              </NotificationProvider>
            </FeaturesProvider>
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
