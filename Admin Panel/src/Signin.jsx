import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './authContext.jsx'

function Signin() {
  const navigate = useNavigate()
  const { supabase } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    setSubmitting(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    navigate('/dashboard', { replace: true })
  }

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-copy">
          <p className="eyebrow">Private access</p>
          <h1 className="display-title">Log in to the operations desk.</h1>
          <p className="body-copy">
            Internal access for bookings, guest support, and deposit handling.
          </p>
        </div>

        <section className="auth-card">
          <h2>Log in</h2>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                placeholder="admin@oneluxstay.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>
            <label className="field">
              <span>Password</span>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </label>
            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? 'Logging in...' : 'Continue'}
            </button>
          </form>
          {error ? <p className="status-error">{error}</p> : null}
        </section>
      </section>
    </main>
  )
}

export default Signin
