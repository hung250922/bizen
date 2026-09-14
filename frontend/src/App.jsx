import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'

import AuthPage, { AUTH_KEY, LAST_ROUTE_KEY } from './features/auth/AuthPage'
import DashboardLayout from './components/DashboardLayout'
import BaoSoLuongKhachHang from './features/baosoluong/components/BaoSoLuongKhachHang'
import BaoSoLuongQuanLySitePage from './features/baosoluongquanlysite/components/BaoSoLuongQuanLySitePage'
import LegacyMenuPage from './features/menuthucdontuanzamil/LegacyMenuPage'
import CustomerMenuPage from './features/thucdontuan/components/CustomerMenuPage'
import BomMonAnPage from './features/bommonan/components/BomMonAnPage'
import DonGiaNguyenVatLieuPage from './features/dongianguyenvatlieu/components/DonGiaNguyenVatLieuPage'
import NhapNguyenVatLieuPage from './features/nhapnguyenvatlieu/components/NhapNguyenVatLieuPage'
import DonGiaSanPhamPage from './features/dongiasanpham/components/DonGiaSanPhamPage'
import CauHinhTinhDiemPage from './features/cauhinhtinhdiem/components/CauHinhTinhDiemPage'
import PhoiHopComboPage from './features/phoihopcombo/components/PhoiHopComboPage'
import LenhSanXuatPage from './features/lenhsanxuat/components/LenhSanXuatPage'
import LamThucDonTuanPage from './features/lamthucdontuan/LamThucDonTuanPage'
import MonAnTheoMuaPage from './features/monantheomua/MonAnTheoMuaPage'
import KiemThucBaBuocPage from './features/kiemthucbabuoc/KiemThucBaBuocPage'
import AdminPage from './features/admin/AdminPage'
import DashboardPage from './features/dashboard/DashboardPage'
import ExportExcelPage from './features/exportExcel/ExportExcelPage'
import { canAccessTab, getStoredUser } from './features/admin/permissions'

function ProtectedRoute() {
  const location = useLocation()

  const isLoggedIn =
    localStorage.getItem(AUTH_KEY) ||
    sessionStorage.getItem(AUTH_KEY)

  if (!isLoggedIn) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    )
  }
  return <Outlet />
}

function PermissionRoute({ permission, children }) {
  const user = getStoredUser()
  if (!canAccessTab(user, permission)) {
    return <div style={{ padding: 40 }}><h1>Không có quyền truy cập</h1><p>Liên hệ quản trị viên để được cấp quyền sử dụng tab này.</p></div>
  }
  return children
}

function RootRoute() {
  const isLoggedIn = localStorage.getItem(AUTH_KEY) || sessionStorage.getItem(AUTH_KEY)
  const lastRoute = sessionStorage.getItem(LAST_ROUTE_KEY) || '/dashboard'
  return <Navigate to={isLoggedIn ? lastRoute : '/login'} replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<RootRoute />}
        />
        <Route
          path="/login"
          element={
            <AuthPage
              mode="login"
              redirectAuthenticated={false}
            />
          }
        />
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>

            <Route
              path="/dashboard"
                element={<DashboardPage />}
            />

            <Route
              path="/baosoluongkhachhang"
              element={<PermissionRoute permission="baosoluongkhachhang"><BaoSoLuongKhachHang /></PermissionRoute>}
            />

            <Route
              path="/baosoluongquanlysite"
              element={<PermissionRoute permission="baosoluongquanlysite"><BaoSoLuongQuanLySitePage /></PermissionRoute>}
            />

            <Route
              path="/menuthucdontuanzamil"
              element={<PermissionRoute permission="menuthucdontuanzamil"><LegacyMenuPage /></PermissionRoute>}
            />

            <Route
              path="/thucdontuan"
              element={<PermissionRoute permission="thucdontuan"><CustomerMenuPage /></PermissionRoute>}
            />

            <Route
              path="/bommonan"
              element={<PermissionRoute permission="bommonan"><BomMonAnPage /></PermissionRoute>}
            />

            <Route
              path="/dongianguyenvatlieu"
              element={<PermissionRoute permission="dongianguyenvatlieu"><DonGiaNguyenVatLieuPage /></PermissionRoute>}
            />

            <Route
              path="/nhapnguyenvatlieu"
              element={<PermissionRoute permission="nhapnguyenvatlieu"><NhapNguyenVatLieuPage /></PermissionRoute>}
            />

            <Route
              path="/dongiasanpham"
              element={<PermissionRoute permission="dongiasanpham"><DonGiaSanPhamPage /></PermissionRoute>}
            />

            <Route
              path="/cauhinhtinhdiem"
              element={<PermissionRoute permission="cauhinhtinhdiem"><CauHinhTinhDiemPage /></PermissionRoute>}
            />

            <Route
              path="/phoihopcombo"
              element={<PermissionRoute permission="phoihopcombo"><PhoiHopComboPage /></PermissionRoute>}
            />

            <Route
              path="/lenhsanxuat"
              element={<PermissionRoute permission="lenhsanxuat"><LenhSanXuatPage /></PermissionRoute>}
            />
          <Route path="/lamthucdontuan" element={<PermissionRoute permission="lamthucdontuan"><LamThucDonTuanPage /></PermissionRoute>} />
          <Route path="/monantheomua" element={<PermissionRoute permission="monantheomua"><MonAnTheoMuaPage /></PermissionRoute>} />
          <Route path="/kiemthucbabuoc" element={<PermissionRoute permission="kiemthucbabuoc"><KiemThucBaBuocPage /></PermissionRoute>} />
          <Route path="/export-excel" element={<ExportExcelPage />} />
          <Route path="/Admin" element={<PermissionRoute permission="admin"><AdminPage /></PermissionRoute>} />
          </Route>
          
        </Route>

        <Route
          path="*"
          element={<h1>404 - Không tìm thấy trang</h1>}
        />
      </Routes>
    </BrowserRouter>
  )
}
export default App