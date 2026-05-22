import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import type { Stats, Order } from '../types'
import { STATUS_LABELS, STATUS_COLORS } from '../types'

export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    api.getStats().then(setStats)
    api.getOrders().then(setOrders)
  }, [])

  const recent = orders.slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">ダッシュボード</h1>
        <Link
          to="/new"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + 新規案件
        </Link>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="総案件数" value={stats.total_orders} unit="件" color="slate" />
          <StatCard label="受注中" value={stats.received} unit="件" color="yellow" />
          <StatCard label="生成済み" value={stats.generated} unit="件" color="blue" />
          <StatCard label="売上合計" value={`¥${stats.total_revenue.toLocaleString()}`} unit="" color="green" />
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">最近の案件</h2>
          <Link to="/orders" className="text-indigo-600 text-sm hover:underline">すべて見る →</Link>
        </div>
        {recent.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            案件がありません。<Link to="/new" className="text-indigo-600 hover:underline">新規案件を作成</Link>してください。
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs">
              <tr>
                <th className="px-6 py-3 text-left">クライアント</th>
                <th className="px-6 py-3 text-left">サービス</th>
                <th className="px-6 py-3 text-left">金額</th>
                <th className="px-6 py-3 text-left">納期</th>
                <th className="px-6 py-3 text-left">ステータス</th>
                <th className="px-6 py-3 text-left"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.map(order => (
                <tr key={order.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-800">{order.client_name}</td>
                  <td className="px-6 py-3 text-slate-600">{order.service_type}</td>
                  <td className="px-6 py-3 text-slate-800">¥{order.amount.toLocaleString()}</td>
                  <td className="px-6 py-3 text-slate-600">{order.deadline}</td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
                      {STATUS_LABELS[order.status]}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <Link to={`/orders/${order.id}`} className="text-indigo-600 hover:underline text-xs">
                      詳細
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

function StatCard({ label, value, unit, color }: { label: string; value: number | string; unit: string; color: string }) {
  const colors: Record<string, string> = {
    slate: 'bg-slate-50 text-slate-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
  }
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}<span className="text-sm font-normal ml-1">{unit}</span></p>
    </div>
  )
}
