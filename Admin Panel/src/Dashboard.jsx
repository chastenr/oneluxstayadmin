import { useNavigate } from 'react-router-dom'
import { useAuth } from './authContext.jsx'

function Dashboard() {
  const navigate = useNavigate()
  const { user, supabase } = useAuth()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/signin', { replace: true })
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">CONTROL PANEL</p>
          <h1 className="hero-title">Welcome back to ONELUXSTAY.</h1>
          <p className="hero-text">
            Signed in as {user?.email ?? 'unknown user'}.
          </p>
        </div>
        <button className="button button-secondary" type="button" onClick={handleSignOut}>
          Sign out
        </button>
      </section>

      <section className="metrics-grid">
        <article className="metric-card">
          <p className="metric-value">24</p>
          <p className="metric-label">Arrivals being tracked</p>
        </article>
        <article className="metric-card">
          <p className="metric-value">08</p>
          <p className="metric-label">Housekeeping tasks pending</p>
        </article>
        <article className="metric-card">
          <p className="metric-value">4.9</p>
          <p className="metric-label">Guest satisfaction trend</p>
        </article>
      </section>
    </main>
  )
}

export default Dashboard
