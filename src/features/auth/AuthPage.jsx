import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Tabs from '../../components/Tabs'
import logo from './images/logo.jpg'
import background from './images/background.jpg'
import httpClient from '../../services/httpClient'
import './auth.css'

export const AUTH_KEY = 'bizen-auth'

function AuthPage({ mode, redirectAuthenticated = true }) {
  const isRegister = mode === 'register'
  const navigate = useNavigate()
  const location = useLocation()
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [form, setForm] = useState({ name: '', login: '', password: '' })
  const [acceptedTerms, setAcceptedTerms] = useState(false)
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
            const storage = remember ? localStorage : sessionStorage
            storage.setItem(AUTH_KEY, JSON.stringify(result.data.data))
            navigate(location.state?.from || '/baosoluongkhachhang', { replace: true })
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
  }, [location.state?.from, navigate, remember])

  if (redirectAuthenticated && (localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY))) {
    return <Navigate to="/baosoluongkhachhang" replace />
  }

  function updateField(event) {
    setForm({ ...form, [event.target.name]: event.target.value })
    setMessage('')
  }

  async function submitForm(event) {
    event.preventDefault()
    const email = form.login.trim().toLowerCase()

    if (!email || !form.password) {
      setMessage('Vui lòng điền đầy đủ thông tin.')
      return
    }

    setSubmitting(true)
    try {
      if (isRegister) {
        if (!form.name.trim()) {
          setMessage('Vui lòng điền đầy đủ thông tin.')
          return
        }
        if (form.password.length < 6) {
          setMessage('Mật khẩu cần có ít nhất 6 ký tự.')
          return
        }
        if (!acceptedTerms) {
          setMessage('Vui lòng đồng ý với điều khoản và chính sách bảo mật.')
          return
        }

        const res = await httpClient.post('/user', {
          name: form.name.trim(),
          email,
          password: form.password,
        })

        if (res.data.error || !res.data.data) {
          setMessage(res.data.error || 'Đăng ký thất bại.')
          return
        }

        localStorage.removeItem(AUTH_KEY)
        sessionStorage.removeItem(AUTH_KEY)
        navigate('/login', {
          replace: true,
          state: { message: 'Đăng ký thành công! Hãy đăng nhập bằng tài khoản vừa tạo.' },
        })
        return
      }

      const res = await httpClient.post('/authenticate', { email })
      if (res.data.error || !res.data.data) {
        setMessage(res.data.error || 'Email không tồn tại trên server.')
        return
      }

      const storage = remember ? localStorage : sessionStorage
      storage.setItem(AUTH_KEY, JSON.stringify(res.data.data))
      navigate(location.state?.from || '/baosoluongkhachhang', { replace: true })
    } catch {
      setMessage('Không kết nối được server. Kiểm tra backend cổng 4130.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bizen-auth-app">
      <header className="bizen-header">
        <div className="header-top">
          <div className="header-top-left">
            <span>☎ 090.810.8358 - 0251.389.4657</span>
            <span>✉ Bizhome@bizen.com.vn</span>
            <span>⌖ Lô C2, Khu phố 14, Phường Tam Hiệp, Đồng Nai</span>
          </div>
          <div className="header-top-right">
            <a href="#facebook" aria-label="Facebook">f</a>
            <a href="#youtube" aria-label="Youtube">▶</a>
            <div className="search-bar">
              ⌕
              <input placeholder="Tìm kiếm..." aria-label="Tìm kiếm" />
            </div>
          </div>
        </div>
        <div className="header-main">
          <a className="header-logo" href="/login">
            <img src={logo} alt="Bizen Logo" />
          </a>
          <div className="header-actions">
            <button type="button" className="lang-switch">🇻🇳</button>
            <button type="button" className="lang-switch">🇬🇧</button>
            <a className="btn-outline" href="#profile">HỒ SƠ NĂNG LỰC</a>
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
              <h1>{isRegister ? 'Tạo tài khoản' : 'Chào mừng trở lại'}</h1>
              <Tabs
                className="auth-tabs"
                value={isRegister ? 'register' : 'login'}
                items={[
                  { value: 'login', label: 'Đăng nhập' },
                  { value: 'register', label: 'Đăng ký' },
                ]}
                onChange={(value) => navigate(`/${value}`)}
              />
              {successMessage && (
                <p className="auth-success" role="status">{successMessage}</p>
              )}
              <form onSubmit={submitForm}>
                {isRegister && (
                  <div className="form-group">
                    <label htmlFor="name">Họ và tên</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      value={form.name}
                      onChange={updateField}
                      placeholder="Nhập họ và tên của bạn"
                      required
                    />
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="login">{isRegister ? 'Email' : 'Tên đăng nhập'}</label>
                  <input
                    id="login"
                    name="login"
                    type={isRegister ? 'email' : 'text'}
                    value={form.login}
                    onChange={updateField}
                    placeholder={isRegister ? 'Nhập email của bạn' : 'Email'}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Mật khẩu</label>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={updateField}
                    placeholder={isRegister ? 'Tạo mật khẩu' : 'Nhập mật khẩu'}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? '◉' : '◌'}
                  </button>
                </div>
                {isRegister ? (
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={acceptedTerms}
                      onChange={(event) => setAcceptedTerms(event.target.checked)}
                    />
                    <span>
                      Tôi đồng ý với các <a href="#terms">Điều khoản</a> và{' '}
                      <a href="#privacy">Chính sách bảo mật</a>
                    </span>
                  </label>
                ) : (
                  <div className="form-options">
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={remember}
                        onChange={(event) => setRemember(event.target.checked)}
                      />
                      <span className="slider" />
                      Ghi nhớ đăng nhập
                    </label>
                    <a href="#forgot" className="forgot-password">Quên mật khẩu?</a>
                  </div>
                )}
                {message && <p className="auth-error" role="alert">{message}</p>}
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Đang xử lý...' : isRegister ? 'Đăng ký' : 'Đăng nhập'}
                </button>
                <div className="form-separator" />
                <div ref={googleButtonRef} className="google-login-button" aria-label={isRegister ? 'Đăng ký bằng Google' : 'Đăng nhập bằng Google'} />
              </form>
              <div className="signup-link">
                {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
                <Link to={isRegister ? '/login' : '/register'}>
                  {isRegister ? 'Đăng nhập ngay' : 'Đăng ký ngay'}
                </Link>
              </div>
            </div>
            <div className="form-footer">
              <div className="footer-left">
                <img src={logo} alt="" />
                <a href="#instagram">@bizencatering</a>
              </div>
              <div>© Bizen Service 2024</div>
            </div>
          </section>
        </div>
      </main>
      <footer className="bizen-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <img src={logo} alt="Bizen Logo" />
            <p>
              Bizen chuyên cung cấp Suất ăn công nghiệp từ Bếp trung tâm, Bếp tại nhà máy
              và phục vụ tiệc công ty chuyên nghiệp hàng đầu.
            </p>
            <div className="footer-socials">
              <a href="#facebook">f</a>
              <a href="#youtube">▶</a>
              <a href="#linkedin">in</a>
            </div>
          </div>
          <div className="footer-links">
            <h4>Về Chúng Tôi</h4>
            <a href="#about">Giới thiệu Bizen</a>
            <a href="#services">Dịch vụ cung cấp</a>
            <a href="#profile">Hồ sơ năng lực</a>
            <a href="#news">Tin tức & Sự kiện</a>
            <a href="#jobs">Cơ hội việc làm</a>
          </div>
          <div className="footer-contact">
            <h4>Thông Tin Liên Hệ</h4>
            <p>⌖ Lô C2, Khu phố 14, Phường Tam Hiệp, Thành phố Đồng Nai</p>
            <p>☎ 090.810.8358 - 0251.389.4657</p>
            <p>✉ Bizhome@bizen.com.vn</p>
            <p>⌕ bizencatering.com</p>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2024 Bizen Catering Service. All rights reserved.</span>
          <span>Thiết kế với <b>♥</b> bởi Bizen Team</span>
        </div>
      </footer>
    </div>
  )
}

export default AuthPage