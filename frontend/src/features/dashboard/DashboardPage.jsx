import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import httpClient from '../../services/httpClient'
import { canAccessTab, getStoredUser } from '../admin/permissions'
import './dashboardPage.css'

const EMPTY = '—'
const EMPTY_REQUEST = Promise.resolve({ data: { data: [] } })

function canReadDashboardData(permission) {
  return canAccessTab(getStoredUser(), permission)
}

function asText(value) {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(', ')
  if (value.text) return String(value.text)
  if (value.value) return asText(value.value)
  return ''
}

function formatNumber(value, fractionDigits = 0) {
  if (!Number.isFinite(Number(value))) return EMPTY
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: fractionDigits }).format(Number(value))
}

function formatMoney(value) {
  if (!Number.isFinite(Number(value))) return EMPTY
  return `${formatNumber(value)} đ`
}

function dateKey(value) {
  const date = new Date(Number.isFinite(Number(value)) ? Number(value) : value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function dateLabel(value) {
  const key = dateKey(value)
  return key ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(new Date(`${key}T00:00:00`)) : EMPTY
}

function activityTime(value) {
  if (!value) return EMPTY
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return EMPTY
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)
}

function startOfWeek(date) {
  const result = new Date(date)
  const day = result.getDay()
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1))
  result.setHours(0, 0, 0, 0)
  return result
}

function StatCard({ icon, title, value, detail, tone = '' }) {
  return <article className={`home-stat ${tone}`}><span className="home-stat-icon" aria-hidden="true">{icon}</span><div><span className="home-stat-title">{title}</span><strong>{value}</strong>{detail && <small>{detail}</small>}</div></article>
}

