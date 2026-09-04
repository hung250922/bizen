import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Tabs from '../../../components/Tabs'
import { AUTH_KEY } from '../../auth/AuthPage'
import httpClient from '../../../services/httpClient'
import '../styles/baoSoLuong.css'

const shifts = [
  { label: 'CA 1', name: 'Ca 1', key: 'ca1' },
  { label: 'CA 2', name: 'Ca 2', key: 'ca2' },
  { label: 'CA 3', name: 'Ca 3', key: 'ca3' },
]

function getRows(shift) {
  return {
    people: [
      { label: `${shift.name} - VPC`, key: `${shift.key}Vpc`, site: 'VPC' },
      { label: `${shift.name} - FAB 1`, key: `${shift.key}Fab`, site: 'FAB 1' },
    ],
    meals: [
      { label: `${shift.name}-VPC-Suất tráng miệng`, key: `${shift.key}VpcDessert`, site: 'VPC', meal: 'Suất tráng miệng' },
      { label: `${shift.name}-VPC-Suất nước`, key: `${shift.key}VpcWater`, site: 'VPC', meal: 'Suất nước' },
      { label: `${shift.name}-VPC-Suất chay`, key: `${shift.key}VpcVegetarian`, site: 'VPC', meal: 'Suất chay' },
      { label: `${shift.name}-FAB 1-Suất tráng miệng FAB`, key: `${shift.key}FabDessert`, site: 'FAB 1', meal: 'Suất tráng miệng FAB' },
      { label: `${shift.name}-FAB 1-Suất nước FAB`, key: `${shift.key}FabWater`, site: 'FAB 1', meal: 'Suất nước FAB' },
    ],
  }
}

const initialQuantities = Object.fromEntries(
  shifts.flatMap((shift) => {
    const rows = getRows(shift)
    return [...rows.people, ...rows.meals].map((row) => [row.key, 0])
  }),
)

function QuantityInput({ label, value, onChange }) {
  return (
    <div className="quantity-field">
      <span>{label}</span>
      <div className="quantity-control">
        <input
          aria-label={label}
          min="0"
          type="number"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button type="button" aria-label={`Giảm ${label}`} onClick={() => onChange(value - 1)}>-</button>
        <button type="button" aria-label={`Tăng ${label}`} onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  )
}

