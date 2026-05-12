import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import NewOrder from './pages/NewOrder'
import Orders from './pages/Orders'
import OrderDetail from './pages/OrderDetail'

function Sidebar() {
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-indigo-50 text-indigo-700'
        : 'text-slate-600 hover:bg-slate-100'
    }`

  return (
    <aside className="w-56 shrink-0 bg-white border-r border-slate-200 min-h-screen p-4 flex flex-col gap-1">
      <div className="px-3 py-3 mb-2">
        <h1 className="text-lg font-bold text-slate-800">AIDesk</h1>
        <p className="text-xs text-slate-400">CEO オペレーション</p>
      </div>
      <NavLink to="/" end className={link}>
        <span>📊</span> ダッシュボード
      </NavLink>
      <NavLink to="/new" className={link}>
        <span>✏️</span> 新規案件
      </NavLink>
      <NavLink to="/orders" className={link}>
        <span>📋</span> 案件管理
      </NavLink>
    </aside>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/new" element={<NewOrder />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