function DashboardPage() {
  const [data, setData] = useState({ clients: [], foods: [], materials: [], receipts: [], boms: [], menu: [], activities: [] })
  const [selectedClient, setSelectedClient] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function loadDashboard() {
      setLoading(true)
      setError('')
      const requests = await Promise.allSettled([
        httpClient.post('/larksuite/list_client'),
        canReadDashboardData('lamthucdontuan') ? httpClient.get('/catering/list') : EMPTY_REQUEST,
        canReadDashboardData('dongianguyenvatlieu') || canReadDashboardData('bommonan')
          ? httpClient.get('/catering/don_gia_nguyen_vat_lieus')
          : EMPTY_REQUEST,
        canReadDashboardData('nhapnguyenvatlieu') ? httpClient.get('/catering/nhap_nguyen_vat_lieus') : EMPTY_REQUEST,
        canReadDashboardData('bommonan') ? httpClient.get('/catering/bom_mon_ans') : EMPTY_REQUEST,
        httpClient.get('/activities?limit=8'),
      ])
      if (!active) return
      const [clientRes, foodRes, materialRes, receiptRes, bomRes, activityRes] = requests
      const read = (result) => result.status === 'fulfilled' && !result.value.data?.error ? result.value.data?.data || [] : []
      const nextData = { clients: read(clientRes), foods: read(foodRes), materials: read(materialRes), receipts: read(receiptRes), boms: read(bomRes), activities: read(activityRes), menu: [] }
      setData(nextData)
      setSelectedClient((current) => current || nextData.clients[0] || '')
      if (requests.every((result) => result.status === 'rejected')) setError('Không tải được dữ liệu trang chủ.')
      setLoading(false)
    }
    loadDashboard()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!selectedClient || !canReadDashboardData('lamthucdontuan')) return undefined
    let active = true
    httpClient.post('/larksuite/thuc_don_tuan', { client_code: selectedClient })
      .then((response) => { if (active) setData((current) => ({ ...current, menu: response.data?.error ? [] : response.data?.data || [] })) })
      .catch(() => { if (active) setData((current) => ({ ...current, menu: [] })) })
    return () => { active = false }
  }, [selectedClient])

  const weekStart = startOfWeek(new Date())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekStartKey = dateKey(weekStart)
  const weekEndKey = dateKey(weekEnd)
  const currentWeekMenu = data.menu.filter((item) => {
    const key = dateKey(item.Ngay)
    return !key || (key >= weekStartKey && key <= weekEndKey)
  })
  const receiptTotal = data.receipts.reduce((sum, row) => sum + Number(row.total_amount || Number(row.quantity || 0) * Number(row.unit_price || 0)), 0)
  const recentReceipts = [...data.receipts].sort((a, b) => new Date(b.input_date || 0) - new Date(a.input_date || 0)).slice(0, 4)
  const costByDay = Array.from({ length: 7 }, (_, index) => {
    const day = new Date()
    day.setHours(0, 0, 0, 0)
    day.setDate(day.getDate() - (6 - index))
    const key = dateKey(day)
    return { key, label: dateLabel(day), value: data.receipts.filter((row) => dateKey(row.input_date) === key).reduce((sum, row) => sum + Number(row.total_amount || 0), 0) }
  })
  const maxCost = Math.max(...costByDay.map((day) => day.value), 0)
  const menuDays = currentWeekMenu.slice(0, 6)
  const today = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date())

  return <main className="home-page">
    <header className="home-header"><div><span className="home-kicker">BIZEN CATERING</span><h1>Trang chủ</h1><p>Tổng quan hệ thống theo dữ liệu hiện có</p></div><button type="button" className="home-refresh" onClick={() => window.location.reload()} aria-label="Tải lại dữ liệu">↻ Tải lại</button></header>
    {error && <div className="home-error" role="alert">{error}</div>}
    <section className="home-stats">
      <StatCard icon="♙" title="Tổng số khách hàng" value={loading ? '...' : formatNumber(data.clients.length)} detail="Từ danh sách khách hàng Lark" tone="teal" />
      <StatCard icon="♨" title="Món ăn" value={loading ? '...' : formatNumber(data.foods.length)} detail="Từ dữ liệu món ăn" tone="orange" />
      <StatCard icon="▣" title="Chi phí nhập NVL" value={loading ? '...' : formatMoney(receiptTotal)} detail="Tổng phiếu nhập đang có" tone="blue" />
      <StatCard icon="▤" title="Lệnh sản xuất" value={EMPTY} detail="API hiện chỉ tra theo khách hàng/ngày" tone="gray" />
      <StatCard icon="!" title="Cảnh báo" value={EMPTY} detail="Chưa có API cảnh báo tổng hợp" tone="warning" />
    </section>

    <section className="home-main-grid">
      <article className="home-panel home-menu-panel"><div className="home-panel-heading"><div><h2>Thực đơn tuần này</h2><span>{selectedClient || 'Chưa chọn khách hàng'}</span></div><select aria-label="Chọn khách hàng" value={selectedClient} onChange={(event) => setSelectedClient(event.target.value)}><option value="">Chọn khách hàng</option>{data.clients.map((client) => <option key={client} value={client}>{client}</option>)}</select></div><div className="home-week-label">{dateLabel(weekStart)} - {dateLabel(weekEnd)}</div>{menuDays.length ? <div className="home-menu-list">{menuDays.map((item, index) => <div className="home-menu-row" key={`${item.Ngay}-${index}`}><span>{dateLabel(item.Ngay)}</span><strong>{asText(item.MonAn) || EMPTY}</strong><small>{asText(item.Ca) || asText(item.SiteAn) || EMPTY}</small></div>)}</div> : <div className="home-empty">{loading ? 'Đang tải thực đơn...' : 'Chưa có dữ liệu thực đơn cho khách hàng này.'}</div>}<Link className="home-panel-link" to="/lamthucdontuan">Mở làm menu tuần →</Link></article>
      <article className="home-panel home-chart-panel"><div className="home-panel-heading"><div><h2>Chi phí nguyên vật liệu</h2><span>7 ngày gần nhất từ phiếu nhập</span></div></div><div className="home-chart">{costByDay.map((day) => <div className="home-chart-column" key={day.key}><span>{day.value ? formatMoney(day.value) : EMPTY}</span><div className="home-chart-bar" style={{ height: maxCost ? `${Math.max((day.value / maxCost) * 100, 4)}%` : '4%' }} /><small>{day.label}</small></div>)}</div></article>
    </section>

    <section className="home-lower-grid"><article className="home-panel"><div className="home-panel-heading"><h2>Dữ liệu cần chú ý</h2><span className="home-muted"></span></div><div className="home-notice-list"><div className="home-notice"><span>●</span><div><strong>Phiếu nhập NVL</strong><small>{data.receipts.length ? `${formatNumber(data.receipts.length)} phiếu đang có dữ liệu` : 'Chưa có dữ liệu'}</small></div></div><div className="home-notice"><span>●</span><div><strong>Đơn giá NVL</strong><small>{data.materials.length ? `${formatNumber(data.materials.length)} nguyên vật liệu` : 'Chưa có dữ liệu'}</small></div></div><div className="home-notice"><span>●</span><div><strong>BOM món ăn</strong><small>{data.boms.length ? `${formatNumber(data.boms.length)} BOM đang có dữ liệu` : 'Chưa có dữ liệu'}</small></div></div></div></article><article className="home-panel"><div className="home-panel-heading"><h2>Lối tắt chức năng</h2></div><div className="home-shortcuts"><Link to="/nhapnguyenvatlieu">＋ Nhập NVL</Link><Link to="/lamthucdontuan">▣ Làm menu tuần</Link><Link to="/bommonan">▤ BOM món ăn</Link><Link to="/kiemthucbabuoc">✓ Kiểm thực</Link><Link to="/dongianguyenvatlieu">₫ Đơn giá NVL</Link><Link to="/baosoluongkhachhang">♙ Báo số lượng</Link></div></article><article className="home-panel"><div className="home-panel-heading"><h2>Nhập NVL gần đây</h2><Link className="home-panel-link" to="/nhapnguyenvatlieu">Xem tất cả</Link></div>{recentReceipts.length ? <div className="home-recent-list">{recentReceipts.map((row) => <div className="home-recent-row" key={row._id}><span className="home-recent-icon">▣</span><div><strong>{row.nvl_name || EMPTY}</strong><small>{formatNumber(row.quantity, 2)} {row.nvl_unit || ''} · {dateLabel(row.input_date)}</small></div><b>{formatMoney(row.total_amount)}</b></div>)}</div> : <div className="home-empty">Chưa có dữ liệu nhập nguyên vật liệu.</div>}</article></section>
      <section className="home-lower-grid"><article className="home-panel"><div className="home-panel-heading"><h2>Hoạt động gần đây</h2><span className="home-muted"></span></div>{data.activities.length ? <div className="home-activity-list">{data.activities.map((activity) => { const actor = activity.actorEmail || activity.actorName || 'Tài khoản chưa xác định'; return <div className="home-activity-row" key={activity._id}>{activity.actorPicture ? <img className="home-activity-avatar" src={activity.actorPicture} alt="" /> : <span className="home-activity-avatar">{asText(actor).slice(0, 1).toUpperCase() || '?'}</span>}<div><strong>{actor}</strong><small>{activity.details || `${activity.action || 'Đã thao tác'} ${activity.resource || ''}`}</small></div><time>{activityTime(activity.createdAt)}</time></div> })}</div> : <div className="home-empty">Chưa có hoạt động được ghi nhận.</div>}</article></section>
    <section className="home-summary"><div><span>{today}</span><h2></h2></div><div className="home-summary-metric"><strong>{formatNumber(data.boms.length)}</strong><span>BOM món ăn</span></div><div className="home-summary-metric"><strong>{formatNumber(data.materials.length)}</strong><span>Đơn giá NVL</span></div><div className="home-summary-metric"><strong>{formatNumber(data.receipts.length)}</strong><span>Phiếu nhập</span></div></section>
  </main>
}

export default DashboardPage