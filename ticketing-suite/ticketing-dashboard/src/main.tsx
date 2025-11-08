import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './theme/ThemeProvider'
import { NotificationProvider } from './lib/notifications'
import { I18nProvider } from './lib/i18n'
import { queryClient } from './lib/queryClient'
import { ErrorBoundary } from './components/ErrorBoundary'
import App from './views/App'
import Dashboard from './views/Dashboard'
import TicketView from './views/TicketView'
import Login from './views/Login'
import HealthDashboard from './views/HealthDashboard'
import UserProfile from './views/UserProfile'
import SiteManagement from './views/SiteManagement'

const router = createBrowserRouter([
  { path: '/login', element: <Login/> },
  { path:'/', element:<App/>, children:[
    { index:true, element:<Dashboard/> },
    { path:'/tickets/:id', element:<TicketView/> },
    { path:'/health', element:<HealthDashboard/> },
    { path:'/profile', element:<UserProfile/> },
    { path:'/sites', element:<SiteManagement/> }
  ]}
])

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <I18nProvider>
            <NotificationProvider>
              <RouterProvider router={router} />
            </NotificationProvider>
          </I18nProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)
