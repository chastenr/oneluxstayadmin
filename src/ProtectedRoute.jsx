import { Navigate } from 'react-router-dom'
import { useAuth } from './authContext.jsx'

function ProtectedRoute({ children, requireSuperAdmin = false }) {
  const { user, loading, isSuperAdmin } = useAuth()

  if (loading) {
    return <p>Checking your session...</p>
  }

  if (!user) {
    return <Navigate to="/signin" replace />
  }

  if (requireSuperAdmin && !isSuperAdmin) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

export default ProtectedRoute
