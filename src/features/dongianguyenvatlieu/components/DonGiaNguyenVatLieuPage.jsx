import { useEffect, useMemo, useState } from 'react'
import httpClient from '../../../services/httpClient'
import { ensureMinimumLoading } from '../../../utils/ensureMinimumLoading'
import '../styles/donGiaNguyenVatLieu.css'

function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN').format(
    Number(value || 0)
  )
}

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function DonGiaNguyenVatLieuPage() {
  const [form, setForm] = useState({
    name: '',
    unit: '',
    price: '',
  })

  const [rows, setRows] = useState([])

  const [search, setSearch] = useState('')

  const [editingId, setEditingId] = useState(null)

  const [loading, setLoading] = useState(false)

  const [message, setMessage] = useState('')

  async function loadPrices() {
    setLoading(true)

    try {
      const res = await httpClient.get(
        '/catering/don_gia_nguyen_vat_lieus'
      )

      if (res.data?.error) {
        setMessage(res.data.error)
        return
      }

      setRows(res.data?.data || [])
    } catch (error) {
      console.error(error)

      setMessage(
        'Không tải được đơn giá NVL. Kiểm tra backend cổng 4130.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPrices()
  }, [])

  function updateField(field, value) {
    setMessage('')

    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  function startEdit(row) {
    setEditingId(row._id)

    setForm({
      name: row.nvl_name || '',
      unit: row.nvl_unit || '',
      price:
        row.nvl_price !== undefined &&
        row.nvl_price !== null
          ? String(row.nvl_price)
          : '',
    })

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function resetForm() {
    setEditingId(null)

    setForm({
      name: '',
      unit: '',
      price: '',
    })

    setMessage('')
  }

  async function saveMaterial(event) {
    event.preventDefault()

    const name = form.name.trim()
    const unit = form.unit.trim()
    const price = Number(form.price)

    if (!name) {
      setMessage('Nhập tên nguyên vật liệu.')
      return
    }

    if (!unit) {
      setMessage('Nhập đơn vị tính.')
      return
    }

    if (!Number.isFinite(price) || price < 0) {
      setMessage('Đơn giá phải là số hợp lệ.')
      return
    }

    const duplicate = rows.find(
      (row) =>
        normalize(row.nvl_name) === normalize(name) &&
        row._id !== editingId
    )

    if (duplicate) {
      setMessage(
        'Nguyên vật liệu này đã tồn tại. Hãy sửa dữ liệu cũ.'
      )
      return
    }

    const loadingStartedAt = Date.now()

    setLoading(true)
    setMessage('')

    try {
      let res

      const payload = {
        nvl_name: name,
        nvl_unit: unit,
        nvl_price: price,
      }

      if (editingId) {
        res = await httpClient.post(
          '/catering/edit_don_gia_nguyen_vat_lieu',
          {
            id: editingId,
            ...payload,
          }
        )
      } else {
        res = await httpClient.post(
          '/catering/add_don_gia_nguyen_vat_lieu',
          payload
        )
      }

      if (res.data?.error) {
        setMessage(res.data.error)
        return
      }

      resetForm()

      await loadPrices()

      setMessage(
        editingId
          ? 'Đã cập nhật đơn giá NVL.'
          : 'Đã thêm nguyên vật liệu.'
      )
    } catch (error) {
      console.error(error)

      setMessage(
        error.response?.data?.error ||
          'Lưu đơn giá thất bại.'
      )
    } finally {
      await ensureMinimumLoading(
        loadingStartedAt
      )

      setLoading(false)
    }
  }

  const filteredRows = useMemo(() => {
    const keyword = normalize(search)

    if (!keyword) {
      return rows
    }

    return rows.filter((row) =>
      normalize(
        `${row.nvl_name} ${row.nvl_unit}`
      ).includes(keyword)
    )
  }, [rows, search])

  return (
    <main className="material-price-page">
      {loading && (
        <div
          className="bizen-save-loading"
          aria-busy="true"
        >
          <div className="bizen-save-spinner" />
        </div>
      )}

      <header className="material-price-heading">
        <div>
          <p className="material-price-kicker">
            COST MANAGEMENT
          </p>

          <h1>
            Đơn giá nguyên vật liệu
          </h1>

          <p>
            Quản lý giá NVL dùng để tính giá vốn BOM.
          </p>
        </div>
      </header>

      <div className="material-price-layout">
        <form
          className="material-price-form"
          onSubmit={saveMaterial}
        >
          <div className="material-price-card-heading">
            <h2>
              {editingId
                ? 'Sửa đơn giá NVL'
                : 'Thêm đơn giá NVL'}
            </h2>

            <p>
              Giá được dùng trực tiếp để tính BOM.
            </p>
          </div>

          <label>
            Nguyên vật liệu

            <input
              value={form.name}
              placeholder="Ví dụ: Thịt heo"
              onChange={(event) =>
                updateField(
                  'name',
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Đơn vị nhỏ nhất

            <input
              value={form.unit}
              placeholder="g / kg / ml / cái"
              onChange={(event) =>
                updateField(
                  'unit',
                  event.target.value
                )
              }
            />
          </label>

          <label>
            Đơn giá

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              placeholder="0"
              onChange={(event) =>
                updateField(
                  'price',
                  event.target.value
                )
              }
            />
          </label>

          {message && (
            <div className="material-price-status">
              {message}
            </div>
          )}

          <div className="material-price-actions">
            <button
              type="submit"
              disabled={loading}
            >
              {editingId
                ? '✓ Cập nhật'
                : '▣ Lưu'}
            </button>

            {editingId && (
              <button
                type="button"
                className="material-price-cancel"
                onClick={resetForm}
              >
                Hủy
              </button>
            )}
          </div>
        </form>

        <section className="material-price-list">
          <div className="material-price-list-heading">
            <div>
              <p className="material-price-kicker">
                DANH MỤC NVL
              </p>

              <h2>
                Danh sách đơn giá NVL
              </h2>

              <span>
                {filteredRows.length} nguyên vật liệu
              </span>
            </div>

            <label className="material-price-search">
              <span>⌕</span>

              <input
                aria-label="Tìm nguyên vật liệu"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Tìm nguyên vật liệu..."
              />
            </label>
          </div>

          <div className="material-price-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>NGUYÊN VẬT LIỆU</th>
                  <th>ĐVT</th>
                  <th>ĐƠN GIÁ</th>
                  <th>CẬP NHẬT</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map(
                  (row, index) => (
                    <tr key={row._id}>
                      <td>{index + 1}</td>

                      <td>
                        <strong>
                          {row.nvl_name}
                        </strong>
                      </td>

                      <td>
                        {row.nvl_unit || '—'}
                      </td>

                      <td>
                        <strong className="material-price-value">
                          {formatMoney(
                            row.nvl_price
                          )}{' '}
                          ₫
                        </strong>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="material-edit-button"
                          onClick={() =>
                            startEdit(row)
                          }
                        >
                          Sửa
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {!loading &&
            filteredRows.length === 0 && (
              <div className="material-price-empty">
                Không có nguyên vật liệu phù hợp.
              </div>
            )}
        </section>
      </div>
    </main>
  )
}

export default DonGiaNguyenVatLieuPage