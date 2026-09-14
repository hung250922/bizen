import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Tabs from '../../../components/Tabs'
import { AUTH_KEY } from '../../auth/AuthPage'
import httpClient from '../../../services/httpClient'
import '../styles/baoSoLuong.css'

function toText(value) {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (Array.isArray(value)) return value.map(toText).filter(Boolean).join(', ')
  if (typeof value === 'object') {
    if (typeof value.text === 'string') return value.text.trim()
    if (typeof value.name === 'string') return value.name.trim()
    if (typeof value.value === 'string') return value.value.trim()
    if (Array.isArray(value.value)) return value.value.map(toText).filter(Boolean).join(', ')
    if (Array.isArray(value.values)) return value.values.map(toText).filter(Boolean).join(', ')
  }
  return ''
}

function toDate(value) {
  if (value == null || value === '') return null
  if (Array.isArray(value)) return toDate(value[0])
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'object') {
    if (value.value != null) return toDate(value.value)
    if (value.text != null) return toDate(value.text)
  }

  if (typeof value === 'number' || /^\d+$/.test(String(value).trim())) {
    const date = new Date(Number(value))
    return Number.isNaN(date.getTime()) ? null : date
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function vnKeyFromDate(date) {
  if (!date) return ''
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

function todayVn() {
  return vnKeyFromDate(new Date())
}

function dateKey(value) {
  return vnKeyFromDate(toDate(value))
}

function timestampFromValue(value) {
  const date = toDate(value)
  return date ? date.getTime() : 0
}

function formatDate(date) {
  if (!date) return ''
  const value = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00+07:00`)
    : toDate(date)
  return value ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).format(value) : ''
}

function formatWeekday(date) {
  if (!date) return ''
  const value = /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? new Date(`${date}T00:00:00+07:00`)
    : toDate(date)
  return value
    ? new Intl.DateTimeFormat('vi-VN', { weekday: 'long', timeZone: 'Asia/Ho_Chi_Minh' }).format(value)
    : ''
}

function formatDateHeading(date) {
  return date ? `${formatWeekday(date)} (${formatDate(date)})` : ''
}

function startOfDayKey(date) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) ? date : dateKey(date)
}

function splitSites(value) {
  return String(toText(value) || '').split(',').map((item) => item.trim()).filter(Boolean)
}

function uniqueByKey(list, getKey) {
  const seen = new Set()
  return list.filter((item) => {
    const key = getKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function normalizeMenuRows(rows = []) {
  return rows.map((row, index) => {
    const rawDate = row?.Ngay
    const date = toDate(rawDate)
    return {
      ...row,
      _index: index,
      _date: date,
      _dateKey: date ? dateKey(date) : '',
      _timestamp: timestampFromValue(rawDate),
      _weekday: toText(row?.Thu),
      _customer: toText(row?.KhachHang),
      _shift: toText(row?.Ca),
      _sites: splitSites(row?.SiteAn),
      _meal: toText(row?.CoCauSuatAn),
      _dish: toText(row?.MonAn)
    }
  }).filter((row) => row._dateKey && row._shift)
}

function buildDaySections(rows = []) {
  const dayMap = new Map()

  rows.forEach((row) => {
    if (!row._dateKey) return

    if (!dayMap.has(row._dateKey)) {
      dayMap.set(row._dateKey, {
        key: row._dateKey,
        date: row._date,
        timestamp: row._timestamp,
        shifts: new Map()
      })
    }

    const day = dayMap.get(row._dateKey)

    if (!day.shifts.has(row._shift)) {
      day.shifts.set(row._shift, {
        key: row._shift,
        name: row._shift,
        rows: [],
        sites: [],
        meals: []
      })
    }

    const shift = day.shifts.get(row._shift)
    shift.rows.push(row)

    row._sites.forEach((site) => {
      if (!shift.sites.includes(site)) shift.sites.push(site)

      if (row._meal && row._meal !== 'Suất cơm') {
        const key = `${site}__${row._meal}`
        if (!shift.meals.some((item) => item.key === key)) {
          shift.meals.push({ key, site, meal: row._meal })
        }
      }
    })
  })

  return [...dayMap.values()]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((day) => ({
      ...day,
      shifts: [...day.shifts.values()].map((shift) => ({
        ...shift,
        sites: [...shift.sites],
        meals: uniqueByKey(shift.meals, (item) => item.key)
      }))
    }))
}

function buildReportFields(sections, client) {
  const result = []

  sections.forEach((day) => {
    day.shifts.forEach((shift) => {
      shift.sites.forEach((site) => {
        result.push({
          key: `${day.key}!${client}!${site}!${shift.name}!tong_so_nguoi_an`,
          type: 'people',
          dayKey: day.key,
          ngay: day.timestamp,
          client,
          site,
          ca: shift.name,
          meal: ''
        })
      })

      shift.meals.forEach((item) => {
        result.push({
          key: `${day.key}!${client}!${item.site}!${shift.name}!${item.meal}!so_luong_dang_ky_theo_co_cau_suat_an`,
          type: 'meal',
          dayKey: day.key,
          ngay: day.timestamp,
          client,
          site: item.site,
          ca: shift.name,
          meal: item.meal
        })
      })
    })
  })

  return result
}

function QuantityInput({ label, value, onChange }) {
  const safeValue = Number(value || 0)

  return (
    <div className="quantity-field">
      <span>{label}</span>
      <div className="quantity-control">
        <input
          aria-label={label}
          min="0"
          type="number"
          value={safeValue}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          onWheel={(e) => e.currentTarget.blur()}
        />
        <button type="button" aria-label={`Giảm ${label}`} onClick={() => onChange(Math.max(0, safeValue - 1))}>-</button>
        <button type="button" aria-label={`Tăng ${label}`} onClick={() => onChange(safeValue + 1)}>+</button>
      </div>
    </div>
  )
}

function BaoSoLuongKhachHang() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [selectedClient, setSelectedClient] = useState('')
  const [menuRows, setMenuRows] = useState([])
  const [quantities, setQuantities] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [isDateOpen, setIsDateOpen] = useState(false)
  const [dateRange, setDateRange] = useState({ start: todayVn(), end: todayVn() })
  const [draftRange, setDraftRange] = useState(dateRange)
  const [selectedShiftByDay, setSelectedShiftByDay] = useState({})
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
const [showConfirmModal, setShowConfirmModal] = useState(false)
  const normalizedMenuRows = useMemo(() => normalizeMenuRows(menuRows), [menuRows])
  const daySections = useMemo(() => buildDaySections(normalizedMenuRows), [normalizedMenuRows])
  const reportFields = useMemo(
    () => buildReportFields(daySections, selectedClient),
    [daySections, selectedClient]
  )
  const totalPeople = useMemo(
    () => Object.values(quantities).reduce((sum, value) => sum + Number(value || 0), 0),
    [quantities]
  )

  useEffect(() => {
    let alive = true

    async function loadClients() {
      try {
        setLoading(true)
        const res = await httpClient.post('/larksuite/list_client')
        const list = Array.isArray(res.data?.data)
          ? res.data.data.map(toText).filter(Boolean).sort((a, b) => a.localeCompare(b))
          : []

        if (!alive) return

        const uniqueClients = [...new Set(list)]
        setClients(uniqueClients)
        setSelectedClient((current) =>
          current && uniqueClients.includes(current) ? current : uniqueClients[0] || ''
        )
      } catch (error) {
        if (!alive) return
        setClients([])
        setSelectedClient('')
        setMessage(error?.response?.data?.error || 'Không tải được danh sách khách hàng.')
      } finally {
        if (alive) setLoading(false)
      }
    }

    loadClients()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    setSelectedShiftByDay((current) => {
      const next = { ...current }

      daySections.forEach((day) => {
        const exists = day.shifts.some((shift) => shift.key === next[day.key])
        if (!exists) next[day.key] = day.shifts[0]?.key || ''
      })

      Object.keys(next).forEach((key) => {
        if (!daySections.some((day) => day.key === key)) delete next[key]
      })

      return next
    })
  }, [daySections])

  async function searchMenu() {
    if (!selectedClient) return setMessage('Chọn khách hàng.')
    if (!dateRange.start || !dateRange.end) return setMessage('Chọn đầy đủ ngày bắt đầu và ngày kết thúc.')
    if (dateRange.start > dateRange.end) return setMessage('Ngày bắt đầu không được lớn hơn ngày kết thúc.')

    setLoading(true)
    setMessage('')
    setSubmitted(false)

    try {
      const res = await httpClient.post('/larksuite/thuc_don_tuan', {
        client_code: selectedClient,
        fromDate: dateRange.start,
        toDate: dateRange.end
      })

      if (res.data?.error) {
        setMenuRows([])
        setQuantities({})
        setMessage(typeof res.data.error === 'string' ? res.data.error : 'Không tải được thực đơn tuần.')
        return
      }

      const rawRows = Array.isArray(res.data?.data) ? res.data.data : []
      const fromKey = startOfDayKey(dateRange.start)
      const toKey = startOfDayKey(dateRange.end)

      const filteredRows = rawRows.filter((row) => {
        const rowKey = dateKey(row?.Ngay)
        return rowKey && rowKey >= fromKey && rowKey <= toKey
      })

      setMenuRows(filteredRows)

      const sections = buildDaySections(normalizeMenuRows(filteredRows))
      const fields = buildReportFields(sections, selectedClient)
      const initial = {}

      fields.forEach((field) => { initial[field.key] = 0 })
      setQuantities(initial)

      const initialShifts = {}
      sections.forEach((day) => { initialShifts[day.key] = day.shifts[0]?.key || '' })
      setSelectedShiftByDay(initialShifts)

      if (filteredRows.length) {
        setMessage(`Tìm thấy ${filteredRows.length} dòng thực đơn.`)
      } else {
        const sampleDates = rawRows.slice(0, 4)
          .map((row) => dateKey(row?.Ngay) || 'không đọc được ngày')
          .join(', ')

        setMessage(
          rawRows.length
            ? `Lark trả ${rawRows.length} dòng nhưng không khớp ${fromKey} → ${toKey}. Ngày đọc được: ${sampleDates}.`
            : 'Không có thực đơn tuần cho khoảng ngày này. Kiểm tra bảng Thực đơn tuần của LIXIL đúng ngày 09/09 chưa.'
        )
      }
    } catch (error) {
      setMenuRows([])
      setQuantities({})
      setMessage(error?.response?.data?.error || error?.message || 'Tìm kiếm thất bại.')
    } finally {
      setLoading(false)
    }
  }

  function updateQuantity(key, value) {
    setSubmitted(false)
    setQuantities((current) => ({
      ...current,
      [key]: Math.max(0, Number(value || 0))
    }))
  }

  function applyDateRange() {
    if (draftRange.start && draftRange.end && draftRange.start <= draftRange.end) {
      setDateRange(draftRange)
      setMenuRows([])
      setQuantities({})
      setSelectedShiftByDay({})
      setMessage('')
      setSubmitted(false)
      setIsDateOpen(false)
    } else {
      setMessage('Khoảng ngày không hợp lệ.')
    }
  }

  function handleClientChange(value) {
    setSelectedClient(value)
    setMenuRows([])
    setQuantities({})
    setSelectedShiftByDay({})
    setSubmitted(false)
    setMessage('')
  }

  async function submitReport() {
  if (!selectedClient) return setMessage('Chọn khách hàng.')
  if (!reportFields.length) return setMessage('Hãy bấm "Tìm kiếm" để tải thực đơn trước.')

  const records = reportFields.map((field) => {
    const amount = Number(quantities[field.key] || 0)
    if (amount <= 0) return null

    const fields = {
      'Ngày': Number(field.ngay || 0),
      'Khách hàng': field.client,
      'Site ăn': field.site,
      'Ca': field.ca
    }

    if (field.type === 'people') {
      fields['Tổng số người ăn'] = amount
    } else {
      fields['Cơ cấu suất ăn'] = field.meal
      fields['Số lượng đăng ký theo cơ cấu suất ăn'] = amount
    }

    return { fields }
  }).filter(Boolean)

  if (!records.length) {
    return setMessage('Chưa nhập số lượng nào lớn hơn 0.')
  }

  setShowConfirmModal(true)
}

async function confirmSubmitReport() {
  setShowConfirmModal(false)

  const records = reportFields.map((field) => {
    const amount = Number(quantities[field.key] || 0)
    if (amount <= 0) return null

    const fields = {
      'Ngày': Number(field.ngay || 0),
      'Khách hàng': field.client,
      'Site ăn': field.site,
      'Ca': field.ca
    }

    if (field.type === 'people') {
      fields['Tổng số người ăn'] = amount
    } else {
      fields['Cơ cấu suất ăn'] = field.meal
      fields['Số lượng đăng ký theo cơ cấu suất ăn'] = amount
    }

    return { fields }
  }).filter(Boolean)

  if (!records.length) {
    return setMessage('Chưa nhập số lượng nào lớn hơn 0.')
  }

  setSubmitting(true)
  setMessage('')

  try {
    const res = await httpClient.post(
      '/larksuite/bao_so_luong_khach_hang',
      { data: records }
    )

    if (res.data?.error) {
      setMessage(
        typeof res.data.error === 'string'
          ? res.data.error
          : 'Gửi báo số lượng thất bại.'
      )
      return
    }

    setSubmitted(true)
    setMessage(
      res.data?.data ||
      `Đã gửi ${totalPeople} người ăn.`
    )
  } catch (error) {
    setMessage(
      error?.response?.data?.error ||
      error?.message ||
      'Gửi thất bại. Kiểm tra backend.'
    )
  } finally {
    setSubmitting(false)
  }
}

  function handleLogout() {
    localStorage.removeItem(AUTH_KEY)
    sessionStorage.removeItem(AUTH_KEY)
    navigate('/login', { replace: true })
  }

  function renderShift(day, shift) {
    if (!shift) return <div className="page-status" role="status">Không có ca trong ngày này.</div>

    const peopleRows = shift.sites.map((site) => ({
      key: `${day.key}!${selectedClient}!${site}!${shift.name}!tong_so_nguoi_an`,
      label: `${shift.name} - ${site}`
    }))

    const mealRows = shift.meals.map((item) => ({
      key: `${day.key}!${selectedClient}!${item.site}!${shift.name}!${item.meal}!so_luong_dang_ky_theo_co_cau_suat_an`,
      label: `${shift.name}-${item.site}-${item.meal}`
    }))

    const renderRows = (rows, emptyText) =>
      rows.length
        ? rows.map((row) => (
            <QuantityInput
              key={row.key}
              label={row.label}
              value={quantities[row.key] ?? 0}
              onChange={(value) => updateQuantity(row.key, value)}
            />
          ))
        : <div className="page-status">{emptyText}</div>

    return (
      <div className="quantity-panels" key={`${day.key}-${shift.key}`}>
        <section className="quantity-panel">
          <h2>Tổng số người ăn</h2>
          <div className="panel-fields">{renderRows(peopleRows, 'Không có Site ăn.')}</div>
        </section>

        <section className="quantity-panel">
          <h2>Số lượng đăng ký theo cơ cấu suất ăn</h2>
          <div className="panel-fields">
            {renderRows(mealRows, 'Không có cơ cấu suất ăn cho ca này.')}
          </div>
        </section>
      </div>
    )
  }

  return (
    <main className="quantity-page">
      <nav className="topbar">
        <div className="topbar-left">
          <span className="status-dot" aria-hidden="true" />
          <strong />

          <select
            aria-label="Công ty"
            value={selectedClient}
            onChange={(e) => handleClientChange(e.target.value)}
            disabled={loading || !clients.length}
          >
            {!clients.length && (
              <option value="">{loading ? 'Đang tải công ty...' : 'Không có công ty'}</option>
            )}
            {clients.map((client) => <option key={client} value={client}>{client}</option>)}
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
                    onChange={(e) => setDraftRange({ ...draftRange, start: e.target.value })}
                  />
                </label>

                <label>
                  Đến ngày
                  <input
                    type="date"
                    value={draftRange.end}
                    onChange={(e) => setDraftRange({ ...draftRange, end: e.target.value })}
                  />
                </label>

                <button className="date-apply" type="button" onClick={applyDateRange}>Áp dụng</button>
              </div>
            )}
          </div>

          <button className="search-button" type="button" onClick={searchMenu} disabled={loading}>
            {loading && <span className="quantity-loading-spinner" aria-hidden="true" />}
            {!loading && '⌕ '}
            {loading ? 'Đang tải...' : 'Tìm kiếm'}
          </button>
        </div>

        <div className="account-links">
          <span>{selectedClient ? `${selectedClient} Admin` : 'Admin'}</span>
          <button type="button" onClick={handleLogout}>Đăng xuất</button>
        </div>
      </nav>

      <section className="quantity-shell">
        <header className="page-heading">
          <div><h1>Báo số lượng (Khách hàng)</h1></div>
          <button
            className="report-button"
            type="button"
            onClick={submitReport}
            disabled={loading || submitting || !reportFields.length}
          >
            {submitting && <span className="quantity-loading-spinner" aria-hidden="true" />}
            {!submitting && '▶ '}
            {submitting ? 'Đang xử lý...' : 'Gửi Báo số lượng'}
          </button>
        </header>

        {message && <div className="page-status" role="status">{message}</div>}

        {!menuRows.length && !loading && (
          <div className="page-status">
            Chọn công ty + khoảng ngày rồi bấm <strong>&nbsp;Tìm kiếm</strong>&nbsp;để lấy thực đơn từ LarkSuite.
          </div>
        )}

        {daySections.map((day) => {
          const selectedShiftKey = selectedShiftByDay[day.key] || day.shifts[0]?.key || ''
          const selectedShift = day.shifts.find((shift) => shift.key === selectedShiftKey) || day.shifts[0]

          return (
            <section key={day.key} style={{ marginTop: '16px' }}>
              <div className="selected-day">▣ &nbsp;{formatDateHeading(day.key)}</div>

              <Tabs
                className="shift-tabs"
                value={selectedShiftKey}
                items={day.shifts.map((shift) => ({ value: shift.key, label: shift.name }))}
                onChange={(value) => {
                  setSubmitted(false)
                  setSelectedShiftByDay((current) => ({ ...current, [day.key]: value }))
                }}
              />

              {selectedShift && renderShift(day, selectedShift)}
            </section>
          )
        })}

        {reportFields.length > 0 && (
          <div className="page-status" style={{ marginTop: '16px' }}>
            {reportFields.length} ô nhập liệu tương ứng với thực đơn đã tìm thấy.
            {submitted && <> Đã gửi báo số lượng thành công.</>}
          </div>
        )}
      </section>
      {showConfirmModal && (
  <div
    className="confirm-modal-overlay"
    onClick={() => setShowConfirmModal(false)}
  >
    <div
      className="confirm-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <h3>Xác nhận gửi báo số lượng</h3>

      <p>Bạn có đồng ý gửi báo số lượng không?</p>

      <div className="confirm-modal-actions">
        <button
          type="button"
          className="confirm-cancel"
          onClick={() => setShowConfirmModal(false)}
        >
          Huỷ
        </button>

        <button
          type="button"
          className="confirm-ok"
          onClick={confirmSubmitReport}
        >
          Đồng ý
        </button>
      </div>
    </div>
  </div>
)}
    </main>
  )
}

export default BaoSoLuongKhachHang