import { useEffect, useMemo, useState } from 'react'
import httpClient from '../../services/httpClient'
import { allTabPermissionKeys, isAdminUser, tabPermissions } from './permissions'
import './admin.css'

const roleOptions = [
  { value: 'admin', label: 'Quản trị viên' },
  { value: 'manager', label: 'Quản lý site' },
  { value: 'staff', label: 'Nhân viên' },
]

function initials(name) {
  return name.split(' ').slice(-2).map((word) => word[0]).join('')
}

function formatLastSeen(lastSeen, isOnline) {
  if (!lastSeen) return 'Chưa có dữ liệu'
  const date = new Date(lastSeen)
  if (Number.isNaN(date.getTime())) return 'Chưa có dữ liệu'
  const formatted = date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  return isOnline ? `Đang hoạt động · ${formatted}` : formatted
}

function mapUser(user) {
  const isOnline = user.isOnline ?? user.isAuthenticated ?? false
  return {
    id: user._id,
    name: user.name || 'Chưa đặt tên',
    email: user.email || 'Chưa có email',
    role: roleOptions.some((role) => role.value === user.scope) ? user.scope : 'staff',
    online: Boolean(isOnline),
    locked: user.isAuthenticated === false,
    lastSeen: formatLastSeen(user.lastSeen, Boolean(isOnline)),
    color: '#e0f3ef',
    avatar: user.picture || '',
    permissions: Array.isArray(user.permissions) ? user.permissions : (isAdminUser(user) ? allTabPermissionKeys : ['baosoluongkhachhang']),
  }
}

function AdminPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [pendingAction, setPendingAction] = useState(null)

  const filteredUsers = useMemo(() => users.filter((user) => {
    const matchesQuery = `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase())
    const matchesStatus = status === 'all' || (status === 'online' ? user.online : !user.online)
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    return matchesQuery && matchesStatus && matchesRole
  }), [query, roleFilter, status, users])

  async function loadUsers() {
    setLoading(true)
    setError('')
    try {
      const response = await httpClient.get('/users?limit=100')
      if (response.data?.error) throw new Error(response.data.error)
      setUsers((response.data?.data || []).map(mapUser))
    } catch (requestError) {
      setError(requestError.message || 'Không tải được danh sách tài khoản.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
    const refreshTimer = window.setInterval(loadUsers, 30000)
    return () => window.clearInterval(refreshTimer)
  }, [])

  async function updateRole(id, role) {
    try {
      await httpClient.put(`/user/${id}`, { scope: role })
      setUsers((current) => current.map((user) => user.id === id ? { ...user, role } : user))
    } catch (requestError) {
      setError(requestError.message || 'Không cập nhật được vai trò.')
    }
  }

  async function updatePermission(user, permission) {
    const permissions = user.permissions.includes(permission)
      ? user.permissions.filter((item) => item !== permission)
      : [...user.permissions, permission]
    try {
      await httpClient.put(`/user/${user.id}`, { permissions })
      setUsers((current) => current.map((item) => item.id === user.id ? { ...item, permissions } : item))
    } catch (requestError) {
      setError(requestError.message || 'Không cập nhật được quyền của tab.')
    }
  }

  async function confirmAction() {
    if (!pendingAction) return
    try {
      if (pendingAction.type === 'delete') {
        await httpClient.delete(`/user/${pendingAction.user.id}`)
        setUsers((current) => current.filter((user) => user.id !== pendingAction.user.id))
      } else {
        const isAuthenticated = pendingAction.user.locked
        await httpClient.put(`/user/${pendingAction.user.id}`, { isAuthenticated })
        setUsers((current) => current.map((user) => user.id === pendingAction.user.id ? { ...user, locked: !isAuthenticated, online: isAuthenticated } : user))
      }
    } catch (requestError) {
      setError(requestError.message || 'Không thực hiện được thao tác.')
    }
    setPendingAction(null)
  }

  const onlineCount = users.filter((user) => user.online).length
  const lockedCount = users.filter((user) => user.locked).length

  return (
    <section className="admin-page">
      <header className="admin-header"><div><span className="admin-kicker">WORKSPACE / ACCESS CONTROL</span><h1>Quản lý tài khoản</h1><p>Kiểm soát thành viên và quyền truy cập dự án Bizen.</p></div><button type="button" className="admin-primary-button">＋ Mời thành viên</button></header>
      {error && <div className="admin-error" role="alert">{error}<button type="button" onClick={loadUsers}>Thử lại</button></div>}
      <div className="admin-stats"><article className="admin-stat-card admin-stat-card--accent"><span className="stat-icon">◉</span><div><strong>{users.length}</strong><span>Tổng thành viên</span></div></article><article className="admin-stat-card"><span className="stat-icon stat-icon--green">●</span><div><strong>{onlineCount}</strong><span>Đang online</span></div></article><article className="admin-stat-card"><span className="stat-icon stat-icon--gray">◌</span><div><strong>{users.length - onlineCount}</strong><span>Đang offline</span></div></article><article className="admin-stat-card"><span className="stat-icon stat-icon--orange">▣</span><div><strong>{lockedCount}</strong><span>Tài khoản bị khóa</span></div></article></div>
      <div className="admin-toolbar"><div className="admin-tabs" role="tablist">{[['all', 'Tất cả'], ['online', '● Đang online'], ['offline', '○ Offline']].map(([value, label]) => <button key={value} type="button" className={status === value ? 'is-active' : ''} onClick={() => setStatus(value)}>{label}</button>)}</div><div className="admin-filters"><label className="admin-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tên hoặc email..." /></label><select aria-label="Lọc theo vai trò" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}><option value="all">Tất cả vai trò</option>{roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select><button type="button" className="filter-button" onClick={() => { setQuery(''); setRoleFilter('all'); setStatus('all') }}>↺ <span>Làm mới</span></button></div></div>
      <div className="admin-table-shell"><div className="admin-table-heading"><div><h2>Thành viên dự án</h2><span>{filteredUsers.length} tài khoản được hiển thị</span></div><span className="sync-label">● Đồng bộ lần cuối: vừa xong</span></div><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>THÀNH VIÊN</th><th>TRẠNG THÁI</th><th>VAI TRÒ</th><th>TAB ĐƯỢC PHÉP</th><th>HOẠT ĐỘNG GẦN NHẤT</th><th aria-label="Thao tác" /></tr></thead><tbody>{loading ? <tr><td colSpan="6" className="empty-state">Đang tải dữ liệu tài khoản...</td></tr> : filteredUsers.map((user) => <tr key={user.id}><td><div className="member-cell"><div className="avatar-wrap"><img src={user.avatar} alt={`Ảnh đại diện ${user.name}`} onError={(event) => { event.currentTarget.style.display = 'none' }} /><span className="avatar-fallback" style={{ background: user.color }}>{initials(user.name)}</span><i className={user.online ? 'online-dot' : 'online-dot is-offline'} /></div><div><strong>{user.name}</strong><span>{user.email}</span></div></div></td><td><span className={`status-pill ${user.online ? 'is-online' : 'is-offline'}`}><i />{user.online ? 'Đang online' : 'Offline'}</span>{user.locked && <span className="locked-label">Đã khóa</span>}</td><td><select className="role-select" aria-label={`Vai trò của ${user.name}`} value={user.role} onChange={(event) => updateRole(user.id, event.target.value)}>{roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></td><td><div className="permission-grid">{tabPermissions.map((tab) => <button key={tab.key} type="button" className={user.permissions.includes(tab.key) ? 'permission-chip is-allowed' : 'permission-chip'} title={`${user.permissions.includes(tab.key) ? 'Tắt' : 'Bật'} quyền ${tab.label}`} onClick={() => updatePermission(user, tab.key)}>{tab.label}</button>)}</div></td><td><span className="last-seen">{user.lastSeen}</span></td><td><div className="row-actions"><button type="button" title={user.locked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'} className={user.locked ? 'action-button is-locked' : 'action-button'} onClick={() => setPendingAction({ type: 'lock', user })}>⌑</button><button type="button" title="Xóa thành viên" className="action-button action-button--danger" onClick={() => setPendingAction({ type: 'delete', user })}>⌫</button></div></td></tr>)}</tbody></table>{!loading && !filteredUsers.length && <div className="empty-state">Không tìm thấy tài khoản phù hợp.</div>}</div></div>
      {pendingAction && <div className="admin-modal-backdrop" role="presentation" onClick={() => setPendingAction(null)}><div className="admin-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><span className={`modal-symbol ${pendingAction.type === 'delete' ? 'is-danger' : ''}`}>{pendingAction.type === 'delete' ? '⌫' : '⌑'}</span><h2>{pendingAction.type === 'delete' ? 'Xóa thành viên?' : pendingAction.user.locked ? 'Mở khóa tài khoản?' : 'Khóa tài khoản?'}</h2><p>{pendingAction.type === 'delete' ? `Tài khoản ${pendingAction.user.name} sẽ bị xóa khỏi dự án và không thể hoàn tác.` : `Bạn có chắc muốn ${pendingAction.user.locked ? 'mở khóa' : 'khóa'} tài khoản của ${pendingAction.user.name}?`}</p><div className="modal-actions"><button type="button" className="modal-cancel" onClick={() => setPendingAction(null)}>Hủy</button><button type="button" className={pendingAction.type === 'delete' ? 'modal-confirm is-danger' : 'modal-confirm'} onClick={confirmAction}>{pendingAction.type === 'delete' ? 'Xóa thành viên' : pendingAction.user.locked ? 'Mở khóa' : 'Khóa tài khoản'}</button></div></div></div>}
    </section>
  )
}

export default AdminPage
