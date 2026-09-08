import { useEffect, useState } from 'react'
import Header from './components/Header'
import FilterBar from './components/FilterBar'
import MenuGrid from './components/MenuGrid'
import httpClient from '../../services/httpClient'
import './styles/menu.css'

function LegacyMenuPage() {
  const [clients, setClients] = useState([])
  const [clientCode, setClientCode] = useState('ZAMIL')
  const [shift, setShift] = useState('Ca 1')
  const [menuRows, setMenuRows] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await httpClient.post('/larksuite/list_client')
        const list = res.data.data || []
        setClients(list)
        if (list.includes('ZAMIL')) setClientCode('ZAMIL')
        else if (list[0]) setClientCode(list[0])
      } catch {
        setMessage('Không tải được danh sách khách hàng.')
      }
    }
    load()
  }, [])

  async function loadMenu(nextClient = clientCode) {
    if (!nextClient) return
    try {
      const res = await httpClient.post('/larksuite/thuc_don_tuan', {
        client_code: nextClient,
      })
      if (res.data.error) {
        setMenuRows([])
        setMessage('Không tải được thực đơn tuần.')
        return
      }
      const rows = res.data.data || []
      setMenuRows(rows)
      setMessage(rows.length ? `Có ${rows.length} dòng thực đơn.` : 'Chưa có thực đơn trên Lark.')
    } catch {
      setMessage('Tìm thực đơn thất bại.')
    }
  }

  useEffect(() => {
    loadMenu(clientCode)
  }, [clientCode])

  return (
    <div className="page">
      <Header />
      <FilterBar
        clients={clients}
        clientCode={clientCode}
        shift={shift}
        onClientChange={setClientCode}
        onShiftChange={setShift}
      />
      {message && <p style={{ padding: '0 16px' }}>{message}</p>}
      <MenuGrid menuRows={menuRows} shift={shift} />
    </div>
  )
}

export default LegacyMenuPage