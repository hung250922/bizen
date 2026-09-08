import { useEffect, useMemo, useState } from 'react'
import httpClient from '../../services/httpClient'
import { ensureMinimumLoading } from '../../utils/ensureMinimumLoading'
import {
  CO_CAU_SUAT_AN_SAMPLE,
  MENU_DATA_WEEKS,
  NGAY_AN_BY_CLIENTS,
} from './menuCatalog'
import Pagination from '../../components/Pagination'
import './lamThucDonTuan.css'

function asText(value) {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(', ')
  if (typeof value === 'object') return value.text || value.name || ''
  return ''
}

function startOfWeek(date) {
  const next = new Date(date)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  next.setDate(next.getDate() + diff)
  next.setHours(0, 0, 0, 0)
  return next
}

function addDays(date, days) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatDate(date) {
  return new Intl.DateTimeFormat('vi-VN').format(date)
}

function bomCost(bom = {}, priceMap = {}) {
  let total = 0
  for (let i = 1; i <= 7; i += 1) {
    const name = bom[`NVL${i}`]
    const qty = Number(bom[`NVL${i}_DM`] || 0)
    total += qty * Number(name ? priceMap[name] || 0 : 0)
  }
  return total
}

function groupBy(list, key) {
  return list.reduce((acc, item) => {
    const value = item[key] || 'Khác'
    acc[value] = acc[value] || []
    acc[value].push(item)
    return acc
  }, {})
}
function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

