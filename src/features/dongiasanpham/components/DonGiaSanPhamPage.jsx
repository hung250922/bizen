import { useEffect, useState } from 'react'
import httpClient from '../../../services/httpClient'
import { ensureMinimumLoading } from '../../../utils/ensureMinimumLoading'
import '../styles/donGiaSanPham.css'

function DonGiaSanPhamPage() {
  const [form, setForm] = useState({ customer: '', product: '', price: '' })
  const [rows, setRows] = useState([])
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function loadProducts() {
    setLoading(true)
    try {
      const res = await httpClient.get('/catering/don_gia_san_phams')
      if (res.data.error) {
        setMessage(res.data.error)
        return
      }
      setRows(res.data.data || [])
    } catch {
      setMessage('Không tải được đơn giá sản phẩm. Kiểm tra backend cổng 4130.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  function updateField(field, value) {
    setSaved(false)
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function saveProductPrice(event) {
    event.preventDefault()
    if (!form.customer.trim() || !form.product.trim() || !form.price.trim()) {
      setMessage('Nhập đủ khách hàng, sản phẩm và đơn giá.')
      return
    }

    const loadingStartedAt = Date.now()
    setLoading(true)
    setMessage('')
    try {
      const res = await httpClient.post('/catering/add_don_gia_san_pham', {
        client_name: form.customer.trim(),
        product_name: form.product.trim(),
        product_price: Number(form.price),
      })
      if (res.data.error) {
        setMessage(res.data.error)
        return
      }
      setForm({ customer: '', product: '', price: '' })
      setSaved(true)
      await loadProducts()
    } catch {
      setMessage('Lưu thất bại. Kiểm tra backend cổng 4130.')
    } finally {
      await ensureMinimumLoading(loadingStartedAt)
      setLoading(false)
    }
  }

  return (
    <main className="product-price-page">
      {loading && <div className="bizen-save-loading" aria-busy="true"><div className="bizen-save-spinner" /></div>}
      <h1 className="product-price-heading">Đơn giá sản phẩm</h1>
      <div className="product-price-layout">
        <form className="product-price-form" onSubmit={saveProductPrice}>
          <h2>Thêm/Sửa Đơn giá sản phẩm</h2>
          <label>
            Khách hàng
            <input
              value={form.customer}
              onChange={(event) => updateField('customer', event.target.value)}
            />
          </label>
          <label>
            Sản phẩm
            <input
              value={form.product}
              onChange={(event) => updateField('product', event.target.value)}
            />
          </label>
          <label>
            Đơn giá
            <input
              value={form.price}
              onChange={(event) => updateField('price', event.target.value)}
            />
          </label>
          <button type="submit" disabled={loading}>
            ▣ &nbsp; {loading ? 'Đang lưu...' : 'Lưu'}
          </button>
          <span className="product-price-status" role="status">
            {message || (saved ? 'Cập nhật đơn giá sản phẩm thành công!' : '')}
          </span>
        </form>
        <section className="product-price-list">
          <h2>Danh sách Đơn giá Sản Phẩm</h2>
          <div className="product-price-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>KHÁCH HÀNG</th>
                  <th>SẢN PHẨM</th>
                  <th>ĐƠN GIÁ SP</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row._id || `${row.client_name}-${row.product_name}-${index}`}>
                    <td>{index + 1}</td>
                    <td>{row.client_name}</td>
                    <td>{row.product_name}</td>
                    <td>{row.product_price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {loading && <p>Đang tải...</p>}
        </section>
      </div>
    </main>
  )
}

export default DonGiaSanPhamPage