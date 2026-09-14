import { useEffect, useMemo, useState } from 'react'
import httpClient from '../../../services/httpClient'
import '../styles/baoSoLuongQuanLySite.css'

const DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật']

const localDateMs = (date) => {
  if (!date) return null
  const [y, m, d] = date.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

const uniq = (arr) => [...new Set(arr)]
const num = (v) => Math.max(0, Number(v) || 0)

const siteMatches = (value, site) =>
  String(value || '').split(',').map((s) => s.trim()).includes(site)

const dateText = (ms) => {
  if (!ms) return 'Không có thực đơn'
  return new Date(ms).toLocaleDateString('vi-VN')
}

function BaoSoLuongQuanLySitePage() {
  const [clients, setClients] = useState([])
  const [clientCode, setClientCode] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [menuRows, setMenuRows] = useState([])
  const [values, setValues] = useState({})
  const [openDays, setOpenDays] = useState({})
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  useEffect(() => {
    async function loadClients() {
      try {
        const res = await httpClient.post('/larksuite/list_client')
        const list = res.data?.data || []

        setClients(
          [...list].sort((a, b) =>
            String(a).localeCompare(String(b))
          )
        )

        setClientCode('')
      } catch (error) {
        console.error(error)
        setMessage('Không tải được danh sách khách hàng.')
      }
    }

    loadClients()
  }, [])

  const groupedDays = useMemo(() => {
    const keywordLower = keyword.trim().toLowerCase()
    const result = {}

    DAYS.forEach((day) => {
      const rows = menuRows.filter((row) => {
        if (row.Thu !== day) return false
        if (!keywordLower) return true

        return [
          row.KhachHang,
          row.SiteAn,
          row.Ca,
          row.MonAn,
          row.CoCauSuatAn,  
        ].some((v) =>
          String(v || '').toLowerCase().includes(keywordLower)
        )
      })

      const caList = uniq(
        rows.map((row) => row.Ca).filter(Boolean)
      )

      result[day] = caList.map((ca) => ({
        ca,
        rows: rows.filter((row) => row.Ca === ca),
      }))
    })

    return result
  }, [menuRows, keyword])

  async function searchMenu() {
    if (!clientCode) {
      return setMessage('Vui lòng chọn khách hàng.')
    }

    if (!fromDate || !toDate) {
      return setMessage('Vui lòng chọn đầy đủ ngày.')
    }

    if (fromDate > toDate) {
      return setMessage(
        'Ngày bắt đầu không được lớn hơn ngày kết thúc.'
      )
    }

    setLoading(true)
    setMessage('')
    setValues({})

    try {
      const res = await httpClient.post(
        '/larksuite/thuc_don_tuan',
        {
          client_code: clientCode,
          fromDate,
          toDate,
        }
      )

      if (res.data?.error) {
        setMenuRows([])

        setMessage(
          typeof res.data.error === 'string'
            ? res.data.error
            : 'Không tải được thực đơn.'
        )

        return
      }

      const rows = res.data?.data || []

      setMenuRows(rows)

      const firstDays = {}

      DAYS.forEach((day) => {
        if (
          rows.some(
            (r) => (r.Thu || r['Thứ']) === day
          )
        ) {
          firstDays[day] = true
        }
      })

      setOpenDays(firstDays)

      setMessage(
        rows.length
          ? `Tải thành công ${rows.length} dòng thực đơn.`
          : 'Không có thực đơn cho khách hàng này.'
      )
    } catch (error) {
      console.error(error)
      setMenuRows([])
      setMessage(
        'Tìm kiếm thất bại. Kiểm tra backend cổng 4130.'
      )
    } finally {
      setLoading(false)
    }
  }

  const setValue = (key, value) =>
    setValues((current) => ({
      ...current,
      [key]: value,
    }))

  function buildRecords() {
    const records = []

    Object.keys(values).forEach((key) => {
      if (key.endsWith('!tong_so_nguoi_an')) {
        const [Ngay, KhachHang, SiteAn, Ca] =
          key.split('!')

        records.push({
          fields: {
            'Ngày': Number(Ngay),
            'Khách hàng': KhachHang,
            'Site ăn': SiteAn,
            'Ca': Ca,
            'Tổng số người ăn': num(values[key]),
          },
        })
      }
    })

    Object.keys(values).forEach((key) => {
      if (
        key.endsWith(
          '!so_luong_dang_ky_theo_co_cau_suat_an'
        )
      ) {
        const [
          Ngay,
          KhachHang,
          SiteAn,
          Ca,
          CoCauSuatAn,
        ] = key.split('!')

        records.push({
          fields: {
            'Ngày': Number(Ngay),
            'Khách hàng': KhachHang,
            'Site ăn': SiteAn,
            'Ca': Ca,
            'Cơ cấu suất ăn': CoCauSuatAn,
            'Số lượng đăng ký theo cơ cấu suất ăn':
              num(values[key]),
          },
        })
      }
    })

    Object.keys(values).forEach((key) => {
      if (key.endsWith('!phan_tram_so_luong')) {
        const [
          Ngay,
          KhachHang,
          SiteAn,
          Ca,
          MonAn,
        ] = key.split('!')

        records.push({
          fields: {
            'Ngày': Number(Ngay),
            'Khách hàng': KhachHang,
            'Site ăn': SiteAn,
            'Ca': Ca,
            'Món ăn': MonAn,
            '% số lượng': num(values[key]),
          },
        })
      }
    })

    return records
  }

  // modal
  async function submitReport() {
    if (!menuRows.length) {
      setMessage('Chưa có thực đơn để báo số lượng.')
      return
    }

    setShowConfirmModal(true)
  }

  async function confirmSubmitReport() {
    setShowConfirmModal(false)
    //đẩy lên lark 
    const saveDatasLarkBase = buildRecords()

    if (!saveDatasLarkBase.length) {
      setMessage('Chưa có dữ liệu báo số lượng.')
      return
    }

    setSubmitting(true)
    setMessage('')
    setSuccess(false)

    try {
      const res = await httpClient.post(
        '/larksuite/bao_so_luong_quan_ly_site',
        {
          data: saveDatasLarkBase,
        }
      )

      if (res.data?.error) {
        setMessage(res.data.error)
      } else {
        setSuccess(true)

        setMessage(
          res.data?.data ||
            'Bạn đã thêm dữ liệu thành công!'
        )
      }
    } catch (error) {
      console.error(error)

      setMessage(
        'Gửi thất bại. Kiểm tra backend cổng 4130.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  function renderInput(label, key, suffix = '') {
    return (
      <div className="site-input-item">
        <label>{label}</label>

        <div className="site-input-wrap">
          <input
            type="number"
            min="0"
            value={values[key] ?? ''}
            placeholder="Nhập số"
            onChange={(e) =>
              setValue(key, e.target.value)
            }
          />

          {suffix && <span>{suffix}</span>}
        </div>
      </div>
    )
  }

  function renderShift(day, shift) {
    const rows = shift.rows
    const first = rows[0] || {}

    const ngay = first.Ngay || ''
    const khachhang =
      first.KhachHang || clientCode

    const sites = uniq(
      rows.flatMap((row) =>
        String(row.SiteAn || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      )
    )

    return (
      <div
        className="site-shift"
        key={`${day}-${shift.ca}`}
      >
        <div className="site-shift-title">
          <span>{shift.ca}</span>
          <small>{sites.length} site</small>
        </div>

        <div className="site-shift-grid">
          {sites.map((site) => {
            const base =
              `${ngay}!${khachhang}!${site}!${shift.ca}`

            const totalKey =
              `${base}!tong_so_nguoi_an`

            const structures = uniq(
              rows
                .filter(
                  (row) =>
                    siteMatches(row.SiteAn, site) &&
                    row.CoCauSuatAn !== 'Suất cơm'
                )
                .map((row) => row.CoCauSuatAn)
                .filter(Boolean)
            )

            const dishes = uniq(
              rows
                .filter(
                  (row) =>
                    siteMatches(row.SiteAn, site) &&
                    row.CoCauSuatAn === 'Suất cơm'
                )
                .map((row) => row.MonAn)
                .filter(Boolean)
            )

            return (
              <article
                className="site-report-card"
                key={`${base}-card`}
              >
                <div className="site-card-title">
                  <strong>{site}</strong>
                  <span>{shift.ca}</span>
                </div>

                <section className="site-card-section">
                  <h4>Tổng số người ăn</h4>

                  {renderInput(
                    'Tổng số',
                    totalKey
                  )}
                </section>

                <section className="site-card-section">
                  <h4>
                    Số lượng theo cơ cấu suất ăn
                  </h4>

                  {structures.map(
                    (structure) => {
                      const key =
                        `${base}!${structure}!so_luong_dang_ky_theo_co_cau_suat_an`

                      return renderInput(
                        structure,
                        key
                      )
                    }
                  )}

                  {!structures.length && (
                    <div className="site-input-item">
                      <label>
                        Không có cơ cấu khác Suất cơm
                      </label>
                    </div>
                  )}
                </section>

                {dishes.length > 0 && (
                  <section className="site-card-section">
                    <h4>
                      % số lượng món mặn (suất cơm)
                    </h4>

                    {dishes.map((dish) => {
                      const key =
                        `${base}!${dish}!phan_tram_so_luong`

                      return renderInput(
                        dish,
                        key,
                        '%'
                      )
                    })}
                  </section>
                )}
              </article>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <main className="site-quantity-page">
      <header className="site-quantity-header">
        <div>
          <div className="site-page-kicker">
            BIZEN
          </div>

          <h1>
            Báo số lượng{' '}
            <span>(Quản lý site)</span>
          </h1>
        </div>

        <label className="site-top-search">
          <span>⌕</span>

          <input
            value={keyword}
            onChange={(e) =>
              setKeyword(e.target.value)
            }
            placeholder="Tìm kiếm..."
          />
        </label>
      </header>

      <section className="site-filter-card">
        <div className="site-filter">
          <label>
            <span>Chọn khách hàng</span>

            <select
              value={clientCode}
              onChange={(e) =>
                setClientCode(e.target.value)
              }
            >
              <option value="">
                Chọn khách hàng
              </option>

              {clients.map((client) => (
                <option
                  key={client}
                  value={client}
                >
                  {client}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Chọn từ ngày</span>

            <input
              type="date"
              value={fromDate}
              onChange={(e) =>
                setFromDate(e.target.value)
              }
            />
          </label>

          <label>
            <span>Chọn đến ngày</span>

            <input
              type="date"
              value={toDate}
              onChange={(e) =>
                setToDate(e.target.value)
              }
            />
          </label>

          <button
            className="site-search-button"
            type="button"
            onClick={searchMenu}
            disabled={loading}
          >
            {loading && <span className="site-loading-spinner" aria-hidden="true" />}
            {!loading && '⌕ '}
            {loading
              ? 'Đang tải...'
              : 'Tìm kiếm'}
          </button>
        </div>
      </section>

      {message && (
        <div
          className={`site-message${
            success ? ' success' : ''
          }`}
        >
          {message}
        </div>
      )}

      <section className="site-quantity-card">
        <div className="site-report-heading">
          <div>
            <span className="site-report-icon">
              ▣
            </span>

            <div>
              <h2>Danh sách báo cáo</h2>

              <p>
                {menuRows.length
                  ? `${menuRows.length} dòng thực đơn`
                  : 'Chưa có dữ liệu'}
              </p>
            </div>
          </div>

          <button
            className="site-report-button"
            type="button"
            onClick={submitReport}
            disabled={
              loading || submitting || !menuRows.length
            }
          >
            {submitting && <span className="site-loading-spinner" aria-hidden="true" />}
            {!submitting && '▣ '}
            {submitting
              ? 'Đang gửi...'
              : 'Gửi Báo số lượng'}
          </button>
        </div>

        <div className="site-day-list">
          {DAYS.map((day) => {
            const shifts =
              groupedDays[day] || []

            const rows = menuRows.filter(
              (row) => row.Thu === day
            )

            const open = !!openDays[day]
            const date = rows[0]?.Ngay

            return (
              <div
                className={`site-day${
                  open ? ' is-open' : ''
                }`}
                key={day}
              >
                <button
                  className="site-day-header"
                  type="button"
                  onClick={() =>
                    setOpenDays(
                      (current) => ({
                        ...current,
                        [day]: !current[day],
                      })
                    )
                  }
                >
                  <span className="site-day-title">
                    <span className="site-day-icon">
                      ▣
                    </span>

                    <span>
                      <strong>{day}</strong>{' '}

                      <small>
                        {rows.length
                          ? `${dateText(
                              date
                            )} · ${rows.length} dòng`
                          : '(Không có thực đơn)'}
                      </small>
                    </span>
                  </span>

                  <span className="site-day-chevron">
                    {open ? '⌃' : '⌄'}
                  </span>
                </button>

                {open && shifts.length > 0 && (
                  <div className="site-day-body">
                    {shifts.map((shift) =>
                      renderShift(day, shift)
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* MODAL XÁC NHẬN GỬI BÁO SỐ LƯỢNG */}
      {showConfirmModal && (
        <div
          className="confirm-modal-overlay"
          onClick={() =>
            setShowConfirmModal(false)
          }
        >
          <div
            className="confirm-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <h3>
              Xác nhận gửi báo số lượng
            </h3>

            <p>
              Bạn có đồng ý gửi báo số lượng không?
            </p>

            <div className="confirm-modal-actions">
              <button
                type="button"
                className="confirm-cancel"
                onClick={() =>
                  setShowConfirmModal(false)
                }
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

export default BaoSoLuongQuanLySitePage