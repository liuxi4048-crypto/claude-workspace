import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import type { Order } from '../types'
import { STATUS_LABELS, STATUS_COLORS, SERVICE_LABELS } from '../types'

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getOrders().then(orders => {
      const found = orders.find(o => o.id === id)
      if (found) setOrder(found)
    })
  }, [id])

  const handleGenerate = async () => {
    if (!order) return
    setGenerating(true)
    setError('')
    try {
      const result = await api.generateContent(order.id)
      setOrder(result.order)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setGenerating(false)
    }
  }

  const handleDeliver = async () => {
    if (!order) return
    const updated = await api.updateStatus(order.id, 'delivered')
    setOrder(updated)
  }

  const handleCopy = () => {
    if (!order?.generated_content) return
    navigator.clipboard.writeText(order.generated_content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!order) return <div className="text-center py-12 text-slate-400">読み込み中...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/orders')} className="text-slate-400 hover:text-slate-600 text-sm">← 案件一覧</button>
        <span className="text-slate-300">/</span>
        <h1 className="text-2xl font-bold text-slate-800">{order.client_name}</h1>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status]}`}>
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InfoCard label="サービス" value={SERVICE_LABELS[order.service_type] ?? order.service_type} />
        <InfoCard label="プラン・金額" value={`${order.plan} ¥${order.amount.toLocaleString()}`} />
        <InfoCard label="納期" value={order.deadline} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold text-slate-700 mb-2">依頼内容</h2>
        <p className="text-sm text-slate-600 whitespace-pre-wrap">{order.details}</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700">AI生成コンテンツ</h2>
          <div className="flex gap-2">
            {order.generated_content && (
              <>
                <button
                  onClick={handleCopy}
                  className="text-sm px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  {copied ? '✓ コピー済み' : 'コピー'}
                </button>
                {order.status !== 'delivered' && (
                  <button
                    onClick={handleDeliver}
                    className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    納品完了にする
                  </button>
                )}
              </>
            )}
            {order.status === 'received' && (
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="text-sm px-4 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {generating ? '⏳ 生成中...' : '✨ Claude で生成'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="px-5 py-3 bg-red-50 text-red-700 text-sm">{error}</div>
        )}

        {generating && (
          <div className="px-5 py-12 text-center text-slate-400 animate-pulse">
            Claude が生成中です... しばらくお待ちください
          </div>
        )}

        {order.generated_content && !generating ? (
          <div className="p-5">
            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed bg-slate-50 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
              {order.generated_content}
            </pre>
          </div>
        ) : !generating && (
          <div className="py-12 text-center text-slate-400 text-sm">
            「Claude で生成」ボタンを押して、AIに文書を作らせてください。
          </div>
        )}
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  )
}
