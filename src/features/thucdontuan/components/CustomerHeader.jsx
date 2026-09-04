function CustomerHeader() {
  return (
    <header className="customer-header">
      <div className="customer-header-inner">
        <div className="customer-logo">
        </div>
        <div className="customer-title">Thực đơn tuần</div>
        <div className="header-buttons">
          <button type="button">Dành cho khách hàng</button>
          <button type="button">⇩&nbsp; Tải PDF</button>
          <button type="button">▣&nbsp; In thực đơn</button>
          <button type="button" className="primary">🔗&nbsp; Sao chép liên kết</button>
        </div>
      </div>
    </header>
  )
}

export default CustomerHeader