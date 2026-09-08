import { useEffect, useState } from 'react'
import httpClient from '../../services/httpClient'
import './kiemThucBaBuoc.css'

function KiemThucBaBuocPage() {
  const [clients, setClients] = useState([])
  const [filters, setFilters] = useState({ type: 'kiem_thuc_buoc_1', client: '', date: '', shift: 'Ca 1' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  useEffect(() => {
    httpClient
      .post('/larksuite/list_client')
      .then((response) => setClients(response.data.data || []))
      .catch(() => setMessage('Không tải được danh sách khách hàng.'))
  }, [])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(''), 3000)
    return () => clearTimeout(t)
  }, [message])

  function updateFilter(field, value) {
    setFilters((current) => ({ ...current, [field]: value }))
  }

  function requestExport() {
    if (!filters.client || !filters.date) {
      setMessage('Chọn khách hàng và ngày trước khi xuất Excel.')
      return
    }
    setConfirmOpen(true)
  }

  async function exportExcel() {
    setConfirmOpen(false)
    setLoading(true)
    setMessage('')
    try {
      const response = await httpClient.post(
        '/export_excel_file/kiem_thuc_ba_buoc',
        {
          kiemThucType: filters.type,
          client_code: filters.client,
          date: filters.date,
          ca: filters.shift,
        },
        { responseType: 'blob' }
      )
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.download = `KiemThucBaBuoc_${filters.date}_${filters.client}.xlsx`
      link.click()
      window.URL.revokeObjectURL(url)
      setMessage('Xuất Excel thành công.')
    } catch {
      setMessage('Xuất Excel thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="kt-page">
      {loading && (
        <div className="kt-loading">
          <div className="kt-spinner" />
        </div>
      )}

      {message && (
        <div className={`kt-toast${message.includes('thành công') ? ' success' : ' error'}`}>
          {message}
        </div>
      )}

      {confirmOpen && (
        <div className="kt-modal-backdrop" onClick={() => setConfirmOpen(false)}>
          <div className="kt-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Xác nhận xuất Excel</h3>
            <p>Bạn có đồng ý xuất Excel không?</p>
            <div className="kt-modal-actions">
              <button type="button" onClick={() => setConfirmOpen(false)}>Huỷ</button>
              <button type="button" className="kt-ok" onClick={exportExcel}>Đồng ý</button>
            </div>
          </div>
        </div>
      )}

      <header className="kt-heading">
        <div>
          <span>MỤC KIỂM SOÁT AN TOÀN THỰC PHẨM</span>
          <h1>Kiểm thực 3 bước</h1>
          <p>Chọn thông tin để xuất biểu mẫu kiểm thực.</p>
        </div>
      </header>

      <section className="kt-export">
        <h2>Xuất phiếu kiểm thực</h2>
        <div className="kt-export-grid">
          <label>
            Loại kiểm thực
            <select value={filters.type} onChange={(e) => updateFilter('type', e.target.value)}>
              <option value="kiem_thuc_buoc_1">Kiểm thực bước 1</option>
              <option value="kiem_thuc_buoc_23">Kiểm thực bước 2, 3</option>
              <option value="kiem_thuc_buoc_4">Kiểm thực bước 4</option>
            </select>
          </label>
          <label>
            Khách hàng
            <select value={filters.client} onChange={(e) => updateFilter('client', e.target.value)}>
              <option value="">Chọn khách hàng</option>
              {clients.map((client) => (
                <option key={client} value={client}>{client}</option>
              ))}
            </select>
          </label>
          <label>
            Ngày
            <input type="date" value={filters.date} onChange={(e) => updateFilter('date', e.target.value)} />
          </label>
          <label>
            Ca
            <select value={filters.shift} onChange={(e) => updateFilter('shift', e.target.value)}>
              <option>Ca 1</option>
              <option>Ca 2</option>
              <option>Ca 3</option>
            </select>
          </label>
          <button type="button" onClick={requestExport} disabled={loading}>
            Xuất Excel
          </button>
        </div>
      </section>
    </main>
  )
}

export default KiemThucBaBuocPage