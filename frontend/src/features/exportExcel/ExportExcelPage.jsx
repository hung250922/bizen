import { useEffect, useState } from 'react'
import httpClient from '../../services/httpClient'
import './exportExcelPage.css'

const TEMPLATES = [
  {
    value: '1',
    label: 'Mẫu 1 - Lệnh sản xuất (SO)',
    filePrefix: 'SO',
  },
  {
    value: '2',
    label: 'Mẫu 2 - Lệnh sản xuất (PR)',
    filePrefix: 'PR',
  },
  {
    value: '3',
    label: 'Mẫu 3 - Kế hoạch đặt hàng (POT)',
    filePrefix: 'POT',
  },
  {
    value: '4',
    label: 'Mẫu 4 - Đặt hàng (PO) - Cân đối tồn kho',
    filePrefix: 'PO',
  },
  {
    value: '5',
    label: 'Mẫu 5 - Đặt hàng (PO) - Mã, tên nguyên liệu, nhà cung cấp',
    filePrefix: 'PO',
  },
]

function formatToday() {
  const today = new Date()
  const offset = today.getTimezoneOffset() * 60000
  return new Date(today.getTime() - offset).toISOString().slice(0, 10)
}

function downloadBlob(blob, fileName) {
  if (!(blob instanceof Blob)) {
    throw new Error('Backend không trả về file Excel.')
  }

  if (blob.size === 0) {
    throw new Error('File Excel rỗng.')
  }

  const url = window.URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()

  window.setTimeout(() => {
    link.remove()
    window.URL.revokeObjectURL(url)
  }, 1000)
}

async function extractErrorMessage(error) {
  const responseData = error?.response?.data

  if (responseData instanceof Blob) {
    try {
      const text = await responseData.text()

      if (!text) {
        return 'Xuất Excel thất bại.'
      }

      try {
        const parsed = JSON.parse(text)

        return (
          parsed?.error ||
          parsed?.message ||
          text ||
          'Xuất Excel thất bại.'
        )
      } catch {
        return text || 'Xuất Excel thất bại.'
      }
    } catch {
      return 'Xuất Excel thất bại.'
    }
  }

  return (
    responseData?.error ||
    responseData?.message ||
    error?.message ||
    'Xuất Excel thất bại.'
  )
}

