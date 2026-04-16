import axios from 'axios'

// Empty baseURL — Vite proxy forwards all API calls to localhost:8000
// This means the IP never needs to be hardcoded again
const api = axios.create({
  baseURL: '',
  timeout: 60000,
})

export default api
