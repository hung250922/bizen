import { useEffect, useState } from 'react'
import httpClient from '../../../services/httpClient'
import Pagination from '../../../components/Pagination'
import '../styles/lenhSanXuat.css'

const columns = ['STT', 'Công ty', 'Số phần', 'Ca', 'Cơ cấu suất ăn', 'Món ăn', 'BOM món ăn', 'Số lượng nhập']

const KITCHENS = [
  { value: '', label: 'Chọn bếp' },
  { value: 'Bếp trung tâm', label: 'Bếp trung tâm' },
  { value: 'Bếp trung tâm 2', label: 'Bếp trung tâm 2' },
  { value: 'Bếp tại chỗ', label: 'Bếp tại chỗ' },
]

function cell(row, keys) {
  for (const key of keys) {
    const value = row?.[key]
    if (value !== undefined && value !== null && value !== '') return String(value)
  }
  return ''
}

function LenhSanXuatPage() {
  const [clients, setClients] = useState([])
  const [clientCode, setClientCode] = useState('')
  const [kitchen, setKitchen] = useState('')
  const [date, setDate] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [page, setPage] = useState(1)

  useEffect(() => {
    async function loadClients() {
      try {
        const res = await httpClient.post('/larksuite/list_client')
        if (res.data.error) {
          setMessage('Không tải được danh sách khách hàng từ Lark.')
          return
        }
        setClients(res.data.data || [])
      } catch {
        setMessage('Không kết nối Lark/backend. Kiểm tra cổng 4130.')
      }
    }
    loadClients()
  }, [])

  useEffect(() => {
    if (!message) return undefined
    const timer = setTimeout(() => setMessage(''), 3000)
    return () => clearTimeout(timer)
  }, [message])

  async function searchOrders() {
    if (!clientCode) {
      setMessage('Chọn khách hàng.')
      return
    }
    if (!date) {
      setMessage('Chọn ngày.')
      return
    }
    setLoading(true)
    setMessage('')
    try {
      const res = await httpClient.post('/larksuite/lenh_san_xuat', {
        client_code: clientCode,
        kitchen,
        date,
      })
      if (res.data.error) {
        setMessage(typeof res.data.error === 'string' ? res.data.error : 'Tìm kiếm thất bại.')
        setRows([])
        return
      }
      setRows(res.data.data || [])
      setPage(1)
    } catch {
      setMessage('Tìm kiếm thất bại. Kiểm tra backend cổng 4130.')
    } finally {
      setLoading(false)
    }
  }

  function requestExport() {
    if (!clientCode) {
      setMessage('Chọn khách hàng trước khi export.')
      return
    }
    if (!date) {
      setMessage('Chọn ngày trước khi export.')
      return
    }
    setConfirmOpen(true)
  }

  async function exportExcel() {
    setConfirmOpen(false)
    setLoading(true)
    setMessage('')
    try {
      const res = await httpClient.post(
        '/export_excel_file/lenh_san_xuat',
        { client_code: clientCode, kitchen, date },
        { responseType: 'blob' }
      )

      const contentType = String(res.headers?.['content-type'] || '')
      if (contentType.includes('application/json')) {
        const text = await res.data.text()
        let json = {}
        try {
          json = JSON.parse(text)
        } catch {
          /* ignore */
        }
        setMessage(json.error || json.message || 'Export Excel thất bại.')
        return
      }

      const url = URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `lenh_san_xuat_${clientCode}_${date}.xlsx`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)

      setMessage('Xuất Excel thành công.')
    } catch (err) {
      console.error(err)
      setMessage('Export Excel thất bại.')
    } finally {
      setLoading(false)
    }
  }

  const toastClass =
    message.includes('thành công')
      ? 'production-toast success'
      : message.includes('thất bại') || message.includes('Không') || message.includes('Chọn')
        ? 'production-toast error'
        : 'production-toast'

  const paginatedRows = rows.slice((page - 1) * 25, page * 25)

  return (
    <main className="production-page">
      {loading && (
        <div className="production-loading" aria-busy="true">
          <div className="production-spinner" />
        </div>
      )}

      {message && (
        <div className={toastClass} role="status">
          <span className="production-toast-icon">
            {message.includes('thành công') ? '✓' : '!'}
          </span>
          <span>{message}</span>
        </div>
      )}

      {confirmOpen && (
        <div className="production-modal-backdrop" onClick={() => setConfirmOpen(false)}>
          <div
            className="production-modal"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h3>Xác nhận xuất Excel</h3>
            <p>Bạn có đồng ý xuất Excel không?</p>
            <div className="production-modal-actions">
              <button type="button" className="production-modal-cancel" onClick={() => setConfirmOpen(false)}>
                Huỷ
              </button>
              <button type="button" className="production-modal-ok" onClick={exportExcel}>
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="production-filters">
        <select
          aria-label="Chọn khách hàng"
          value={clientCode}
          onChange={(event) => setClientCode(event.target.value)}
          disabled={loading}
        >
          <option value="">Chọn khách hàng</option>
          {clients.map((client) => (
            <option key={client} value={client}>
              {client}
            </option>
          ))}
        </select>

        <select
          aria-label="Chọn bếp"
          value={kitchen}
          onChange={(event) => setKitchen(event.target.value)}
          disabled={loading}
        >
          {KITCHENS.map((item) => (
            <option key={item.value || 'empty'} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>

        <label className="production-date">
          Chọn ngày:
          <input
            type="date"
            aria-label="Chọn ngày"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            disabled={loading}
          />
        </label>

        <button className="production-search" type="button" onClick={searchOrders} disabled={loading}>
          ⌕ Tìm kiếm
        </button>
        <button className="production-export" type="button" onClick={requestExport} disabled={loading}>
          ▣ Export Excel
        </button>
      </div>

      <section className="production-data">
        <h1>Dữ liệu lệnh sản xuất</h1>
        <div className="production-table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRows.map((row, index) => (
                <tr key={row._id || index}>
                  <td>{(page - 1) * 25 + index + 1}</td>
                  <td>{cell(row, ['KhachHang', 'Công ty', 'Khách hàng', 'client_code', 'MaKhachHang'])}</td>
                  <td>{cell(row, ['SoLuongCoNgaDuyetDatHang', 'Số phần', 'so_phan'])}</td>
                  <td>{cell(row, ['Ca'])}</td>
                  <td>{cell(row, ['CoCauSuatAn', 'Cơ cấu suất ăn', 'co_cau_suat_an'])}</td>
                  <td>{cell(row, ['MonAn', 'Món ăn', 'mon_an'])}</td>
                  <td>{cell(row, ['BOMMonAn', 'BOM món ăn', 'bom_mon_an'])}</td>
                  <td>{cell(row, ['SoLuongCoNgaDuyetDatHang', 'Số lượng nhập', 'so_luong_nhap'])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalItems={rows.length} pageSize={25} onPageChange={setPage} label="dòng" />
      </section>
    </main>
  )
}

export default LenhSanXuatPage