import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { Order, OrderStatus } from '../types'
import { STATUS_LABELS, STATUS_COLORS, SERVICE_LABELS } from '../types'

const FILTERS: { label: string; value: OrderStatus | 'all' }[] = [
  { label: 'すべて', value: 'all' },
  { label: '受注', value: 'received' },
  { label: 'AI生成済', value: 'generated' },
  { label: '納品完了', value: 'delivered' },
]

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')

  useEffect(() => {
    api.getOrders().then(setOrders)
  }, [])

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">案件管理</h1>
        <Link
          to="/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + 新規案件
        </Link>
      </div>

      <div className="flex gap-2">
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400">案件がありません。</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="px-6 py-3 text-left">ID</th>
                <th className="px-6 py-3 text-left">クライアント</th>
                <th className="px-6 py-3 text-left">サービス</th>
                <th className="px-6 py-3 text-left">プラン</th>
                <th className="px-6 py-3 text-left">金額</th>
                <th className="px-6 py-3 text-left">納期</th>
                <th className="px-6 py-3 text-left">ステータス</th>
                <th className="px-6 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(order => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-mono text-xs text-slate-400">{order.id}</td>
                  <td className="px-6 py-3 font-medium text-slate-800">{order.client_name}</td>
                  <td className="px-6 py-3 text-slate-600">{SERVICE_LABELS[order.service_type] ?? order.service_type}</td>
                  <td className="px-6 py-3 text-slate-600">{order.plan}</td>
                  <td className="px-6 py-3 font-medium text-slate-800">¥{order.amount.toLocaleString()}</td>
                  <td className="px-6 py-3 text-slate-600">{order.deadline}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <Link to={`/orders/${order.id}`} className="text-indigo-600 hover:underline text-xs font-medium">
                      {order.status === 'received' ? '→ 生成する' : '詳細'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
