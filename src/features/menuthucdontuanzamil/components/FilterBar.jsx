import { useState } from 'react'
import { menuFilters } from '../data/menuData'

function FilterIcon({ type }) {
  return (
    <div className="filter-icon" aria-hidden="true">
      <div className={`${type}-icon`} />
    </div>
  )
}

function FilterDropdown({ filter, isOpen, onToggle, onClose }) {
  return (
    <div className="filter-option">
      <button
        className="filter-item"
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={onToggle}
      >
        <FilterIcon type={filter.icon} />
        <div className="filter-content">
          <div className="filter-label">{filter.label}</div>
          <div className="filter-value">{filter.value}</div>
        </div>
        <span className={`filter-arrow${isOpen ? ' is-open' : ''}`} aria-hidden="true" />
      </button>
      {isOpen && (
        <div className="filter-menu" role="listbox" aria-label={filter.label}>
          <button className="filter-menu-option" type="button" role="option" aria-selected="true" onClick={onClose}>
            {filter.value}
          </button>
        </div>
      )}
    </div>
  )
}

function FilterBar() {
  const [openFilter, setOpenFilter] = useState(null)

  return (
    <section className="filter-bar" aria-label="Thông tin thực đơn">
      {menuFilters.map((filter) => (
        <FilterDropdown
          key={filter.label}
          filter={filter}
          isOpen={openFilter === filter.label}
          onToggle={() => setOpenFilter(openFilter === filter.label ? null : filter.label)}
          onClose={() => setOpenFilter(null)}
        />
      ))}
    </section>
  )
}

export default FilterBar;