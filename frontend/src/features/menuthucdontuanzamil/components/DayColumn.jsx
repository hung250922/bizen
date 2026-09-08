import FoodItem from './FoodItem'

function DayColumn({ day, foodTypes, menuRows = [], shift = 'Ca 1' }) {
  const dayRows = menuRows.filter((row) => {
    const thu = row.Thu || row['Thứ'] || ''
    const ca = row.Ca || ''
    return thu === day && (!shift || ca === shift || ca === shift.toUpperCase())
  })

  function dishForType(food) {
    const match = dayRows.find((row) => {
      const type = row['Cơ cấu suất ăn'] || row.CoCauSuatAn || ''
      return type.toLowerCase().includes(food.name.replace('Món ', '').toLowerCase())
        || type === food.name
    })
    return match?.['Món ăn'] || match?.MonAn || dayRows[0]?.['Món ăn'] || dayRows[0]?.MonAn || ''
  }

  return (
    <article className="day-column">
      <div className="day-header">
        <span>{day}</span>
        <span className="water-icon" aria-hidden="true" />
      </div>
      <div className="day-body">
        {foodTypes.map((food) => (
          <FoodItem food={food} dishName={dishForType(food)} key={food.name} />
        ))}
      </div>
      <div className="day-footer">
        <div className="cost-line">
          Chi phí: <strong>0 VND</strong>
        </div>
        <div className="weight-line">
          Tỷ trọng: <strong>0%</strong>
        </div>
      </div>
    </article>
  )
}

export default DayColumn