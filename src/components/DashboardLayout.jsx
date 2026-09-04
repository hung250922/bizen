import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AUTH_KEY } from '../features/auth/AuthPage'
import './dashboard.css'
import logo from '../features/auth/images/logo.jpg'
import { canAccessTab, getStoredUser } from '../features/admin/permissions'
import httpClient from '../services/httpClient'

const menuItems = [
 {
    to: '/lamthucdontuan',
    label: 'Làm menu thực đơn tuần',
    icon: '⚙',
    permission: 'lamthucdontuan',
  },
   {
    to: '/monantheomua',
    label: 'Món ăn theo mùa',
    icon: '⊞',
    permission: 'monantheomua',
  },
 {
    to: '/bommonan',
    label: 'BOM món ăn',
    icon: '☷',
    permission: 'bommonan',
  },
  {
    to: '/dongianguyenvatlieu',
    label: 'Đơn giá nguyên vật liệu',
    icon: '♨',
    permission: 'dongianguyenvatlieu',
  },
  {
    to: '/nhapnguyenvatlieu',
    label: 'Nhập nguyên vật liệu',
    icon: '＋',
    permission: 'nhapnguyenvatlieu',
  },
  {
    to: '/dongiasanpham',
    label: 'Đơn giá sản phẩm',
    icon: '▦',
    permission: 'dongiasanpham',
  },
  {
    to: '/cauhinhtinhdiem',
    label: 'Cấu hình tính điểm',
    icon: '₫',
    permission: 'cauhinhtinhdiem',
  },
 {
    to: '/phoihopcombo',
    label: 'Phối hợp combo',
    icon: '▤',
    permission: 'phoihopcombo',
  },
  {
    to: '/lenhsanxuat',
    label: 'Lệnh sản xuất',
    icon: '▥',
    permission: 'lenhsanxuat',
  },
   {
    to: '/kiemthucbabuoc',
    label: 'Kiểm thực 3 bước',
    icon: '▥',
    permission: 'kiemthucbabuoc',
  },
 {
    to: '/baosoluongkhachhang',
    label: 'Báo số lượng (khách hàng)',
    icon: '♙',
    permission: 'baosoluongkhachhang',
  },
  {
    to: '/baosoluongquanlysite',
    label: 'Báo số lượng (quản lý site)',
    icon: '♙',
    permission: 'baosoluongquanlysite',
  },
  {
    to: '/Admin',
    label: 'Admin',
    icon: '♙',
    permission: 'admin',
  },
]

function DashboardLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [pageLoading, setPageLoading] = useState(false)
  const currentUser = getStoredUser()
  const greetingName = currentUser?.email?.split('@')[0] || currentUser?.name || 'bạn'

  useEffect(() => {
    const userId = currentUser?._id
    if (!userId) return undefined
    const sendPresence = () => httpClient.post(`/user/${userId}/presence`, { isOnline: true }).catch(() => {})
    sendPresence()
    const heartbeat = window.setInterval(sendPresence, 30000)
    return () => window.clearInterval(heartbeat)
  }, [currentUser?._id])

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''

    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    setPageLoading(true)

    const timer = window.setTimeout(() => {
      setPageLoading(false)
    }, 450)

    return () => window.clearTimeout(timer)
  }, [location.pathname])

  async function handleLogout() {
    if (currentUser?._id) {
      await httpClient.post(`/user/${currentUser._id}/presence`, { isOnline: false }).catch(() => {})
    }
    localStorage.removeItem(AUTH_KEY)
    sessionStorage.removeItem(AUTH_KEY)

    navigate('/login', { replace: true })
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false)
  }

  return (
    <div className="dashboard-layout">

      {/* NÚT MENU MOBILE */}
      <button
        type="button"
        className="mobile-menu-button"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Mở menu"
      >
        ☰
      </button>

      {/* LỚP NỀN KHI MENU MOBILE MỞ */}
      {mobileMenuOpen && (
        <div
          className="dashboard-overlay"
          onClick={closeMobileMenu}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`dashboard-sidebar ${
          mobileMenuOpen ? 'mobile-open' : ''
        }`}
        aria-label="Điều hướng Bizen"
      >

        {/* LOGO */}
        <NavLink
          to="/baosoluongkhachhang"
          className="dashboard-brand"
          onClick={closeMobileMenu}
        >
          <img
            src={logo}
            alt="Bizen"
            className="dashboard-brand-logo"
          />
          <span className="dashboard-greeting">Xin chào {greetingName}</span>
        </NavLink>

        {/* NÚT ĐÓNG MOBILE */}
        <button
          type="button"
          className="mobile-close-button"
          onClick={closeMobileMenu}
          aria-label="Đóng menu"
        >
          ×
        </button>

        {/* MENU */}
        <nav className="dashboard-tabs">

          {menuItems.filter((item) => !item.permission || canAccessTab(currentUser, item.permission)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={closeMobileMenu}
              className={({ isActive }) =>
                `dashboard-tab${isActive ? ' active' : ''}`
              }
            >
              <span
                className="dashboard-tab-icon"
                aria-hidden="true"
              >
                {item.icon}
              </span>

              <span>
                {item.label}
              </span>
            </NavLink>
          ))}

        </nav>

        {/* ĐĂNG XUẤT */}
        <div className="dashboard-sidebar-bottom">

          <button
            type="button"
            className="dashboard-logout"
            onClick={handleLogout}
          >
            <span aria-hidden="true">
              ↪
            </span>

            <span>
              Đăng xuất
            </span>
          </button>

        </div>

      </aside>

      {/* CONTENT */}
      <main className="dashboard-main">
        {pageLoading && (
          <div className="dashboard-page-loading" role="status" aria-label="Đang tải trang">
            <div className="dashboard-page-spinner" />
          </div>
        )}
        <Outlet />
      </main>

    </div>
  )
}

export default DashboardLayout