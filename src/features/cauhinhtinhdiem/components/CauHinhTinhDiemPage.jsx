import { useEffect, useState } from 'react'
import httpClient from '../../../services/httpClient'
import { ensureMinimumLoading } from '../../../utils/ensureMinimumLoading'
import '../styles/cauHinhTinhDiem.css'

const fieldDefs = [
  { key: 'tc1_diem_trong_so', label: 'TC1 (Tính theo độ gần nhất) điểm trọng số' },
  { key: 'tc2_diem_trong_so', label: 'TC2 (Tính theo độ đa dạng protein) điểm trọng số' },
  { key: 'tc3_diem_trong_so', label: 'TC3 (Tính theo phương pháp chế biến) điểm trọng số' },
  { key: 'tc4_diem_trong_so', label: 'TC4 (Tính theo mức độ yêu thích) điểm trọng số' },
  { key: 'tc5_diem_trong_so', label: 'TC5 (Tính theo mùa vụ) điểm trọng số' },
  { key: 'ngay_trung_phuong_phap_che_bien', label: 'Không trùng phương pháp chế biến trong x ngày' },
]

const emptyForm = {
  tc1_diem_trong_so: 0,
  tc2_diem_trong_so: 0,
  tc3_diem_trong_so: 0,
  tc4_diem_trong_so: 0,
  tc5_diem_trong_so: 0,
  ngay_trung_phuong_phap_che_bien: 0,
}

function CauHinhTinhDiemPage() {
  const [form, setForm] = useState(emptyForm)
  const [configId, setConfigId] = useState(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function loadConfig() {
    setLoading(true)
    try {
      const res = await httpClient.get('/catering/cau_hinh_tinh_diems')
      if (res.data.error) {
        setMessage(res.data.error)
        return
      }
      const latest = (res.data.data || [])[0]
      if (latest) {
        setConfigId(latest._id)
        setForm({
          tc1_diem_trong_so: latest.tc1_diem_trong_so ?? 0,
          tc2_diem_trong_so: latest.tc2_diem_trong_so ?? 0,
          tc3_diem_trong_so: latest.tc3_diem_trong_so ?? 0,
          tc4_diem_trong_so: latest.tc4_diem_trong_so ?? 0,
          tc5_diem_trong_so: latest.tc5_diem_trong_so ?? 0,
          ngay_trung_phuong_phap_che_bien: latest.ngay_trung_phuong_phap_che_bien ?? 0,
        })
      }
    } catch {
      setMessage('Không tải được cấu hình. Kiểm tra backend cổng 4130.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  function updateValue(key, value) {
    setSaved(false)
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function saveSettings(event) {
    event.preventDefault()
    const payload = {
      tc1_diem_trong_so: Number(form.tc1_diem_trong_so || 0),
      tc2_diem_trong_so: Number(form.tc2_diem_trong_so || 0),
      tc3_diem_trong_so: Number(form.tc3_diem_trong_so || 0),
      tc4_diem_trong_so: Number(form.tc4_diem_trong_so || 0),
      tc5_diem_trong_so: Number(form.tc5_diem_trong_so || 0),
      ngay_trung_phuong_phap_che_bien: Number(form.ngay_trung_phuong_phap_che_bien || 0),
    }

    const loadingStartedAt = Date.now()
    setLoading(true)
    setMessage('')
    try {
      const res = configId
        ? await httpClient.post('/catering/edit_cau_hinh_tinh_diem', { id: configId, ...payload })
        : await httpClient.post('/catering/add_cau_hinh_tinh_diem', payload)

      if (res.data.error) {
        setMessage(res.data.error)
        return
      }
      setSaved(true)
      await loadConfig()
    } catch {
      setMessage('Lưu thất bại. Kiểm tra backend cổng 4130.')
    } finally {
      await ensureMinimumLoading(loadingStartedAt)
      setLoading(false)
    }
  }

  return (
    <main className="score-config-page">
      {loading && <div className="bizen-save-loading" aria-busy="true"><div className="bizen-save-spinner" /></div>}
      <form className="score-config-form" onSubmit={saveSettings}>
        <h1>Cấu hình hệ thống tính điểm và cảnh báo</h1>
        {fieldDefs.map((field) => (
          <label key={field.key}>
            {field.label}
            <input
              type="number"
              min="0"
              value={form[field.key]}
              onChange={(event) => updateValue(field.key, event.target.value)}
            />
          </label>
        ))}
        <button type="submit" disabled={loading}>
          ▣ &nbsp; {loading ? 'Đang lưu...' : 'Lưu'}
        </button>
        <span className="score-config-status" role="status">
          {message || (saved ? 'Đã lưu cấu hình lên server.' : '')}
        </span>
      </form>
    </main>
  )
}

export default CauHinhTinhDiemPage