import { useEffect, useState } from 'react'
import httpClient from '../../../services/httpClient'
import { ensureMinimumLoading } from '../../../utils/ensureMinimumLoading'
import Pagination from '../../../components/Pagination'
import '../styles/phoiHopCombo.css'

function PhoiHopComboPage() {
  const pageSize = 25
  const [form, setForm] = useState({ ingredient: '', with: '', without: '' })
  const [rows, setRows] = useState([])
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  async function loadCombos() {
    const loadingStartedAt = Date.now()
    setLoading(true)
    try {
      const res = await httpClient.get('/catering/phoi_hop_combos')
      if (res.data.error) {
        setMessage(res.data.error)
        return
      }
      setRows(res.data.data || [])
      setPage(1)
    } catch {
      setMessage('Không tải được phối hợp combo. Kiểm tra backend cổng 4130.')
    } finally {
      await ensureMinimumLoading(loadingStartedAt)
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCombos()
  }, [])

  const normalizedSearch = search.trim().toLowerCase()
  const visibleRows = rows.filter((row) => !normalizedSearch || `${row.nvl_name || ''} ${row.nvl_have_to_go_with || ''} ${row.nvl_not_to_go_with || ''}`.toLowerCase().includes(normalizedSearch))
  const paginatedRows = visibleRows.slice((page - 1) * pageSize, page * pageSize)

  function updateField(field, value) {
    setSaved(false)
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function saveCombo(event) {
    event.preventDefault()
    if (!form.ingredient.trim() || !form.with.trim() || !form.without.trim()) {
      setMessage('Nhập đủ 3 ô.')
      return
    }

    setLoading(true)
    setMessage('')
    try {
      const res = await httpClient.post('/catering/add_phoi_hop_combo', {
        nvl_name: form.ingredient.trim(),
        nvl_have_to_go_with: form.with.trim(),
        nvl_not_to_go_with: form.without.trim(),
      })
      if (res.data.error) {
        setMessage(res.data.error)
        return
      }
      setForm({ ingredient: '', with: '', without: '' })
      setSaved(true)
      await loadCombos()
    } catch {
      setMessage('Lưu thất bại. Kiểm tra backend cổng 4130.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="combo-page">
      {loading && <div className="bizen-save-loading" aria-busy="true"><div className="bizen-save-spinner" /></div>}
      <h1 className="combo-heading">Phối hợp combo</h1>
      <div className="combo-layout">
        <form className="combo-form" onSubmit={saveCombo}>
          <h2>Thêm/Sửa Phối hợp combo</h2>
          <label>
            Nguyên vật liệu
            <input
              value={form.ingredient}
              onChange={(event) => updateField('ingredient', event.target.value)}
            />
          </label>
          <label>
            Nguyên vật liệu nên đi cùng
            <input
              value={form.with}
              onChange={(event) => updateField('with', event.target.value)}
            />
          </label>
          <label>
            Nguyên vật liệu không nên đi cùng
            <input
              value={form.without}
              onChange={(event) => updateField('without', event.target.value)}
            />
          </label>
          <button type="submit" disabled={loading}>
            ▣ &nbsp; {loading ? 'Đang lưu...' : 'Lưu'}
          </button>
          <span className="combo-status" role="status">
            {message || (saved ? 'Đã lưu phối hợp combo lên server.' : '')}
          </span>
        </form>
        <section className="combo-list">
          <div className="table-list-heading"><h2>Danh sách Phối hợp combo</h2><label className="table-search"><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Tìm nguyên vật liệu..." aria-label="Tìm phối hợp combo" /></label></div>
          <div className="combo-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>NGUYÊN VẬT LIỆU</th>
                  <th>NGUYÊN VẬT LIỆU NÊN ĐI CÙNG</th>
                  <th>NGUYÊN VẬT LIỆU KHÔNG NÊN ĐI CÙNG</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row, index) => (
                  <tr key={row._id || `${row.nvl_name}-${index}`}>
                    <td>{(page - 1) * pageSize + index + 1}</td>
                    <td>{row.nvl_name}</td>
                    <td>{row.nvl_have_to_go_with}</td>
                    <td>{row.nvl_not_to_go_with}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalItems={visibleRows.length} pageSize={pageSize} onPageChange={setPage} label="combo" />
          {loading && <p>Đang tải...</p>}
        </section>
      </div>
    </main>
  )
}

export default PhoiHopComboPage