import { Navigate, createBrowserRouter } from 'react-router-dom'
import Dashboard from './Dashboard.jsx'
import HomePage from './HomePage.jsx'
import Signin from './Signin.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/signup',
    element: <Navigate to="/signin" replace />,
  },
  {
    path: '/signin',
    element: <Signin />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
])
