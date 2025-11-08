import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import App from './views/App'
import Dashboard from './views/Dashboard'
import TicketView from './views/TicketView'
const router = createBrowserRouter([{ path:'/', element:<App/>, children:[
  { index:true, element:<Dashboard/> },
  { path:'/tickets/:id', element:<TicketView/> }
]}], {
  future: {
    v7_startTransition: true,
  },
})
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><RouterProvider router={router} /></React.StrictMode>)
