import axios from 'axios'
import { useAuthStore } from '@/stores/authStore'
import { useOfflineStore } from '@/stores/offlineStore'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
})

let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

apiClient.interceptors.request.use((config) => {
  const { user } = useAuthStore.getState()
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`
  }
  if (user?.schoolCode) {
    config.headers['X-School-Code'] = user.schoolCode
  }
  // Accept-Language is set per-request by feature hooks when needed
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (!error.response) {
      // Network error — queue write operations for BackgroundSync
      if (originalRequest.method !== 'get') {
        useOfflineStore.getState().queueAction({
          method: originalRequest.method.toUpperCase(),
          url: originalRequest.url,
          data: originalRequest.data ? JSON.parse(originalRequest.data) : undefined,
        })
      }
      return Promise.reject(error)
    }

    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(apiClient(originalRequest))
          })
        })
      }

      isRefreshing = true
      const { user, setUser, clearUser } = useAuthStore.getState()

      try {
        const { data } = await axios.post(`${API_BASE_URL}/api/v1/auth/refresh`, {
          refreshToken: user?.refreshToken,
        })
        setUser({ ...user!, token: data.token, refreshToken: data.refreshToken })
        refreshQueue.forEach((cb) => cb(data.token))
        refreshQueue = []
        originalRequest.headers.Authorization = `Bearer ${data.token}`
        return apiClient(originalRequest)
      } catch {
        clearUser()
        if (typeof window !== 'undefined') {
          window.location.href = '/auth/login'
        }
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
