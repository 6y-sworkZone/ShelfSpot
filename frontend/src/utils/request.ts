import axios from 'axios'
import { message } from 'antd'
import type { ApiResponse } from '@/types'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

request.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

request.interceptors.response.use(
  (response) => {
    const res: ApiResponse = response.data
    if (res.code !== 0) {
      message.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message || 'Request Error'))
    }
    return res.data as unknown as typeof response
  },
  (error) => {
    if (error.response) {
      const status = error.response.status
      if (status === 401) {
        message.error('未授权，请重新登录')
      } else if (status === 403) {
        message.error('拒绝访问')
      } else if (status === 404) {
        message.error('请求地址不存在')
      } else if (status === 500) {
        message.error('服务器错误')
      } else {
        message.error(error.response.data?.message || `请求失败 (${status})`)
      }
    } else if (error.request) {
      message.error('网络错误，请检查网络连接')
    } else {
      message.error(error.message || '请求失败')
    }
    return Promise.reject(error)
  }
)

export default request
