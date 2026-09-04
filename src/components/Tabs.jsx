function Tabs({ items, value, onChange, className = '' }) {
  return (
    <div className={`tabs ${className}`.trim()} role="tablist">
      {items.map((item) => (
        <button
          key={item.value}
          className={value === item.value ? 'active' : ''}
          type="button"
          role="tab"
          aria-selected={value === item.value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

export default Tabs
