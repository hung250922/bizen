import { useEffect, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import logo from './images/logo.jpg'
import background from './images/background.jpg'
import httpClient from '../../services/httpClient'
import './auth.css'

export const AUTH_KEY = 'bizen-auth'
export const LAST_ROUTE_KEY = 'bizen-last-route'

function AuthPage({ mode, redirectAuthenticated = true }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [message, setMessage] = useState('')
  const [successMessage] = useState(location.state?.message || '')
  const [submitting, setSubmitting] = useState(false)
  const googleButtonRef = useRef(null)

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '141211321129-aeithqj8drbjnlb1qeteqh2c29ebtlvl.apps.googleusercontent.com'

    function renderGoogleButton() {
      if (!window.google?.accounts?.id || !googleButtonRef.current) return
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          setSubmitting(true)
          setMessage('')
          try {
            const result = await httpClient.post('/authenticate/google', { credential: response.credential })
            if (result.data?.error || !result.data?.data) throw new Error(result.data?.error || 'Đăng nhập Google thất bại.')
            sessionStorage.setItem(AUTH_KEY, JSON.stringify(result.data.data))
            navigate(location.state?.from || '/dashboard', {
  replace: true,
})
          } catch (error) {
            setMessage(error.response?.data?.error || error.message || 'Đăng nhập Google thất bại.')
          } finally {
            setSubmitting(false)
          }
        },
      })
      googleButtonRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        width: 380,
        text: 'continue_with',
      })
    }

    if (window.google?.accounts?.id) {
      renderGoogleButton()
      return undefined
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = renderGoogleButton
    document.head.appendChild(script)
    return () => script.remove()
  }, [location.state?.from, navigate])

  if (redirectAuthenticated && (localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY))) {
    return <Navigate to="/baosoluongkhachhang" replace />
  }

  return (
    <div className="bizen-auth-app">
      <header className="bizen-header">
        <div className="header-top">
          <a className="header-logo" href="/login">
            <img src={logo} alt="Bizen Logo" />
          </a>
          <div className="header-top-left">
            <span>☎ 090.810.8358 - 0251.389.4657</span>
            <span>✉ Bizhome@bizen.com.vn</span>
            <span>⌖ Lô C2, Khu phố 14, Phường Tam Hiệp, Đồng Nai</span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="split-layout">
          <div className="image-section" style={{ backgroundImage: `url(${background})` }} />
          <section className="form-section">
            <div className="brand">
              <img src={logo} alt="Bizen Logo" />
              <span>Bizen Service</span>
            </div>
            <div className="auth-content">
              {successMessage && (
                <p className="auth-success" role="status">{successMessage}</p>
              )}
              {message && <p className="auth-error" role="alert">{message}</p>}
              <div ref={googleButtonRef} className="google-login-button" aria-label="Đăng nhập bằng Google" />
            </div>
          </section>
        </div>
      </main>
      <footer className="bizen-footer">
        <div className="footer-bottom">
          <span>© 2024 Bizen Catering Service. All rights reserved.</span>
          <span>Thiết kế với <b>♥</b> bởi Bizen Team</span>
        </div>
      </footer>
    </div>
  )
}

export default AuthPage