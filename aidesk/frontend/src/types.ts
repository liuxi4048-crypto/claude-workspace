export type OrderStatus = 'received' | 'generated' | 'delivered'

export interface Order {
  id: string
  client_name: string
  service_type: string
  plan: string
  amount: number
  details: string
  deadline: string
  status: OrderStatus
  created_at: string
  generated_content: string | null
}

export interface Stats {
  total_orders: number
  received: number
  generated: number
  delivered: number
  total_revenue: number
}

export const SERVICE_LABELS: Record<string, string> = {
  proposal: '提案書・営業資料',
  report: 'レポート・報告書',
  lp: 'LP・セールスコピー',
  minutes: '議事録・会議メモ',
  other: 'その他ビジネス文書',
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  received: '受注',
  generated: 'AI生成済',
  delivered: '納品完了',
}

export const STATUS_COLORS: Record<OrderStatus, string> = {
  received: 'bg-yellow-100 text-yellow-800',
  generated: 'bg-blue-100 text-blue-800',
  delivered: 'bg-green-100 text-green-800',
}
