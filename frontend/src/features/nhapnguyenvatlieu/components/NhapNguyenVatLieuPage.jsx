import { useEffect, useState } from 'react'
import httpClient from '../../../services/httpClient'
import { ensureMinimumLoading } from '../../../utils/ensureMinimumLoading'
import Pagination from '../../../components/Pagination'
import '../styles/nhapNguyenVatLieu.css'

const today = new Date().toISOString().slice(0, 10)
const emptyRow = () => ({ input_date: today, nvl_name: '', nvl_unit: '', quantity: '', unit_price: '', note: '' })

function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value || 0))
}

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('vi-VN') : ''
}

function NhapNguyenVatLieuPage() {
  const [rows, setRows] = useState([emptyRow()])
  const [history, setHistory] = useState([])
  const [materials, setMaterials] = useState([])
  const [filterDate, setFilterDate] = useState(today)
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteStep, setDeleteStep] = useState('confirm')
  const [deletePassword, setDeletePassword] = useState('')
  const [page, setPage] = useState(1)

  async function loadData() {
    const [historyRes, priceRes] = await Promise.all([
      httpClient.get('/catering/nhap_nguyen_vat_lieus', { params: filterDate ? { fromDate: filterDate, toDate: filterDate } : {} }),
      httpClient.get('/catering/don_gia_nguyen_vat_lieus'),
    ])
    if (historyRes.data?.error || priceRes.data?.error) throw new Error(historyRes.data?.error || priceRes.data?.error)
    setHistory(historyRes.data?.data || [])
    setMaterials(priceRes.data?.data || [])
  }

  useEffect(() => {
    loadData().catch((error) => setMessage(error.message || 'Không tải được dữ liệu nhập NVL.'))
    setPage(1)
  }, [filterDate])

  const paginatedHistory = history.slice((page - 1) * 25, page * 25)

  function updateRow(index, field, value) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row))
    setMessage('')
  }

  function selectMaterial(index, name) {
    const material = materials.find((item) => item.nvl_name === name)
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? {
      ...row,
      nvl_name: name,
      nvl_unit: material?.nvl_unit || row.nvl_unit,
      unit_price: material?.nvl_price ?? row.unit_price,
    } : row))
  }

  async function saveRows(event) {
    event.preventDefault()
    const validRows = rows.filter((row) => row.nvl_name && row.quantity !== '' && row.unit_price !== '')
    if (!validRows.length) return setMessage('Nhập ít nhất một dòng nguyên vật liệu.')
    const startedAt = Date.now()
    setLoading(true)
    setMessage('')
    try {
      const response = await httpClient.post('/catering/add_nhap_nguyen_vat_lieus', { rows: validRows })
      if (response.data?.error) throw new Error(response.data.error)
      setRows([emptyRow()])
      await loadData()
      setMessage(`Đã lưu ${validRows.length} dòng nhập NVL và cập nhật đơn giá cho BOM.`)
    } catch (error) {
      setMessage(error.response?.data?.error || error.message || 'Lưu phiếu nhập thất bại.')
    } finally {
      await ensureMinimumLoading(startedAt)
      setLoading(false)
    }
  }

  async function importExcel() {
    if (!file) return setMessage('Chọn file Excel trước khi import.')
    const formData = new FormData()
    formData.append('file', file)
    const startedAt = Date.now()
    setLoading(true)
    setMessage('')
    try {
      const response = await httpClient.post('/catering/import_nhap_nguyen_vat_lieu', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      if (response.data?.error) throw new Error(response.data.error)
      setFile(null)
      document.getElementById('material-excel-file').value = ''
      await loadData()
      setMessage(`Đã import ${response.data?.data?.length || 0} dòng và cập nhật đơn giá cho BOM.`)
    } catch (error) {
      setMessage(error.response?.data?.error || error.message || 'Import Excel thất bại.')
    } finally {
      await ensureMinimumLoading(startedAt)
      setLoading(false)
    }
  }

  function openDeleteModal(row) {
    setDeleteTarget(row)
    setDeleteStep('confirm')
    setDeletePassword('')
  }

  function closeDeleteModal() {
    setDeleteTarget(null)
    setDeletePassword('')
  }

  async function deleteReceipt() {
    if (!deleteTarget || !deletePassword) return
    setLoading(true)
    setMessage('')
    try {
      const response = await httpClient.post('/catering/delete_nhap_nguyen_vat_lieu', { id: deleteTarget._id, password: deletePassword })
      if (response.data?.error) throw new Error(response.data.error)
      closeDeleteModal()
      await loadData()
      setMessage('Đã xóa phiếu nhập và cập nhật lại đơn giá NVL.')
    } catch (error) {
      setMessage(error.response?.data?.error || error.message || 'Xóa phiếu nhập thất bại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="material-entry-page">
      {loading && <div className="material-entry-loading" aria-busy="true"><div /></div>}
      <header className="material-entry-heading">
        <div><p>INVENTORY CONTROL</p><h1>Nhập nguyên vật liệu</h1><span>Ghi nhận giá nhập theo ngày, dùng trực tiếp cho BOM món ăn.</span></div>
        <div className="material-entry-total"><strong>{formatMoney(history.reduce((sum, row) => sum + Number(row.total_amount || 0), 0))}</strong><small>TỔNG NGÀY ĐANG XEM</small></div>
      </header>

      <section className="material-entry-layout">
        <form className="material-entry-form" onSubmit={saveRows}>
          <h2>Phiếu nhập hôm nay</h2>
          <p className="material-entry-caption">Chọn tên từ danh mục để liên kết chính xác với BOM.</p>
          {rows.map((row, index) => <div className="material-entry-row" key={index}>
            <label>Ngày<input type="date" value={row.input_date} onChange={(event) => updateRow(index, 'input_date', event.target.value)} /></label>
            <label className="material-entry-material">Nguyên vật liệu<select value={row.nvl_name} onChange={(event) => selectMaterial(index, event.target.value)}><option value="">Chọn nguyên vật liệu</option>{materials.map((material) => <option key={material._id} value={material.nvl_name}>{material.nvl_name}</option>)}</select></label>
            <div className="material-entry-pair"><label>Đơn vị<input value={row.nvl_unit} onChange={(event) => updateRow(index, 'nvl_unit', event.target.value)} placeholder="kg" /></label><label>Số lượng<input type="number" min="0" step="any" value={row.quantity} onChange={(event) => updateRow(index, 'quantity', event.target.value)} /></label></div>
            <label>Đơn giá<input type="number" min="0" step="any" value={row.unit_price} onChange={(event) => updateRow(index, 'unit_price', event.target.value)} /></label>
            <label>Ghi chú<input value={row.note} onChange={(event) => updateRow(index, 'note', event.target.value)} /></label>
            {rows.length > 1 && <button type="button" className="material-entry-remove" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))} aria-label="Xóa dòng">×</button>}
          </div>)}
          <div className="material-entry-actions"><button type="button" className="material-entry-secondary" onClick={() => setRows((current) => [...current, emptyRow()])}>+ Thêm dòng</button><button type="submit">Lưu phiếu nhập</button></div>
          <div className="material-entry-import"><label htmlFor="material-excel-file">Import Excel (.xlsx)</label><input id="material-excel-file" type="file" accept=".xlsx" onChange={(event) => setFile(event.target.files?.[0] || null)} /><button type="button" className="material-entry-secondary" onClick={importExcel}>Import file</button><small>Cột bắt buộc: Ngày, Nguyên vật liệu, Đơn vị, Số lượng, Đơn giá. Có thể thêm Ghi chú.</small></div>
          {message && <p className="material-entry-message">{message}</p>}
        </form>

        <section className="material-entry-history"><div className="material-entry-history-heading"><div><p>NHẬT KÝ NHẬP</p><h2>Nguyên vật liệu đã nhập</h2></div><input type="date" value={filterDate} onChange={(event) => setFilterDate(event.target.value)} /></div><div className="material-entry-table-wrap"><table><thead><tr><th>Ngày</th><th>Nguyên vật liệu</th><th>Đơn vị</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th><th /></tr></thead><tbody>{paginatedHistory.map((row) => <tr key={row._id}><td>{formatDate(row.input_date)}</td><td className="material-entry-name">{row.nvl_name}</td><td>{row.nvl_unit}</td><td>{row.quantity}</td><td>{formatMoney(row.unit_price)}</td><td className="material-entry-value">{formatMoney(row.total_amount)}</td><td><button type="button" className="material-entry-delete" onClick={() => openDeleteModal(row)}>Xóa</button></td></tr>)}{!history.length && <tr><td colSpan="7" className="material-entry-empty">Chưa có dữ liệu nhập trong ngày này.</td></tr>}</tbody></table></div><Pagination page={page} totalItems={history.length} pageSize={25} onPageChange={setPage} label="dòng" /></section>
      </section>
      {deleteTarget && <div className="material-entry-modal-backdrop" onClick={closeDeleteModal}>
        <div className="material-entry-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
          {deleteStep === 'confirm' ? <>
            <h3>Xác nhận xóa phiếu nhập</h3>
            <p>Xóa phiếu nhập {deleteTarget.nvl_name} trị giá {formatMoney(deleteTarget.total_amount)}đ?</p>
            <div className="material-entry-modal-actions"><button type="button" onClick={closeDeleteModal}>Hủy</button><button type="button" className="material-entry-modal-ok" onClick={() => setDeleteStep('password')}>Đồng ý</button></div>
          </> : <>
            <h3>Nhập mật khẩu quản trị</h3>
            <p>Nhập mật khẩu để xóa phiếu nhập này.</p>
            <input autoFocus type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && deleteReceipt()} placeholder="Mật khẩu quản trị" />
            <div className="material-entry-modal-actions"><button type="button" onClick={() => setDeleteStep('confirm')}>Quay lại</button><button type="button" className="material-entry-modal-ok" onClick={deleteReceipt} disabled={!deletePassword || loading}>Xóa phiếu</button></div>
          </>}
        </div>
      </div>}
    </main>
  )
}

export default NhapNguyenVatLieuPage
