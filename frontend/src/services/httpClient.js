import axios from 'axios'

const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
})

httpClient.interceptors.request.use((config) => {
  try {
    const rawUser = sessionStorage.getItem('bizen-auth') || localStorage.getItem('bizen-auth')
    const user = rawUser ? JSON.parse(rawUser) : null
    if (user) {
      if (user.accessToken) config.headers.Authorization = `Bearer ${user.accessToken}`
      config.headers['x-user-id'] = user._id || ''
      config.headers['x-user-name'] = user.name || ''
      config.headers['x-user-email'] = user.email || ''
    }
  } catch {
    // Requests still work when the stored session is unavailable.
  }
  return config
})

export default httpClient