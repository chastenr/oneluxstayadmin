import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from './authContext.jsx'

const apiBase = import.meta.env.VITE_API_BASE || '/.netlify/functions'

async function readJsonResponse(response) {
  const text = await response.text()

  if (!text) {
    throw new Error('The server returned an empty response.')
  }

  try {
    return JSON.parse(text)
  } catch {
    if (text.startsWith('<!doctype html') || text.startsWith('<html')) {
      throw new Error(
        'The latest-booking function is not running on this URL yet. If you are testing locally, use Netlify Dev or deploy the site first.'
      )
    }

    throw new Error(text)
  }
}

function LatestBooking() {
  const navigate = useNavigate()
  const { user, supabase } = useAuth()
  const [booking, setBooking] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/signin', { replace: true })
  }

  useEffect(() => {
    let isMounted = true

    async function loadLatestBooking() {
      setLoading(true)
      setError('')

      try {
        const response = await fetch(`${apiBase}/guesty-latest-booking`)
        const data = await readJsonResponse(response)

        if (!response.ok) {
          throw new Error(data.error ?? 'Unable to load the latest booking.')
        }

        if (!isMounted) {
          return
        }

        setBooking(data.booking ?? null)
      } catch (requestError) {
        if (!isMounted) {
          return
        }

        setError(requestError.message)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadLatestBooking()

    return () => {
      isMounted = false
    }
  }, [])

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
              <h2>Newest booking</h2>
            </div>
            <span className="status-pill status-pending">{loading ? 'Loading' : 'Guesty'}</span>
          </div>

          {booking ? (
            <div className="booking-detail-list">
              <div className="booking-detail-row">
                <span>Guest</span>
                <strong>{booking.guestName}</strong>
              </div>
              <div className="booking-detail-row">
                <span>Listing</span>
                <strong>{booking.listingName}</strong>
              </div>
              <div className="booking-detail-row">
                <span>Status</span>
                <strong>{booking.status}</strong>
              </div>
              <div className="booking-detail-row">
                <span>Source</span>
                <strong>{booking.source}</strong>
              </div>
              <div className="booking-detail-row">
                <span>Check-in</span>
                <strong>{booking.checkIn || 'Unknown'}</strong>
              </div>
              <div className="booking-detail-row">
                <span>Check-out</span>
                <strong>{booking.checkOut || 'Unknown'}</strong>
              </div>
              <div className="booking-detail-row">
                <span>Confirmation</span>
                <strong>{booking.confirmationCode}</strong>
              </div>
            </div>
          ) : null}

          {!loading && !booking && !error ? (
            <p className="body-copy">No booking was returned from Guesty.</p>
          ) : null}

          {error ? <p className="status-error">{error}</p> : null}
        </section>

        <aside className="concierge-copy">
          <p className="eyebrow">Next step</p>
          <h2 className="display-title">Use this as the live booking source.</h2>
          <p className="body-copy">
            This page calls a serverless function that requests the newest reservation from
            Guesty using server-side credentials.
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
