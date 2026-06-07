import { useState } from 'react'
import { login, recoverCode, register } from '../api/client'
import './OnboardingScreen.css'

export default function OnboardingScreen({ onComplete }) {
  const [view, setView]       = useState('main')   // 'main' | 'recover' | 'recover-sent'
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [code, setCode]       = useState('')
  const [recoverEmail, setRecoverEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [newCode, setNewCode] = useState('')

  const isLogin = code.trim().length > 0

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (!isLogin) {
        const data = await register(name.trim(), email.trim())
        localStorage.setItem('jj_access_code', data.access_code)
        if (name.trim()) localStorage.setItem('jobjames_display_name', name.trim())
        setNewCode(data.access_code)
      } else {
        const data = await login(code.trim().toUpperCase(), name.trim())
        localStorage.setItem('jj_access_code', data.access_code)
        if (data.display_name) localStorage.setItem('jobjames_display_name', data.display_name)
        else if (name.trim()) localStorage.setItem('jobjames_display_name', name.trim())
        onComplete(data.access_code, data.display_name || name.trim())
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRecover(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await recoverCode(recoverEmail.trim())
      setView('recover-sent')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleConfirmed() {
    onComplete(newCode, name.trim())
  }

  // ── Code-reveal screen ────────────────────────────────────────────────────────
  if (newCode) {
    return (
      <div className="onboarding-screen">
        <div className="onboarding-card">
          <div className="onboarding-logo">JJ</div>
          <h1 className="onboarding-title">Account created</h1>
          <p className="onboarding-body">
            Save your access code — you'll need it to sign in on other devices or after clearing your browser data.
          </p>
          <div className="onboarding-code-box">
            <span className="onboarding-code-value">{newCode}</span>
          </div>
          <p className="onboarding-code-hint">Write it down or copy it somewhere safe.</p>
          <button className="onboarding-btn" onClick={handleConfirmed}>
            I've saved it — Continue
          </button>
        </div>
      </div>
    )
  }

  // ── Recovery sent confirmation ─────────────────────────────────────────────
  if (view === 'recover-sent') {
    return (
      <div className="onboarding-screen">
        <div className="onboarding-card">
          <div className="onboarding-logo">JJ</div>
          <h1 className="onboarding-title">Check your inbox</h1>
          <p className="onboarding-body">
            If <strong>{recoverEmail}</strong> is registered, we've sent your access code there.
          </p>
          <button className="onboarding-btn" onClick={() => { setView('main'); setRecoverEmail('') }}>
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  // ── Recovery email form ───────────────────────────────────────────────────
  if (view === 'recover') {
    return (
      <div className="onboarding-screen">
        <div className="onboarding-card">
          <div className="onboarding-logo">JJ</div>
          <h1 className="onboarding-title">Recover your code</h1>
          <p className="onboarding-body">
            Enter the email you used when creating your account. We'll send your access code to that address.
          </p>
          <form onSubmit={handleRecover} className="onboarding-form">
            <div className="onboarding-field">
              <label className="onboarding-label" htmlFor="ob-recover-email">Email address</label>
              <input
                id="ob-recover-email"
                type="email"
                value={recoverEmail}
                onChange={e => setRecoverEmail(e.target.value)}
                placeholder="you@example.com"
                className="onboarding-input"
                autoFocus
                required
              />
            </div>
            {error && <p className="onboarding-error">{error}</p>}
            <button type="submit" className="onboarding-btn" disabled={loading || !recoverEmail.trim()}>
              {loading ? 'Sending…' : 'Send recovery email'}
            </button>
          </form>
          <button className="onboarding-link" onClick={() => { setView('main'); setError('') }}>
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <div className="onboarding-screen">
      <div className="onboarding-card">
        <div className="onboarding-logo">JJ</div>
        <h1 className="onboarding-title">JobJames</h1>
        <p className="onboarding-body">Your personal job search dashboard</p>

        <form onSubmit={handleSubmit} className="onboarding-form">
          <div className="onboarding-field">
            <label className="onboarding-label" htmlFor="ob-name">Your name</label>
            <input
              id="ob-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. James"
              className="onboarding-input"
              autoComplete="name"
            />
          </div>

          {!isLogin && (
            <div className="onboarding-field">
              <label className="onboarding-label" htmlFor="ob-email">
                Email
                <span className="onboarding-optional"> — optional, for account recovery</span>
              </label>
              <input
                id="ob-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="onboarding-input"
                autoComplete="email"
              />
            </div>
          )}

          <div className="onboarding-field">
            <label className="onboarding-label" htmlFor="ob-code">
              Access code
              <span className="onboarding-optional"> — leave blank to create a new account</span>
            </label>
            <input
              id="ob-code"
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="XXXX-XXXX"
              className="onboarding-input onboarding-input-mono"
              autoComplete="off"
              spellCheck={false}
            />
            {isLogin && (
              <button
                type="button"
                className="onboarding-link onboarding-link-inline"
                onClick={() => setView('recover')}
              >
                Forgot your code?
              </button>
            )}
          </div>

          {error && <p className="onboarding-error">{error}</p>}

          <button type="submit" className="onboarding-btn" disabled={loading}>
            {loading ? 'One moment…' : isLogin ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}
