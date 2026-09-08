import { useEffect, useState } from 'react'
import httpClient from '../../../services/httpClient'
import '../styles/baoSoLuongQuanLySite.css'

const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật']

function BaoSoLuongQuanLySitePage() {
  const [clients, setClients] = useState([])
  const [clientCode, setClientCode] = useState('')
  const [fromDate, setFromDate] = useState('2026-08-17')
  const [toDate, setToDate] = useState('2026-08-23')
  const [menuRows, setMenuRows] = useState([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadClients() {
      try {
        const res = await httpClient.post('/larksuite/list_client')
        const list = res.data.data || []
        setClients(list)
        if (list.length) setClientCode((current) => current || list[0])
      } catch {
        setMessage('Không tải được danh sách khách hàng.')
      }
    }
    loadClients()
  }, [])

  async function searchMenu() {
    if (!clientCode) {
      setMessage('Chọn khách hàng.')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const res = await httpClient.post('/larksuite/thuc_don_tuan', {
        client_code: clientCode,
        fromDate,
        toDate,
      })
      if (res.data.error) {
        setMenuRows([])
        setMessage('Không tải được thực đơn tuần.')
        return
      }
      const rows = res.data.data || []
      setMenuRows(rows)
      setMessage(rows.length ? `Tìm thấy ${rows.length} dòng.` : 'Không có thực đơn cho khoảng ngày này.')
    } catch {
      setMessage('Tìm kiếm thất bại.')
    } finally {
      setLoading(false)
    }
  }

  function rowsForDay(day) {
    return menuRows.filter((row) => row.Thu === day || row['Thứ'] === day)
  }

  async function submitReport() {
    if (!clientCode) {
      setMessage('Chọn khách hàng.')
      return
    }

    const ngay = new Date(`${fromDate}T00:00:00`).getTime()
    const records = menuRows.length
      ? menuRows.map((row) => ({
          fields: {
            'Ngày': row.Ngay || ngay,
            'Khách hàng': row.KhachHang || clientCode,
            'Site ăn': row.SiteAn || '',
            'Ca': row.Ca || '',
            'Cơ cấu suất ăn': row['Cơ cấu suất ăn'] || row.CoCauSuatAn || '',
            'Số lượng đăng ký theo cơ cấu suất ăn': Number(row.so_luong || 0),
          },
        }))
      : [{
          fields: {
            'Ngày': ngay,
            'Khách hàng': clientCode,
            'Site ăn': '',
            'Ca': 'Ca 1',
            'Cơ cấu suất ăn': '',
            'Số lượng đăng ký theo cơ cấu suất ăn': 0,
          },
        }]

    setLoading(true)
    setMessage('')
    try {
      const res = await httpClient.post('/larksuite/bao_so_luong_quan_ly_site', { data: records })
      if (res.data.error) {
        setMessage('Gửi báo số lượng thất bại.')
        return
      }
      setMessage(res.data.data || 'Đã gửi báo số lượng.')
    } catch {
      setMessage('Gửi thất bại. Kiểm tra backend cổng 4130.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="site-quantity-page">
      <header className="site-quantity-header">
        <h1>Báo số lượng (Quản lý site)</h1>
        <label className="site-top-search">
          <span>⌕</span>
          <input placeholder="Tìm kiếm..." aria-label="Tìm kiếm" />
        </label>
      </header>
      <div className="site-quantity-filters">
        <label>
          Chọn khách hàng
          <select
            aria-label="Chọn khách hàng"
            value={clientCode}
            onChange={(event) => setClientCode(event.target.value)}
          >
            <option value="">Chọn khách hàng</option>
            {clients.map((client) => (
              <option key={client} value={client}>{client}</option>
            ))}
          </select>
        </label>
        <label>
          Chọn từ ngày
          <input
            type="date"
            aria-label="Chọn từ ngày"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>
        <label>
          Chọn đến ngày
          <input
            type="date"
            aria-label="Chọn đến ngày"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </label>
        <button className="site-search-button" type="button" onClick={searchMenu} disabled={loading}>
          ⌕ &nbsp;{loading ? 'Đang tải...' : 'Tìm kiếm'}
        </button>
      </div>
      {message && <p>{message}</p>}
      <section className="site-quantity-card">
        <div className="site-report-heading">
          <div>
            <span className="site-report-icon">▣</span>
            <h2>Danh sách báo cáo</h2>
          </div>
          <button className="site-report-button" type="button" onClick={submitReport} disabled={loading}>
            ▣ &nbsp; {loading ? 'Đang gửi...' : 'Gửi Báo số lượng'}
          </button>
        </div>
        <div className="site-day-list">
          {days.map((day) => {
            const count = rowsForDay(day).length
            return (
              <button className="site-day-empty" type="button" key={day}>
                <span className="site-day-icon">▣</span>
                <span>
                  <strong>{day}</strong>{' '}
                  <small>{count ? `(${count} dòng)` : '(Không có thực đơn)'}</small>
                </span>
                <span className="site-day-chevron">⌄</span>
              </button>
            )
          })}
        </div>
      </section>
    </main>
  )
}

export default BaoSoLuongQuanLySitePage