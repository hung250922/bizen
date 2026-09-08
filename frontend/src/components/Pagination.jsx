function getPageItems(currentPage, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1)

  const items = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)

  if (start > 2) items.push('start-ellipsis')
  for (let page = start; page <= end; page += 1) items.push(page)
  if (end < totalPages - 1) items.push('end-ellipsis')
  items.push(totalPages)
  return items
}

function Pagination({ page, totalItems, pageSize = 25, onPageChange, label = 'mục' }) {
  const totalPages = Math.ceil(totalItems / pageSize)
  if (!totalItems) return null

  const firstItem = (page - 1) * pageSize + 1
  const lastItem = Math.min(page * pageSize, totalItems)
  const pageItems = getPageItems(page, totalPages)

  return (
    <nav className="pagination" aria-label="Phân trang">
      <span className="pagination-summary">{firstItem}-{lastItem} / {totalItems} {label}</span>
      <div className="pagination-controls">
        <button type="button" className="pagination-button" disabled={page === 1} onClick={() => onPageChange(page - 1)} aria-label="Trang trước">‹</button>
        {pageItems.map((item) => (
          typeof item === 'number' ? (
            <button key={item} type="button" className={`pagination-button${item === page ? ' is-active' : ''}`} aria-current={item === page ? 'page' : undefined} onClick={() => onPageChange(item)}>{item}</button>
          ) : <span key={item} className="pagination-ellipsis">…</span>
        ))}
        <button type="button" className="pagination-button" disabled={page === totalPages} onClick={() => onPageChange(page + 1)} aria-label="Trang sau">›</button>
      </div>
    </nav>
  )
}

export default Pagination
