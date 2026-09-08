function MenuInfo() {
  return (
    <section className="menu-info">
      <div className="info-top">
        <div><div className="info-title"><span className="info-calendar">▣</span>THỰC ĐƠN DÀNH CHO CÔNG NHÂN VIÊN WACOAL</div><div className="info-week">Tuần 26 • 22/06/2026 – 27/06/2026</div></div>
        <div className="badges"><span className="orange">2 món mặn</span><span className="green">1 rau/xào</span><span className="blue">1 canh</span><span className="purple">1 tráng miệng</span></div>
      </div>
      <div className="info-bottom">
        <InfoItem label="Khách hàng:" value="WACOAL" icon="♙" />
        <InfoItem label="Site:" value="WACOAL 1, WACOAL 2" icon="▥"  />
        <InfoItem label="Ca:" value="Ca 1" icon="◷" />
        <InfoItem label="Suất ăn:" value="Suất cơm" icon="♨" />
        <InfoItem label="Kiểu menu:" value="Kiểu menu mặn 1" icon="☷" />
      </div>
    </section>
  )
}

function InfoItem({ label, value, icon, expandable }) {
  return <div className="info-item"><span className="info-item-icon">{icon}</span><span className="info-label">{label}</span><strong>{value}</strong>{expandable && <span className="chevron">⌄</span>}</div>
}

export default MenuInfo