function inferProtein(value) {
  const text = String(value || '').toLowerCase()
  const groups = [
    ['Cá', /\bcá\b|cá sống|cá nục|cá cơm|cá basa|cá thu|cá lóc|cá diêu|cá hường/],
    ['Tôm', /\btôm\b/],
    ['Gà', /\bgà\b/],
    ['Vịt', /\bvịt\b/],
    ['Bò', /\bbò\b/],
    ['Thịt', /\bthịt\b|heo|sườn/],
    ['Trứng', /\btrứng\b/],
  ]
  return groups.find(([, pattern]) => pattern.test(text))?.[0] || ''
}
function LamThucDonTuanPage() {
  const [clients, setClients] = useState(Object.keys(CO_CAU_SUAT_AN_SAMPLE))
  const [client, setClient] = useState('ZAMIL')
  const [weekIdx, setWeekIdx] = useState(1)
  const [fromDay, setFromDay] = useState(startOfWeek(new Date()))
  const [boms, setBoms] = useState([])
  const [monAns, setMonAns] = useState([])
  const [priceMap, setPriceMap] = useState({})
  const [productPrice, setProductPrice] = useState(0)
  const [seasonPlus, setSeasonPlus] = useState([])
  const [seasonMinus, setSeasonMinus] = useState([])
  const [combos, setCombos] = useState([])
  const [scoreCfg, setScoreCfg] = useState({})
  const [filled, setFilled] = useState([])
  const [selected, setSelected] = useState(null)
  const [warning, setWarning] = useState('')
  const [saving, setSaving] = useState(false)
  const [searchDish, setSearchDish] = useState('')
  const [catalogPage, setCatalogPage] = useState(1)

  const days = NGAY_AN_BY_CLIENTS[client] || NGAY_AN_BY_CLIENTS.ZAMIL
  const shifts = CO_CAU_SUAT_AN_SAMPLE[client] || CO_CAU_SUAT_AN_SAMPLE.ZAMIL
  const history = MENU_DATA_WEEKS[client] || MENU_DATA_WEEKS.ZAMIL

  useEffect(() => {
    async function boot() {
      const [clientRes, monAnRes, bomRes, priceRes, seasonRes, comboRes, scoreRes] = await Promise.all([
        httpClient.post('/larksuite/list_client').catch(() => ({ data: { data: [] } })),
        httpClient.get('/catering/list'),
        httpClient.get('/catering/bom_mon_ans'),
        httpClient.get('/catering/don_gia_nguyen_vat_lieus'),
        httpClient.get('/catering/mon_an_theo_muas'),
        httpClient.get('/catering/phoi_hop_combos'),
        httpClient.get('/catering/cau_hinh_tinh_diems'),
      ])
      const list = (clientRes.data.data || []).map(asText).filter(Boolean)
      if (list.length) {
        setClients(Array.from(new Set([...Object.keys(CO_CAU_SUAT_AN_SAMPLE), ...list])))
      }
      setMonAns(monAnRes.data?.data || [])
      setBoms(bomRes.data.data || [])
      const map = {}
      ;(priceRes.data.data || []).forEach((row) => {
        if (row.nvl_name) map[row.nvl_name] = Number(row.nvl_price || 0)
      })
      setPriceMap(map)
      const seasons = seasonRes.data.data || []
      setSeasonPlus(seasons.filter((item) => item.is_encouraged).map((item) => item.food_name))
      setSeasonMinus(seasons.filter((item) => !item.is_encouraged).map((item) => item.food_name))
      setCombos(comboRes.data.data || [])
      setScoreCfg((scoreRes.data.data || [])[0] || {})
    }
    boot()
  }, [])

  useEffect(() => {
    httpClient
      .get('/catering/don_gia_san_phams', { params: { client_name: client } })
      .then((res) => setProductPrice(Number((res.data.data || [])[0]?.product_price || 0)))
      .catch(() => setProductPrice(0))
  }, [client])

  const catalog = useMemo(() => {
    return boms
      .filter((bom) => bom.food_name)
      .map((bom) => {
      const monAn = monAns.find((item) => item.Ten_Mon_An === bom.food_name || item.food_name === bom.food_name) || {}
      const ingredients = Array.from({ length: 7 }, (_, index) => bom[`NVL${index + 1}`]).filter(Boolean).join(' ')
      return {
        name: bom.food_name,
        protein: bom.Loai_Protein || bom.protein || monAn.Loai_Protein || monAn.protein || inferProtein(bom.food_name) || inferProtein(ingredients),
        phuongPhapCheBien: monAn.Phuong_Phap_Che_Bien || monAn.phuongPhapCheBien || '',
        bom,
        cost: bomCost(bom, priceMap),
      }
    })
  }, [boms, monAns, priceMap])

  function cellKey(thu, ca, monAnIndex) {
    return `${weekIdx}|${thu}|${ca}|${monAnIndex}`
  }

  function findFill(thu, ca, monAnIndex) {
    return filled.find((item) => item.key === cellKey(thu, ca, monAnIndex))
  }

  function dayCost(thu) {
    return filled
      .filter((item) => item.weekIdx === weekIdx && item.thu === thu)
      .reduce((sum, item) => sum + Number(item.cost || 0), 0)
  }

  function countTC1(name) {
    let point = 0
    let weekAppearances = ''
    for (let i = 1; i <= 4; i += 1) {
      const weekMenu = Object.values(history[String(-i)] || history[-i] || {}).flat()
      if (weekMenu.includes(name)) {
        if (!point) point = i * 2
        weekAppearances += `Tuần ${weekIdx - i}, `
      }
    }
    return { point, weekAppearances }
  }

  function countTC2(protein) {
    const total = filled.filter((item) => item.protein === protein).length
    return total === 0 ? 10 : total === 1 ? 5 : 0
  }

  function countTC3(method) {
    const total = filled.filter((item) => item.phuongPhapCheBien === method).length
    if (total === 0) return 10
    if (total === 1) return 6
    if (total === 2) return 4
    if (total === 3) return 2
    return 0
  }

  function addDish(dish) {
    if (!selected) {
      setWarning('Hãy chọn một ô “Chưa set món” trên lưới trước.')
      return
    }
    const { thu, ca, monAnIndex, slot } = selected
    const key = cellKey(thu, ca, monAnIndex)
    const nextItem = {
      key,
      weekIdx,
      thu,
      ca,
      monAnIndex,
      slot,
      monAnName: dish.name,
      protein: dish.protein,
      phuongPhapCheBien: dish.phuongPhapCheBien,
      cost: dish.cost || 0,
      ngay: addDays(fromDay, days.indexOf(thu)),
    }
    setFilled((current) => [...current.filter((item) => item.key !== key), nextItem])

    const daysLimit = Number(scoreCfg.ngay_trung_phuong_phap_che_bien || 0)
    if (daysLimit) {
      const duplicate = filled.find((item) => {
        if (item.phuongPhapCheBien !== dish.phuongPhapCheBien) return false
        const diff = Math.round((nextItem.ngay - item.ngay) / 86400000)
        return diff >= 0 && diff <= daysLimit
      })
      setWarning(
        duplicate
          ? `Món ăn "${dish.name}" với phương pháp chế biến "${dish.phuongPhapCheBien}" đã được chọn trong ${daysLimit} ngày gần nhất.`
          : ''
      )
    }

    const sameShift = [...filled.filter((item) => item.thu === thu && item.ca === ca && item.key !== key), nextItem]
    if (sameShift.length >= 2) {
      const first = sameShift[0]
      const combo = combos.find((item) => item.nvl_name === first.protein)
      if (combo?.nvl_not_to_go_with && String(combo.nvl_not_to_go_with).includes(dish.protein)) {
        setWarning(`Món ăn "${first.protein}" không nên đi cùng "${combo.nvl_not_to_go_with}".`)
      }
    }
  }

    async function saveMenu() {
    const weekItems = filled.filter((item) => item.weekIdx === weekIdx && item.monAnName)
    if (!weekItems.length) {
      setWarning('Chưa set món nào để lưu.')
      return
    }

        const records = weekItems.map((item) => ({
      fields: {
        'Ngày': new Date(item.ngay).getTime(),
        'Khách hàng': client,
        'Ca': 'Ca 1',
        'Món ăn': item.monAnName,
      },
    }))

    const loadingStartedAt = Date.now()
    setSaving(true)
    try {
      const res = await httpClient.post('/larksuite/add_thuc_don_tuan', { data: records })
      if (res.data.error) {
        setWarning(typeof res.data.error === 'string' ? res.data.error : 'Lưu Lark thất bại. Xem tab Network → Response.')
        return
      }
      setWarning('')
      alert(res.data.data || `Đã lưu ${records.length} món.`)
    } catch {
      setWarning('Không gọi được API lưu. Kiểm tra backend 4130 và route add_thuc_don_tuan.')
    } finally {
      await ensureMinimumLoading(loadingStartedAt)
      setSaving(false)
    }
  }

const filteredCatalog = useMemo(() => {
  const keyword = normalizeText(searchDish)

  if (!keyword) return catalog

  return catalog.filter((dish) => {
    const dishName = normalizeText(dish.name)
    const protein = normalizeText(dish.protein)
    const method = normalizeText(dish.phuongPhapCheBien)

    return (
      dishName.includes(keyword) ||
      protein.includes(keyword) ||
      method.includes(keyword)
    )
  })
}, [catalog, searchDish])

const paginatedCatalog = filteredCatalog.slice((catalogPage - 1) * 25, catalogPage * 25)
const proteinGroups = groupBy(paginatedCatalog, 'protein')
  return (
    <main className="mm">
      {saving && <div className="bizen-save-loading" aria-busy="true"><div className="bizen-save-spinner" /></div>}
      <h1>Menu thực đơn tuần {weekIdx}</h1>
      <section className="mm-card">
        <div className="mm-toolbar">
          <label>
            Công ty{' '}
            <select value={client} onChange={(event) => setClient(event.target.value)}>
              {clients.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <button className="mm-save" type="button" onClick={saveMenu} disabled={saving}>
            {saving && <span className="mm-save-spinner" aria-hidden="true" />}
            {saving ? 'Đang lưu...' : 'Lưu thực đơn tuần'}
          </button>
        </div>
        <table className="mm-table">
          <thead>
            <tr>
              <th>Công ty</th>
              <th>Ca</th>
              <th>Món ăn</th>
              {days.map((thu, index) => (
                <th key={thu}>
                  {thu}<br />{formatDate(addDays(fromDay, index))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(shifts).flatMap(([ca, slots]) =>
              slots.map((slot, monAnIndex) => (
                <tr key={`${ca}-${monAnIndex}`}>
                  {monAnIndex === 0 && (
                    <>
                      <td rowSpan={slots.length}>{client}</td>
                      <td rowSpan={slots.length}>{ca}</td>
                    </>
                  )}
                  <td style={{ textAlign: 'left', whiteSpace: 'nowrap' }}>{slot}</td>
                  {days.map((thu) => {
                    const fill = findFill(thu, ca, monAnIndex)
                    const isSelected = selected?.thu === thu && selected?.ca === ca && selected?.monAnIndex === monAnIndex
                    const className = isSelected ? 'wait' : fill ? 'filled' : 'empty'
                    return (
                      <td key={thu}>
                        <button
                          type="button"
                          className={`mm-btn ${className}`}
                          onClick={() => setSelected({ thu, ca, monAnIndex, slot })}
                        >
                          {isSelected && !fill
                            ? 'Đang chờ chọn'
                            : fill
                              ? `${fill.monAnName} (${Number(fill.cost).toLocaleString()} VND)`
                              : 'Chưa set món'}
                        </button>
                        {monAnIndex === slots.length - 1 && (
                          <>
                            <div className="mm-cost">Chi phí: {dayCost(thu).toLocaleString()} VND</div>
                            <div className="mm-ratio">
                              Tỷ trọng: {productPrice ? Math.round((dayCost(thu) / productPrice) * 100) : 0}%
                            </div>
                          </>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="mm-week">
          <button type="button" onClick={() => { setWeekIdx(weekIdx - 1); setFromDay(addDays(fromDay, -7)) }}>
            ← Tuần {weekIdx - 1}
          </button>
          <span>Tuần {weekIdx}</span>
          <button type="button" onClick={() => { setWeekIdx(weekIdx + 1); setFromDay(addDays(fromDay, 7)) }}>
            Tuần {weekIdx + 1} →
          </button>
        </div>
      </section>

      {warning && <div className="mm-alert">⚠ {warning}</div>}

      <section className="mm-catalog">
  <div className="mm-catalog-header">
    <h2>
      Danh mục món ăn
      <span className="mm-catalog-note">
        (TC1: độ gần nhất, TC2: đa dạng protein, TC3: phương pháp chế biến, TC4: yêu thích)
      </span>
    </h2>

    <div className="mm-search">
      <span className="mm-search-icon">⌕</span>

      <input
        type="text"
        value={searchDish}
        onChange={(event) => { setSearchDish(event.target.value); setCatalogPage(1) }}
        placeholder="Tìm món ăn..."
        aria-label="Tìm món ăn"
      />

      {searchDish && (
        <button
          type="button"
          className="mm-search-clear"
          onClick={() => { setSearchDish(''); setCatalogPage(1) }}
          aria-label="Xóa tìm kiếm"
        >
          ×
        </button>
      )}
    </div>
  </div>

  {searchDish && (
    <div className="mm-search-result">
      Tìm thấy <strong>{filteredCatalog.length}</strong> món phù hợp với:
      <strong> "{searchDish}"</strong>
    </div>
  )}

  {!filteredCatalog.length && searchDish && (
    <div className="mm-no-result">
      Không tìm thấy món ăn phù hợp với "{searchDish}"
    </div>
  )}

  <div className="mm-proteins">
          {Object.keys(proteinGroups).map((protein) => {
            const methods = groupBy(proteinGroups[protein], 'phuongPhapCheBien')
            return (
              <div className="mm-protein" key={protein}>
                <h3>{protein}</h3>
                {Object.keys(methods).map((method) => (
                  <div className="mm-method" key={method}>
                    <h4>{method}</h4>
                    {methods[method].map((dish) => {
                      const tc1 = countTC1(dish.name)
                      const tc2 = countTC2(protein)
                      const tc3 = countTC3(method)
                      const tc4 = 0
                      const total =
                        tc1.point * ((scoreCfg.tc1_diem_trong_so || 0) / 100) +
                        tc2 * ((scoreCfg.tc2_diem_trong_so || 0) / 100) +
                        tc3 * ((scoreCfg.tc3_diem_trong_so || 0) / 100) +
                        tc4 * ((scoreCfg.tc4_diem_trong_so || 0) / 100)
                      const nameClass = seasonMinus.includes(dish.name) ? 'minus' : seasonPlus.includes(dish.name) ? 'plus' : ''
                      const bom = dish.bom || {}
                      const rows = [1, 2, 3, 4, 5, 6, 7]
                        .map((i) => ({
                          name: bom[`NVL${i}`],
                          dm: bom[`NVL${i}_DM`],
                          dvt: bom[`NVL${i}_DVT`] || '',
                          price: priceMap[bom[`NVL${i}`]] || 0,
                        }))
                        .filter((row) => row.name)
                      return (
                        <div className="mm-dish" key={dish.name}>
                          <div className="mm-dish-top">
                            <div className={`mm-dish-name ${nameClass}`}>
                              <div>{dish.name}</div>
                              <div>({tc1.weekAppearances || 'chưa có'})</div>
                              <button type="button" className="mm-plus" onClick={() => addDish(dish)}>+</button>
                            </div>
                            <div>
                              <div className="mm-scores">
                                <span>TC1 {scoreCfg.tc1_diem_trong_so || 0}%<br /><b>{tc1.point}</b></span>
                                <span>TC2 {scoreCfg.tc2_diem_trong_so || 0}%<br /><b>{tc2}</b></span>
                                <span>TC3 {scoreCfg.tc3_diem_trong_so || 0}%<br /><b>{tc3}</b></span>
                                <span>TC4 {scoreCfg.tc4_diem_trong_so || 0}%<br /><b>{tc4}</b></span>
                                <span className="mm-total">Tổng<br />{Math.round(total)}</span>
                              </div>
                              <div className="mm-bom">
                                <b>NVL</b><b>ĐM</b><b>Giá</b><b>Tiền</b>
                                {rows.map((row) => (
                                  <span key={`${dish.name}-${row.name}`} style={{ display: 'contents' }}>
                                    <span>{row.name}</span>
                                    <span>{row.dm}{row.dvt}</span>
                                    <span>{row.price}</span>
                                    <span>{(row.price * Number(row.dm || 0)).toLocaleString()}</span>
                                  </span>
                                ))}
                                <span></span><span></span><b className="mm-bom-total-label">Tổng món</b>
                                <b>{Number(dish.cost || 0).toLocaleString()}</b>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
        <Pagination page={catalogPage} totalItems={filteredCatalog.length} pageSize={25} onPageChange={setCatalogPage} label="món" />
      </section>
    </main>
  )
}

export default LamThucDonTuanPage