import { createClient } from './supabase'

const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '')

async function throwApiError(res: Response): Promise<never> {
  let message = `Ошибка ${res.status}`
  try {
    const body = await res.json()
    if (body.error) message = body.error
  } catch {
    // response is not JSON (e.g. plain-text 404 from router)
  }
  throw new Error(message)
}

async function getAuthToken() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session?.access_token
}

export const api = {
  async get<T>(path: string): Promise<T> {
    const token = await getAuthToken()
    const res = await fetch(`${API_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      await throwApiError(res)
    }

    return res.json()
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const token = await getAuthToken()
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      await throwApiError(res)
    }

    return res.json()
  },

  async put<T>(path: string, body?: unknown): Promise<T> {
    const token = await getAuthToken()
    const res = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      await throwApiError(res)
    }

    return res.json()
  },

  async delete<T>(path: string): Promise<T> {
    const token = await getAuthToken()
    const res = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) {
      await throwApiError(res)
    }

    return res.json()
  },
}
