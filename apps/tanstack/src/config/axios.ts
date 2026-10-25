// ** import lib
import axios from 'axios'

const axiosInstance = axios.create({
  // VITE_API_URL is a legacy name kept for existing .env files.
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    'http://localhost:8080',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Important for sending cookies with requests
})

// Request interceptor for adding auth tokens
axiosInstance.interceptors.request.use(
  (config) => {
    // Auth cookies are sent automatically with withCredentials: true
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor for handling errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    return Promise.reject(error)
  },
)

export default axiosInstance
