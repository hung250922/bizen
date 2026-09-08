function CustomerDay({ day, foodTypes }) {
  return (
    <article className="customer-day">
      <header className="customer-day-header"><strong>{day.name}</strong><span>{day.date}</span></header>
      <div className="customer-menu-card">
        {day.foods.map((food, index) => {
          const type = foodTypes[index]
          return <div className="customer-food" key={type.label}><img src={type.image} alt={food} /><div><div className={`food-type ${type.className}`}>{type.label}</div><div className="customer-food-name">{food}</div></div></div>
        })}
      </div>
    </article>
  )
}

export default CustomerDay