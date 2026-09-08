import { useEffect, useState } from 'react'
import httpClient from '../../services/httpClient'
import { ensureMinimumLoading } from '../../utils/ensureMinimumLoading'
import Pagination from '../../components/Pagination'
import './monAnTheoMua.css'

function monthOf(row) {
  return {
    start: row.start_month ?? row.thang_bat_dau ?? row.from_month ?? '',
    end: row.end_month ?? row.thang_ket_thuc ?? row.to_month ?? '',
  }
}

function MonAnTheoMuaPage() {
  const [tab, setTab] = useState('plus')
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ food_name: '', start_month: '', end_month: '' })
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const encouraged = tab === 'plus'

  async function load() {
    try {
      const res = await httpClient.get('/catering/mon_an_theo_muas')
      setRows(res.data.data || [])
    } catch {
      setError('Không tải được món ăn theo mùa.')
    }
  }

  useEffect(() => { load() }, [])

  const normalizedSearch = search.trim().toLowerCase()
  const visible = rows.filter((row) => Boolean(row.is_encouraged) === encouraged && (!normalizedSearch || String(row.food_name || '').toLowerCase().includes(normalizedSearch)))
  const paginatedRows = visible.slice((page - 1) * 25, page * 25)

  async function save(event) {
    event.preventDefault()
    if (!form.food_name.trim() || !form.start_month || !form.end_month) {
      setError('Nhập đủ món ăn và tháng.')
      return
    }
    setError('')
    setMessage('')
    const loadingStartedAt = Date.now()
    setLoading(true)
    try {
      const res = await httpClient.post('/catering/add_mon_an_theo_mua', {
        food_name: form.food_name.trim(),
        is_encouraged: encouraged,
        from_month: Number(form.start_month),
        to_month: Number(form.end_month),
      })
      if (res.data.error) {
        setError('Lưu thất bại. Kiểm tra tên field backend.')
        return
      }
      setForm({ food_name: '', start_month: '', end_month: '' })
      setMessage('Đã lưu.')
      await load()
    } catch {
      setError('Không gọi được API.')
    } finally {
      await ensureMinimumLoading(loadingStartedAt)
      setLoading(false)
    }
  }

    return (
    <main className="season-page">
      {loading && <div className="bizen-save-loading" aria-busy="true"><div className="bizen-save-spinner" /></div>}
      <h1 className="season-heading">Món ăn theo mùa</h1>
      <div className="season-tabs">
        <button type="button" className={encouraged ? 'active' : ''} onClick={() => { setTab('plus'); setPage(1) }}>
          Món ăn khuyến khích
        </button>
        <button type="button" className={!encouraged ? 'active' : ''} onClick={() => { setTab('minus'); setPage(1) }}>
          Món ăn loại trừ
        </button>
      </div>
      <div className="season-layout">
        <form className="season-form" onSubmit={save}>
          <h2>{encouraged ? 'Thêm/Sửa món khuyến khích' : 'Thêm/Sửa món loại trừ'}</h2>
          <p>Nhập món và khoảng tháng áp dụng</p>
          <label>Món ăn<input value={form.food_name} onChange={(event) => setForm({ ...form, food_name: event.target.value })} /></label>
          <label>Từ tháng<input type="number" min="1" max="12" value={form.start_month} onChange={(event) => setForm({ ...form, start_month: event.target.value })} /></label>
          <label>Đến tháng<input type="number" min="1" max="12" value={form.end_month} onChange={(event) => setForm({ ...form, end_month: event.target.value })} /></label>
          <button className="season-save" type="submit" disabled={loading}>▣ &nbsp; {loading ? 'Đang lưu...' : 'Lưu'}</button>
          {message && <p className="season-status">{message}</p>}
          {error && <p className="season-status error">{error}</p>}
        </form>
        <section className="season-list">
          <div className="season-list-heading"><h2>{encouraged ? 'Danh sách món khuyến khích' : 'Danh sách món loại trừ'}</h2><label className="season-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Tìm món ăn..." aria-label="Tìm món ăn theo mùa" /></label></div>
          <div className="season-table-scroll">
          <table>
            <thead>
              <tr><th>STT</th><th>MÓN ĂN</th><th>THÁNG BẮT ĐẦU</th><th>THÁNG KẾT THÚC</th></tr>
            </thead>
            <tbody>
              {paginatedRows.map((row, index) => {
                const months = monthOf(row)
                return (
                  <tr key={row._id || `${row.food_name}-${index}`}>
                    <td>{(page - 1) * 25 + index + 1}</td>
                    <td>{row.food_name}</td>
                    <td>{months.start}</td>
                    <td>{months.end}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
          <Pagination page={page} totalItems={visible.length} pageSize={25} onPageChange={setPage} label="món" className="season-pagination" />
        </section>
      </div>
    </main>
  )
  
}

export default MonAnTheoMuaPage