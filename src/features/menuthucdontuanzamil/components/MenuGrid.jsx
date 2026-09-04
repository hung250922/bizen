import { days, foodTypes } from '../data/menuData'
import DayColumn from './DayColumn'

function MenuGrid({ menuRows = [], shift = 'Ca 1' }) {
  return (
    <main className="menu-grid" id="menuGrid">
      {days.map((day) => (
        <DayColumn
          day={day}
          foodTypes={foodTypes}
          menuRows={menuRows}
          shift={shift}
          key={day}
        />
      ))}
    </main>
  )
}

export default MenuGrid