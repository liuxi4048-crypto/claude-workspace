import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

const SERVICE_OPTIONS = [
  { value: 'proposal', label: '提案書・営業資料' },
  { value: 'report', label: 'レポート・報告書' },
  { value: 'lp', label: 'LP・セールスコピー' },
  { value: 'minutes', label: '議事録・会議メモ' },
  { value: 'other', label: 'その他ビジネス文書' },
]

const PLAN_OPTIONS = [
  { value: 'ベーシック', label: 'ベーシック ¥3,000' },
  { value: 'スタンダード', label: 'スタンダード ¥8,000' },
  { value: 'プレミアム', label: 'プレミアム ¥20,000' },
]

const PLAN_AMOUNTS: Record<string, number> = {
  ベーシック: 3000,
  スタンダード: 8000,
  プレミアム: 20000,
}

export default function NewOrder() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    client_name: '',
    service_type: 'proposal',
    plan: 'ベーシック',
    details: '',
    deadline: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const order = await api.createOrder({
        ...form,
        amount: PLAN_AMOUNTS[form.plan],
      })
      navigate(`/orders/${order.id}`)
    } finally {
      setLoading(false)
    }
  }

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">新規案件 — 要件定義</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">クライアント名 *</label>
          <input
            type="text"
            required
            value={form.client_name}
            onChange={e => set('client_name', e.target.value)}
            placeholder="例: 株式会社〇〇 田中様"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">サービス種別 *</label>
            <select
              value={form.service_type}
              onChange={e => set('service_type', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {SERVICE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">プラン *</label>
            <select
              value={form.plan}
              onChange={e => set('plan', e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PLAN_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">納期 *</label>
          <input
            type="date"
            required
            value={form.deadline}
            onChange={e => set('deadline', e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">依頼詳細 *</label>
          <textarea
            required
            rows={6}
            value={form.details}
            onChange={e => set('details', e.target.value)}
            placeholder="クライアントから受け取った要件をここにペーストしてください。&#10;&#10;例:&#10;- 会社概要: IT系スタートアップ、社員30名&#10;- ターゲット: 中小企業の経営者&#10;- 目的: 新サービスの導入提案&#10;- 盛り込みたい内容: 課題→解決策→事例→料金"
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div className="pt-2 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            金額: <span className="font-semibold text-slate-700">¥{PLAN_AMOUNTS[form.plan].toLocaleString()}</span>
          </p>
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? '登録中...' : '案件を登録してAI生成へ →'}
          </button>
        </div>
      </form>
    </div>
  )
}
