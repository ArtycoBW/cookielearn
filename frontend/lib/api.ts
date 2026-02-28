import { createClient } from './supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

async function getAuthToken() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const token = await getAuthToken()
    const res = await fetch(`${API_URL}${path}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Ошибка запроса')
    }
    
    return res.json()
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const token = await getAuthToken()
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Ошибка запроса')
    }
    
    return res.json()
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const token = await getAuthToken()
    const res = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Ошибка запроса')
    }
    
    return res.json()
  },

  async delete<T>(path: string): Promise<T> {
    const token = await getAuthToken()
    const res = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Ошибка запроса')
    }
    
    return res.json()
  },
}
