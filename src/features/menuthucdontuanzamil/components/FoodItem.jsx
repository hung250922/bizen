import { useState } from 'react'

function FoodItem({ food }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="food-item">
      <div className={`food-icon ${food.className}`} aria-hidden="true">
        {food.icon}
      </div>
      <div className="food-info">
        <div className="food-name">{food.name}</div>
        <div className="food-selector">
          <button
            className="food-value"
            type="button"
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            onClick={() => setIsOpen(!isOpen)}
          >
            <span className="plus">+</span>
            Chưa set món
          </button>
          {isOpen && (
            <div className="food-menu" role="listbox" aria-label={`Chọn ${food.name}`}>
              <button className="food-menu-option" type="button" role="option" aria-selected="true" onClick={() => setIsOpen(false)}>
                Thêm món
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default FoodItem;