function ExportExcelPage() {
  const [clients, setClients] = useState([])

  const [selectedClients, setSelectedClients] = useState([])

  const [selectAllCompanies, setSelectAllCompanies] = useState(true)

  const [selectedTemplate, setSelectedTemplate] = useState('1')

  const [fromDate, setFromDate] = useState(formatToday())

  const [toDate, setToDate] = useState(formatToday())

  const [loadingClients, setLoadingClients] = useState(true)

  const [exporting, setExporting] = useState(false)

  const [exportElapsedSeconds, setExportElapsedSeconds] = useState(0)

  const [message, setMessage] = useState('')

  const [messageType, setMessageType] = useState('')

  useEffect(() => {
    if (!exporting) {
      setExportElapsedSeconds(0)
      return undefined
    }

    const startedAt = Date.now()
    const timer = window.setInterval(() => {
      setExportElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [exporting])

  useEffect(() => {
    let active = true

    async function loadClients() {
      setLoadingClients(true)

      setMessage('')
      setMessageType('')

      try {
        const response = await httpClient.post(
          '/larksuite/list_client'
        )

        const list = Array.isArray(
          response.data?.data
        )
          ? response.data.data.filter(Boolean)
          : []

        if (!active) {
          return
        }

        setClients(list)

        setSelectedClients(list)
        setSelectAllCompanies(true)
      } catch (error) {
        console.error(
          'LOAD CLIENT ERROR:',
          error
        )

        if (!active) {
          return
        }

        setMessageType('error')

        setMessage(
          'Không tải được danh sách khách hàng từ Lark.'
        )
      } finally {
        if (active) {
          setLoadingClients(false)
        }
      }
    }

    loadClients()

    return () => {
      active = false
    }
  }, [])

  async function handleExport() {
    setMessage('')
    setMessageType('')

    if (!selectAllCompanies && selectedClients.length === 0) {
      setMessageType('error')
      setMessage(
        'Vui lòng chọn khách hàng.'
      )
      return
    }

    if (!fromDate || !toDate) {
      setMessageType('error')
      setMessage(
        'Vui lòng chọn đầy đủ khoảng ngày.'
      )
      return
    }

    if (fromDate > toDate) {
      setMessageType('error')
      setMessage(
        'Ngày bắt đầu không được lớn hơn ngày kết thúc.'
      )
      return
    }

    setExporting(true)

    try {
      console.log(
        '========== EXPORT EXCEL =========='
      )

      console.log(
        'Template:',
        Number(selectedTemplate)
      )

      console.log(
        'Client:',
        selectAllCompanies ? 'Tất cả công ty' : selectedClients
      )

      console.log(
        'From:',
        fromDate
      )

      console.log(
        'To:',
        toDate
      )

      const response =
        await httpClient.post(
          '/export_excel_file/quy_trinh',
          {
            template:
              Number(selectedTemplate),

            client_codes: selectedClients,
            all_clients: selectAllCompanies,

            fromDate,

            toDate,
          },
          {
            responseType: 'blob',
            timeout: 120000,
          }
        )

      console.log(
        'EXPORT STATUS:',
        response.status
      )

      console.log(
        'EXPORT HEADERS:',
        response.headers
      )

      console.log(
        'EXPORT DATA:',
        response.data
      )

      console.log(
        'IS BLOB:',
        response.data instanceof Blob
      )

      console.log(
        'BLOB SIZE:',
        response.data?.size
      )

      console.log(
        'BLOB TYPE:',
        response.data?.type
      )

      /*
       * ======================================================
       * KIỂM TRA BACKEND CÓ TRẢ JSON LỖI HAY KHÔNG
       * ======================================================
       */

      const contentType =
        response.headers?.[
          'content-type'
        ] ||
        response.data?.type ||
        ''

      if (
        contentType.includes(
          'application/json'
        ) ||
        contentType.includes(
          'text/plain'
        )
      ) {
        const text =
          await response.data.text()

        let errorMessage = text

        try {
          const parsed =
            JSON.parse(text)

          errorMessage =
            parsed?.error ||
            parsed?.message ||
            text
        } catch {
          // Không phải JSON
        }

        throw new Error(
          errorMessage ||
            'Backend không trả file Excel.'
        )
      }

      /*
       * ======================================================
       * KIỂM TRA BLOB
       * ======================================================
       */

      const blob =
        response.data instanceof Blob
          ? response.data
          : new Blob(
              [response.data],
              {
                type:
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              }
            )

      if (blob.size === 0) {
        throw new Error(
          'File Excel rỗng.'
        )
      }

      /*
       * ======================================================
       * XÁC ĐỊNH TÊN FILE
       * ======================================================
       */

      const selected =
        TEMPLATES.find(
          (item) =>
            item.value ===
            selectedTemplate
        )

      const contentDisposition =
        response.headers?.[
          'content-disposition'
        ] || ''

      console.log(
        'CONTENT DISPOSITION:',
        contentDisposition
      )

      let serverFileName = ''

      /*
       * filename*=UTF-8''
       */

      const utf8Match =
        contentDisposition.match(
          /filename\*=UTF-8''([^;]+)/i
        )

      /*
       * filename="..."
       */

      const normalMatch =
        contentDisposition.match(
          /filename="?([^";]+)"?/i
        )

      if (utf8Match?.[1]) {
        try {
          serverFileName =
            decodeURIComponent(
              utf8Match[1]
            )
        } catch {
          serverFileName =
            utf8Match[1]
        }
      } else if (normalMatch?.[1]) {
        serverFileName =
          normalMatch[1]
      }

      /*
       * Tên file fallback
       */

      const safeClient =
        String(selectAllCompanies ? 'Tat_ca_cong_ty' : selectedClients.join('_'))
          .replace(
            /[\\/:*?"<>|]/g,
            '_'
          )

      const fileName =
        serverFileName ||
        `Mau_${selectedTemplate}_${selected?.filePrefix || 'Excel'}_${safeClient}_${fromDate}_${toDate}.xlsx`

      console.log(
        'DOWNLOAD FILE NAME:',
        fileName
      )

      /*
       * ======================================================
       * DOWNLOAD FILE
       * ======================================================
       */

      downloadBlob(
        blob,
        fileName
      )

      setMessageType('success')

      setMessage(
        `Đã xuất ${
          selected?.label ||
          'Excel'
        } thành công.`
      )

    } catch (error) {
      console.error(
        '========== EXPORT ERROR =========='
      )

      console.error(
        error
      )

      const message =
        await extractErrorMessage(
          error
        )

      setMessageType('error')

      setMessage(message)

    } finally {
      setExporting(false)

      console.log(
        '=================================='
      )
    }
  }

  return (
    <main className="export-excel-page">

      {/* ==================================================
          HEADER
      ================================================== */}

      <header className="export-excel-header">

        <div>

          <span className="export-excel-kicker">
            BIZEN CATERING
          </span>

          <h1>
            Xuất Excel
          </h1>

          <p>
            Xuất dữ liệu mới nhất từ Lark
            theo 5 biểu mẫu.
          </p>

        </div>

      </header>


      {/* ==================================================
          FORM CARD
      ================================================== */}

      <section className="export-excel-card">

        <div className="export-excel-card-header">

          <div>

            <h2>
              Thông tin xuất file
            </h2>

            <span>
              Chọn phạm vi dữ liệu
              và biểu mẫu cần xuất.
            </span>

          </div>

        </div>


        {/* ==================================================
            FORM
        ================================================== */}

        <div className="export-excel-form-grid">

          {/* ================= KHÁCH HÀNG ================= */}

          <label className="export-excel-field">

            <span>
              Khách hàng
            </span>

            <select
              value=""
              disabled={
                loadingClients ||
                exporting
              }
            >

              <option value="">{loadingClients ? 'Đang tải khách hàng...' : 'Chọn công ty bên dưới'}</option>

            </select>

            <div className="export-excel-company-list">
              <label>
                <input
                  type="checkbox"
                  checked={selectAllCompanies}
                  onChange={(event) => {
                    const checked = event.target.checked
                    setSelectAllCompanies(checked)
                    setSelectedClients(checked ? clients : [])
                  }}
                  disabled={loadingClients || exporting}
                />
                Tất cả công ty
              </label>
              {clients.map((client) => (
                <label key={client}>
                  <input
                    type="checkbox"
                    checked={selectAllCompanies || selectedClients.includes(client)}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...selectedClients, client]
                        : selectedClients.filter((item) => item !== client)
                      setSelectAllCompanies(next.length === clients.length)
                      setSelectedClients(next)
                    }}
                    disabled={selectAllCompanies || exporting}
                  />
                  {client}
                </label>
              ))}
            </div>

          </label>


          {/* ================= BIỂU MẪU ================= */}

          <label className="export-excel-field">

            <span>
              Biểu mẫu
            </span>

            <select
              value={selectedTemplate}
              onChange={(event) =>
                setSelectedTemplate(
                  event.target.value
                )
              }
              disabled={
                exporting
              }
            >

              {TEMPLATES.map(
                (template) => (
                  <option
                    key={
                      template.value
                    }
                    value={
                      template.value
                    }
                  >
                    {template.label}
                  </option>
                )
              )}

            </select>

          </label>


          {/* ================= TỪ NGÀY ================= */}

          <label className="export-excel-field">

            <span>
              Từ ngày
            </span>

            <input
              type="date"
              value={fromDate}
              onChange={(event) =>
                setFromDate(
                  event.target.value
                )
              }
              disabled={
                exporting
              }
            />

          </label>


          {/* ================= ĐẾN NGÀY ================= */}

          <label className="export-excel-field">

            <span>
              Đến ngày
            </span>

            <input
              type="date"
              value={toDate}
              onChange={(event) =>
                setToDate(
                  event.target.value
                )
              }
              disabled={
                exporting
              }
            />

          </label>

        </div>


        {/* ==================================================
            THÔNG TIN ĐANG CHỌN
        ================================================== */}

        <div className="export-excel-selected">

          <div>

            <span>
              Đang chọn
            </span>

            <strong>
              {
                TEMPLATES.find(
                  (item) =>
                    item.value ===
                    selectedTemplate
                )?.label
              }
            </strong>

          </div>


          <div>

            <span>
              Khách hàng
            </span>

            <strong>
              {
                selectAllCompanies
                  ? 'Tất cả công ty'
                  : selectedClients.join(', ') || '—'
              }
            </strong>

          </div>


          <div>

            <span>
              Khoảng ngày
            </span>

            <strong>
              {
                fromDate ||
                '—'
              }{' '}
              →
              {' '}
              {
                toDate ||
                '—'
              }
            </strong>

          </div>

        </div>


        {/* ==================================================
            MESSAGE
        ================================================== */}

        {message && (

          <div
            className={
              `export-excel-message ${
                messageType
              }`
            }

            role="status"
          >

            {message}

          </div>

        )}

        {exporting && (
          <div className="export-excel-loading" role="status" aria-live="polite">
            <div className="export-excel-loading-label">
              <span>
                {exportElapsedSeconds < 3
                  ? 'Đang kết nối Lark...'
                  : exportElapsedSeconds < 60
                    ? 'Đang lấy dữ liệu từ Lark...'
                    : 'Đang xử lý lâu hơn bình thường...'}
                {' '}({exportElapsedSeconds}s)
              </span>
              <span className="export-excel-spinner" aria-hidden="true" />
            </div>
            <div className="export-excel-loading-track">
              <div className="export-excel-loading-bar" />
            </div>
          </div>
        )}


        {/* ==================================================
            ACTION
        ================================================== */}

        <div className="export-excel-actions">

          <button
            type="button"
            className="export-excel-button"
            onClick={
              handleExport
            }
            disabled={
              loadingClients ||
              exporting ||
              (!selectAllCompanies && selectedClients.length === 0)
            }
          >

            {exporting
              ? 'Đang xuất Excel...'
              : 'Xuất Excel'}

          </button>

        </div>

      </section>


      {/* ==================================================
          HELP
      ================================================== */}

      <section className="export-excel-help">

        <div className="export-excel-help-icon">
          i
        </div>

        <div>

          <strong>
            Dữ liệu được lấy trực tiếp từ Lark
          </strong>

          <p>
            File Excel sử dụng biểu mẫu
            cố định, còn dữ liệu được lấy
            theo khách hàng và khoảng ngày
            bạn chọn.
          </p>

        </div>

      </section>

    </main>
  )
}

export default ExportExcelPage