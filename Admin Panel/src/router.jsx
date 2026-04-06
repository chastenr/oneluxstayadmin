import { createBrowserRouter } from 'react-router-dom'
import Dashboard from './Dashboard.jsx'
import HomePage from './HomePage.jsx'
import Signup from './Signup.jsx'
import Signin from './Signin.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/signup',
    element: <Signup />,
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
