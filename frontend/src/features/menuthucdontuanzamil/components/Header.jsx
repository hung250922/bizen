import { useState } from 'react'

function Header() {
  const [isWeekOpen, setIsWeekOpen] = useState(false)

  return (
    <header className="header">
      <div className="logo-area">
        <div>
        </div>
      </div>

      <h1 className="page-title">Menu thực đơn tuần</h1>

      <div className="week-selector-wrap">
        <button
          className="week-selector"
          type="button"
          aria-expanded={isWeekOpen}
          aria-haspopup="listbox"
          onClick={() => setIsWeekOpen(!isWeekOpen)}
        >
          <div className="calendar-icon" aria-hidden="true" />
          <span>Tuần 0 · 2024</span>
          <span className={`filter-arrow filter-arrow-small${isWeekOpen ? ' is-open' : ''}`} aria-hidden="true" />
        </button>
        {isWeekOpen && (
          <div className="week-menu" role="listbox" aria-label="Chọn tuần">
            <button className="week-menu-option" type="button" role="option" aria-selected="true" onClick={() => setIsWeekOpen(false)}>
              Tuần 0 · 2024
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

export default Header;