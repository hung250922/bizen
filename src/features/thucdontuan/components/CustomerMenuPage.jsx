import { customerDays, customerFoodTypes } from '../data/customerMenuData'
import CustomerHeader from './CustomerHeader'
import MenuInfo from './MenuInfo'
import CustomerDay from './CustomerDay'
import '../styles/customer.css'

function CustomerMenuPage() {
  return (
    <div className="customer-page">
      <CustomerHeader />
      <main className="customer-main">
        <MenuInfo />
        <section className="customer-filters">
          <select aria-label="Ca"><option>Ca 1</option></select>
          <select aria-label="Suất ăn"><option>Suất cơm</option></select>
          <select aria-label="Site"><option>WACOAL 1</option></select>
          <button type="button">Xem</button>
        </section>
        <section className="customer-grid">
          {customerDays.map((day) => <CustomerDay day={day} foodTypes={customerFoodTypes} key={day.name} />)}
        </section>
      </main>
      <footer className="customer-footer">
        <div>* Thực đơn có thể được điều chỉnh theo tình hình nguyên liệu thực tế.</div>
        <div className="customer-footer-center"><strong>🍴 Bizen Catering</strong><span>Cập nhật lần cuối: 20/06/2026 14:30</span></div>
        <div className="qr-area"><div className="qr" /><span>Quét để xem thực đơn</span></div>
      </footer>
    </div>
  )
}

export default CustomerMenuPage