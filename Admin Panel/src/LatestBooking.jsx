import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './authContext.jsx'

function LatestBooking() {
  const navigate = useNavigate()
  const { user, supabase } = useAuth()

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/signin', { replace: true })
  }

  return (
    <main className="workspace-page">
      <header className="workspace-topbar">
        <div>
          <p className="eyebrow">Latest booking</p>
          <h1 className="workspace-title">Booking feed placeholder.</h1>
          <p className="body-copy">
            This page will show the newest reservation once Guesty is connected.
          </p>
        </div>

        <div className="workspace-actions">
          <span className="user-chip">{user?.email ?? 'unknown user'}</span>
          <button className="ghost-button" type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <section className="workspace-grid">
        <section className="info-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Current state</p>
              <h2>No live booking yet</h2>
            </div>
            <span className="status-pill status-pending">Waiting</span>
          </div>
          <p className="body-copy">
            Guesty is not connected, so there is no reservation data to display here yet.
          </p>
        </section>

        <aside className="side-stack">
          <section className="info-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Back</p>
                <h2>Assistant</h2>
              </div>
            </div>
            <Link className="secondary-link" to="/dashboard">
              Return to assistant
            </Link>
          </section>
        </aside>
      </section>
    </main>
  )
}

export default LatestBooking
