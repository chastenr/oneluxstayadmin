import { Link } from 'react-router-dom'

function HomePage() {
  return (
    <main className="minimal-shell">
      <section className="minimal-panel">
        <p className="eyebrow">ONELUXSTAY</p>
        <h1 className="minimal-title">Admin Access</h1>
        <Link className="button button-primary" to="/signin">
          Log in
        </Link>
      </section>
    </main>
  )
}

export default HomePage
