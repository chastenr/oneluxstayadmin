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
    <main className="concierge-page">
      <header className="concierge-topbar">
        <div>
          <p className="eyebrow">Latest booking</p>
          <h1 className="concierge-title">Guesty reservation feed.</h1>
        </div>

        <div className="concierge-topbar-actions">
          <span className="user-chip">{user?.email ?? 'unknown user'}</span>
          <button className="ghost-button" type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </header>

      <section className="concierge-layout">
        <section className="concierge-card">
          <div className="concierge-card-header">
            <div>
              <p className="eyebrow">Reservation</p>
              <h2>Latest booking feed</h2>
            </div>
            <span className="status-pill status-pending">Disconnected</span>
          </div>

          <p className="body-copy">
            Live booking sync has been removed from this project for now. Reconnect your own
            backend when you are ready to restore this page.
          </p>
        </section>

        <aside className="concierge-copy">
          <p className="eyebrow">Next step</p>
          <h2 className="display-title">Rebuild the booking connection your way.</h2>
          <p className="body-copy">
            The UI is still here, but the deployment and server-side booking feed have been
            intentionally removed.
          </p>
          <Link className="secondary-link" to="/dashboard">
            Back to assistant
          </Link>
        </aside>
      </section>
    </main>
  )
}

export default LatestBooking
