import type { Order, Stats } from './types'

const BASE = '/api'

export const api = {
  async getOrders(): Promise<Order[]> {
    const res = await fetch(`${BASE}/orders`)
    return res.json()
  },

  async createOrder(data: Omit<Order, 'id' | 'status' | 'created_at' | 'generated_content'>): Promise<Order> {
    const res = await fetch(`${BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return res.json()
  },

  async generateContent(orderId: string): Promise<{ content: string; order: Order }> {
    const res = await fetch(`${BASE}/orders/${orderId}/generate`, { method: 'POST' })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.detail || 'Generation failed')
    }
    return res.json()
  },

  async updateStatus(orderId: string, status: string): Promise<Order> {
    const res = await fetch(`${BASE}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    return res.json()
  },

  async getStats(): Promise<Stats> {
    const res = await fetch(`${BASE}/stats`)
    return res.json()
  },
}