function BaoSoLuongKhachHang() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState('')
  const [quantities, setQuantities] = useState(initialQuantities)
  const [submitted, setSubmitted] = useState(false)
  const [isDateOpen, setIsDateOpen] = useState(false)
  const [selectedShiftKey, setSelectedShiftKey] = useState('ca1')
  const [dateRange, setDateRange] = useState({ start: '2026-08-17', end: '2026-08-23' })
  const [draftRange, setDraftRange] = useState(dateRange)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedShift = shifts.find((shift) => shift.key === selectedShiftKey)
  const { people: peopleRows, meals: mealRows } = getRows(selectedShift)
  const totalPeople = quantities[peopleRows[0].key] + quantities[peopleRows[1].key]

  useEffect(() => {
    async function loadClients() {
      try {
        const res = await httpClient.post('/larksuite/list_client')
        const list = res.data.data || []
        setClients(list)
        if (list.length) setSelectedClient((current) => current || list[0])
      } catch {
        setMessage('Không tải được danh sách khách hàng.')
      }
    }
    loadClients()
  }, [])

  function updateQuantity(key, value) {
    setSubmitted(false)
    setQuantities((current) => ({ ...current, [key]: Math.max(0, Number(value) || 0) }))
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat('vi-VN').format(new Date(`${date}T00:00:00`))
  }

  function formatWeekday(date) {
    return new Intl.DateTimeFormat('vi-VN', { weekday: 'long' }).format(new Date(`${date}T00:00:00`))
  }

  function applyDateRange() {
    if (draftRange.start && draftRange.end && draftRange.start <= draftRange.end) {
      setDateRange(draftRange)
      setIsDateOpen(false)
    }
  }

  async function searchMenu() {
    if (!selectedClient) {
      setMessage('Chọn khách hàng.')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const res = await httpClient.post('/larksuite/thuc_don_tuan', {
        client_code: selectedClient,
        fromDate: dateRange.start,
        toDate: dateRange.end,
      })
      if (res.data.error) {
        setMessage('Không tải được thực đơn tuần.')
        return
      }
      const count = (res.data.data || []).length
      setMessage(count ? `Tìm thấy ${count} dòng thực đơn.` : 'Không có thực đơn tuần cho khoảng ngày này.')
    } catch {
      setMessage('Tìm kiếm thất bại.')
    } finally {
      setLoading(false)
    }
  }

  async function submitReport() {
    if (!selectedClient) {
      setMessage('Chọn khách hàng.')
      return
    }

    const ngay = new Date(`${dateRange.start}T00:00:00`).getTime()
    const records = []

    shifts.forEach((shift) => {
      const rows = getRows(shift)
      rows.people.forEach((row) => {
        records.push({
          fields: {
            'Ngày': ngay,
            'Khách hàng': selectedClient,
            'Site ăn': row.site,
            'Ca': shift.name,
            'Tổng số người ăn': Number(quantities[row.key] || 0),
          },
        })
      })
      rows.meals.forEach((row) => {
        records.push({
          fields: {
            'Ngày': ngay,
            'Khách hàng': selectedClient,
            'Site ăn': row.site,
            'Ca': shift.name,
            'Cơ cấu suất ăn': row.meal,
            'Số lượng đăng ký theo cơ cấu suất ăn': Number(quantities[row.key] || 0),
          },
        })
      })
    })

    setLoading(true)
    setMessage('')
    try {
      const res = await httpClient.post('/larksuite/bao_so_luong_khach_hang', { data: records })
      if (res.data.error) {
        setMessage('Gửi báo số lượng thất bại.')
        return
      }
      setSubmitted(true)
      setMessage(res.data.data || `Đã gửi ${totalPeople} người ăn.`)
    } catch {
      setMessage('Gửi thất bại. Kiểm tra backend cổng 4130.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="quantity-page">
      <nav className="topbar">
        <div className="topbar-left">
          <span className="status-dot" aria-hidden="true" />
          <strong></strong>
          <select
            aria-label="Công ty"
            value={selectedClient}
            onChange={(event) => setSelectedClient(event.target.value)}
          >
            {clients.map((client) => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>
          <div className="date-picker">
            <button
              className="date-filter"
              type="button"
              aria-expanded={isDateOpen}
              onClick={() => setIsDateOpen(!isDateOpen)}
            >
              ▣ &nbsp;{formatDate(dateRange.start)} - {formatDate(dateRange.end)}
            </button>
            {isDateOpen && (
              <div className="date-menu">
                <label>
                  Từ ngày
                  <input
                    type="date"
                    value={draftRange.start}
                    onChange={(event) => setDraftRange({ ...draftRange, start: event.target.value })}
                  />
                </label>
                <label>
                  Đến ngày
                  <input
                    type="date"
                    value={draftRange.end}
                    onChange={(event) => setDraftRange({ ...draftRange, end: event.target.value })}
                  />
                </label>
                <button className="date-apply" type="button" onClick={applyDateRange}>Áp dụng</button>
              </div>
            )}
          </div>
          <button className="search-button" type="button" onClick={searchMenu} disabled={loading}>
            ⌕ &nbsp;{loading ? 'Đang tải...' : 'Tìm kiếm'}
          </button>
        </div>
        <div className="account-links">
          <span>LIXIL Admin</span>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem(AUTH_KEY)
              sessionStorage.removeItem(AUTH_KEY)
              navigate('/login', { replace: true })
            }}
          >
            Đăng xuất
          </button>
        </div>
      </nav>

      <section className="quantity-shell">
        <header className="page-heading">
          <div><h1>Báo số lượng (Khách hàng)</h1></div>
          <button className="report-button" type="button" onClick={submitReport} disabled={loading}>
            ▶ {loading ? 'Đang gửi...' : 'Gửi Báo số lượng'}
          </button>
        </header>
        <div className="selected-day">▣ &nbsp; {formatWeekday(dateRange.start)} ({formatDate(dateRange.start)})</div>
        <Tabs
          className="shift-tabs"
          value={selectedShiftKey}
          items={shifts.map((shift) => ({ value: shift.key, label: shift.label }))}
          onChange={(value) => {
            setSelectedShiftKey(value)
            setSubmitted(false)
          }}
        />
        <div className="quantity-panels">
          <section className="quantity-panel">
            <h2>Tổng số người ăn</h2>
            <div className="panel-fields">
              {peopleRows.map((row) => (
                <QuantityInput
                  key={row.key}
                  label={row.label}
                  value={quantities[row.key]}
                  onChange={(value) => updateQuantity(row.key, value)}
                />
              ))}
            </div>
          </section>
          <section className="quantity-panel">
            <h2>Số lượng đăng ký theo cơ cấu suất ăn</h2>
            <div className="panel-fields">
              {mealRows.map((row) => (
                <QuantityInput
                  key={row.key}
                  label={row.label}
                  value={quantities[row.key]}
                  onChange={(value) => updateQuantity(row.key, value)}
                />
              ))}
            </div>
          </section>
        </div>
        <div className="page-status" role="status">
          {message || (submitted ? `Đã ghi nhận ${totalPeople} người ăn.` : '')}
        </div>
      </section>
    </main>
  )
}

export default BaoSoLuongKhachHang