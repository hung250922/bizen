import { useEffect, useMemo, useState } from 'react'
import httpClient from '../../../services/httpClient'
import { ensureMinimumLoading } from '../../../utils/ensureMinimumLoading'
import Pagination from '../../../components/Pagination'
import '../styles/bomMonAn.css'

const ingredientSlots = Array.from({ length: 7 }, (_, index) => index + 1)

const emptyIngredients = ingredientSlots.map(() => ({
  name: '',
  unit: '',
  quantity: '',
}))

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value || 0))
}

function getIngredientPrice(name, prices) {
  const normalizedName = normalize(name)

  return prices.find(
    (item) => normalize(item.nvl_name) === normalizedName
  )
}

function calculateCost(ingredients, prices) {
  return ingredients.reduce((total, ingredient) => {
    if (!ingredient.name || !ingredient.quantity) {
      return total
    }

    const price = getIngredientPrice(ingredient.name, prices)

    if (!price) {
      return total
    }

    return total + Number(ingredient.quantity || 0) * Number(price.nvl_price || 0)
  }, 0)
}

function BomMonAnPage() {
  const [foodName, setFoodName] = useState('')
  const [search, setSearch] = useState('')

  const [rows, setRows] = useState([])
  const [prices, setPrices] = useState([])

  const [ingredients, setIngredients] = useState(emptyIngredients)

  const [editingId, setEditingId] = useState(null)

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [page, setPage] = useState(1)

  async function loadData() {
    setLoading(true)

    try {
      const [bomRes, priceRes] = await Promise.all([
        httpClient.get('/catering/bom_mon_ans'),
        httpClient.get('/catering/don_gia_nguyen_vat_lieus'),
      ])

      if (bomRes.data?.error) {
        setMessage(bomRes.data.error)
        return
      }

      if (priceRes.data?.error) {
        setMessage(priceRes.data.error)
        return
      }

      setRows(bomRes.data?.data || [])
      setPrices(priceRes.data?.data || [])
    } catch (error) {
      console.error(error)
      setMessage(
        'Không tải được dữ liệu BOM/NVL. Kiểm tra backend cổng 4130.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function updateIngredient(index, field, value) {
    setMessage('')

    setIngredients((current) =>
      current.map((ingredient, ingredientIndex) =>
        ingredientIndex === index
          ? {
              ...ingredient,
              [field]: value,
            }
          : ingredient
      )
    )
  }

  function selectIngredient(index, name) {
    const material = getIngredientPrice(name, prices)

    setIngredients((current) =>
      current.map((ingredient, ingredientIndex) =>
        ingredientIndex === index
          ? {
              ...ingredient,
              name,
              unit: material?.nvl_unit || ingredient.unit,
            }
          : ingredient
      )
    )
  }

  function editRow(row) {
    setEditingId(row._id)
    setFoodName(row.food_name || '')

    const nextIngredients = ingredientSlots.map((slot) => ({
      name: row[`NVL${slot}`] || '',
      unit: row[`NVL${slot}_DVT`] || '',
      quantity: row[`NVL${slot}_DM`] ?? '',
    }))

    setIngredients(nextIngredients)

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  function resetForm() {
    setEditingId(null)
    setFoodName('')
    setIngredients(
      ingredientSlots.map(() => ({
        name: '',
        unit: '',
        quantity: '',
      }))
    )
    setMessage('')
  }

  async function saveFood(event) {
    event.preventDefault()

    const name = foodName.trim()

    if (!name) {
      setMessage('Nhập tên món ăn.')
      return
    }

    const usedIngredients = ingredients.filter(
      (ingredient) =>
        ingredient.name.trim() && Number(ingredient.quantity || 0) > 0
    )

    if (!usedIngredients.length) {
      setMessage('Món ăn phải có ít nhất 1 nguyên vật liệu.')
      return
    }

    const payload = {
      food_name: name,
    }

    ingredients.forEach((ingredient, index) => {
      const slot = index + 1

      payload[`NVL${slot}`] = ingredient.name.trim()
      payload[`NVL${slot}_DVT`] = ingredient.unit.trim()
      payload[`NVL${slot}_DM`] = Number(ingredient.quantity || 0)
    })

    const loadingStartedAt = Date.now()

    setLoading(true)
    setMessage('')

    try {
      let response

      if (editingId) {
        response = await httpClient.post(
          '/catering/edit_bom_mon_an',
          {
            id: editingId,
            ...payload,
          }
        )
      } else {
        response = await httpClient.post(
          '/catering/add_bom_mon_an',
          payload
        )
      }

      if (response.data?.error) {
        setMessage(response.data.error)
        return
      }

      resetForm()

      await loadData()

      setMessage(
        editingId
          ? 'Đã cập nhật BOM món ăn.'
          : 'Đã thêm BOM món ăn.'
      )
    } catch (error) {
      console.error(error)

      setMessage(
        error.response?.data?.error ||
          'Lưu BOM thất bại. Kiểm tra backend.'
      )
    } finally {
      await ensureMinimumLoading(loadingStartedAt)
      setLoading(false)
    }
  }

  const filteredRows = useMemo(() => {
    const keyword = normalize(search)

    if (!keyword) {
      return rows
    }

    return rows.filter((row) =>
      normalize(row.food_name).includes(keyword)
    )
  }, [rows, search])

  const paginatedRows = filteredRows.slice((page - 1) * 25, page * 25)

  useEffect(() => {
    setPage(1)
  }, [search])

  const currentCost = useMemo(
    () => calculateCost(ingredients, prices),
    [ingredients, prices]
  )

  function getRowCost(row) {
    const rowIngredients = ingredientSlots.map((slot) => ({
      name: row[`NVL${slot}`] || '',
      quantity: row[`NVL${slot}_DM`] || 0,
    }))

    return calculateCost(rowIngredients, prices)
  }

  return (
    <main className="bom-page">
      {loading && (
        <div className="bizen-save-loading" aria-busy="true">
          <div className="bizen-save-spinner" />
        </div>
      )}

      <header className="bom-heading">
        <div>
          <p className="bom-eyebrow">COST MANAGEMENT</p>

          <h1>
            {editingId ? 'Sửa BOM món ăn' : 'BOM món ăn'}
          </h1>

          <p className="bom-heading-description">
            Quản lý nguyên vật liệu, định mức và tự động tính giá vốn món ăn.
          </p>
        </div>

        {editingId && (
          <button
            type="button"
            className="bom-cancel-edit"
            onClick={resetForm}
          >
            Hủy sửa
          </button>
        )}
      </header>

      <div className="bom-layout">
        <form className="bom-form" onSubmit={saveFood}>
          <div className="bom-card-heading">
            <div>
              <h2>
                {editingId
                  ? 'Sửa thông tin món'
                  : 'Thêm món ăn'}
              </h2>

              <p>
                Chọn nguyên vật liệu từ danh mục đơn giá
              </p>
            </div>
          </div>

          <label className="bom-food-label">
            Tên món ăn

            <input
              autoFocus
              value={foodName}
              placeholder="Ví dụ: Gà chiên nước mắm"
              onChange={(event) => {
                setFoodName(event.target.value)
                setMessage('')
              }}
            />
          </label>

          <div className="ingredient-list">
            {ingredientSlots.map((slot) => {
              const ingredient = ingredients[slot - 1]

              const material = getIngredientPrice(
                ingredient.name,
                prices
              )

              const ingredientCost =
                Number(ingredient.quantity || 0) *
                Number(material?.nvl_price || 0)

              return (
                <div className="ingredient-row" key={slot}>
                  <label>
                    NVL{slot}

                    <select
                      value={ingredient.name}
                      onChange={(event) =>
                        selectIngredient(
                          slot - 1,
                          event.target.value
                        )
                      }
                    >
                      <option value="">
                        -- Chọn nguyên vật liệu --
                      </option>

                      {prices.map((price) => (
                        <option
                          key={price._id}
                          value={price.nvl_name}
                        >
                          {price.nvl_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    ĐVT

                    <input
                      value={ingredient.unit}
                      placeholder="g / ml / cái"
                      onChange={(event) =>
                        updateIngredient(
                          slot - 1,
                          'unit',
                          event.target.value
                        )
                      }
                    />
                  </label>

                  <label>
                    Định mức

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={ingredient.quantity}
                      placeholder="0"
                      onChange={(event) =>
                        updateIngredient(
                          slot - 1,
                          'quantity',
                          event.target.value
                        )
                      }
                    />
                  </label>

                  {ingredient.name && (
                    <div className="ingredient-cost">
                      <small>Thành tiền</small>

                      <strong>
                        {formatMoney(ingredientCost)} ₫
                      </strong>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="bom-cost-preview">
            <div>
              <span>Giá vốn món ăn</span>

              <small>
                Tự động tính từ đơn giá NVL
              </small>
            </div>

            <strong>
              {formatMoney(currentCost)} ₫
            </strong>
          </div>

          {message && (
            <div className="bom-message">
              {message}
            </div>
          )}

          <button
            className="bom-save"
            type="submit"
            disabled={loading}
          >
            {editingId ? '✓ Cập nhật BOM' : '▣ Lưu món ăn'}
          </button>
        </form>

        <section className="bom-list">
          <div className="bom-list-heading">
            <div>
              <p className="bom-eyebrow">
                DANH MỤC MÓN ĂN
              </p>

              <h2>
                Danh sách BOM món ăn
              </h2>

              <span className="bom-result-count">
                {filteredRows.length} món
              </span>
            </div>

            <label className="bom-search">
              <span>⌕</span>

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Tìm món ăn..."
              />
            </label>
          </div>

          <div className="bom-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Món ăn</th>

                  {ingredientSlots.map((slot) => (
                    <th key={slot}>
                      NVL{slot}
                    </th>
                  ))}

                  <th>GIÁ VỐN</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {paginatedRows.map((row, index) => (
                  <tr
                    key={
                      row._id ||
                      `${row.food_name}-${index}`
                    }
                    className={
                      editingId === row._id
                        ? 'bom-row-editing'
                        : ''
                    }
                  >
                    <td>{(page - 1) * 25 + index + 1}</td>

                    <td className="bom-name">
                      <strong>
                        {row.food_name}
                      </strong>
                    </td>

                    {ingredientSlots.map((slot) => {
                      const name =
                        row[`NVL${slot}`]

                      const unit =
                        row[`NVL${slot}_DVT`]

                      const quantity =
                        row[`NVL${slot}_DM`]

                      if (!name) {
                        return (
                          <td key={slot}>
                            <span className="bom-empty-cell">
                              —
                            </span>
                          </td>
                        )
                      }

                      return (
                        <td key={slot}>
                          <div className="bom-ingredient">
                            <strong>{name}</strong>

                            <small>
                              {quantity} {unit}
                            </small>
                          </div>
                        </td>
                      )
                    })}

                    <td>
                      <strong className="bom-cost">
                        {formatMoney(
                          getRowCost(row)
                        )}{' '}
                        ₫
                      </strong>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="bom-edit-button"
                        onClick={() =>
                          editRow(row)
                        }
                      >
                        <span aria-hidden="true">✎</span> Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading &&
            filteredRows.length === 0 && (
              <div className="bom-empty">
                Không tìm thấy món ăn phù hợp.
              </div>
            )}
          <Pagination page={page} totalItems={filteredRows.length} pageSize={25} onPageChange={setPage} label="món" />
        </section>
      </div>
    </main>
  )
}

export default BomMonAnPage