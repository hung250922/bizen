export const tabPermissions = [
  { key: 'lamthucdontuan', label: 'Làm menu tuần', path: '/lamthucdontuan' },
  { key: 'monantheomua', label: 'Món ăn theo mùa', path: '/monantheomua' },
  { key: 'bommonan', label: 'BOM món ăn', path: '/bommonan' },
  { key: 'dongianguyenvatlieu', label: 'Đơn giá nguyên vật liệu', path: '/dongianguyenvatlieu' },
  { key: 'nhapnguyenvatlieu', label: 'Nhập nguyên vật liệu', path: '/nhapnguyenvatlieu' },
  { key: 'dongiasanpham', label: 'Đơn giá sản phẩm', path: '/dongiasanpham' },
  { key: 'cauhinhtinhdiem', label: 'Cấu hình tính điểm', path: '/cauhinhtinhdiem' },
  { key: 'phoihopcombo', label: 'Phối hợp combo', path: '/phoihopcombo' },
  { key: 'lenhsanxuat', label: 'Lệnh sản xuất', path: '/lenhsanxuat' },
  { key: 'kiemthucbabuoc', label: 'Kiểm thực 3 bước', path: '/kiemthucbabuoc' },
  { key: 'baosoluongkhachhang', label: 'Báo số lượng khách hàng', path: '/baosoluongkhachhang' },
  { key: 'baosoluongquanlysite', label: 'Báo số lượng quản lý site', path: '/baosoluongquanlysite' },
  { key: 'admin', label: 'Quản trị tài khoản', path: '/Admin' },
]

export const allTabPermissionKeys = tabPermissions.map((item) => item.key)

export function isAdminUser(user) {
  if (!user) return false
  if (user.isSuperAdmin === true || user.is_admin === true) return true
  if (user.scope === 'admin') return true
  if (Array.isArray(user.scope)) return user.scope.includes('admin')
  return user.scope?.name === 'admin' || user.scope?.role === 'admin'
}

export function permissionsForUser(user) {
  if (!user) return []
  if (isAdminUser(user)) return allTabPermissionKeys
  return Array.isArray(user.permissions) ? user.permissions : ['baosoluongkhachhang']
}

export function getStoredUser() {
  try {
    const rawUser = localStorage.getItem('bizen-auth') || sessionStorage.getItem('bizen-auth')
    return rawUser ? JSON.parse(rawUser) : null
  } catch {
    return null
  }
}

export function canAccessTab(user, permission) {
  return permissionsForUser(user).includes(permission)
}
