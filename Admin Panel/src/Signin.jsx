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
    <main className="minimal-shell">
      <section className="minimal-panel minimal-panel-form">
        <p className="eyebrow">ONELUXSTAY</p>
        <h1 className="minimal-title">Log in</h1>
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
          <button className="button button-primary" type="submit" disabled={submitting}>
            {submitting ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        {error ? <p className="status-message status-error">{error}</p> : null}
      </section>
    </main>
  )
}

export default Signin
