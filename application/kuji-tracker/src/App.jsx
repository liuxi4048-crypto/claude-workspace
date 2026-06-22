import { useState, useMemo, useCallback } from 'react'
import { useKujiData } from './hooks/useKujiData'
import { useRecords } from './hooks/useRecords'
import { computeSummary } from './utils/summary'
import Header from './components/Header'
import SummaryBar from './components/SummaryBar'
import ProgressBar from './components/ProgressBar'
import ModeBar from './components/ModeBar'
import GoodsGrid from './components/GoodsGrid'
import SplitView from './components/SplitView'
import Toast from './components/Toast'
import TemplateGallery from './components/TemplateGallery'
import QuickImportModal from './components/QuickImportModal'
import KujiBuilderModal from './components/KujiBuilderModal'
import ImageImportModal from './components/ImageImportModal'
import './App.css'

export default function App() {
  const { kujis, activeKujiId, setActiveKujiId, activeKuji, loading, importKuji, removeKuji } = useKujiData()
  const { counts, increment, decrement, batchIncrement, reset, exportRecords, importRecords } = useRecords(activeKujiId, activeKuji)
  const [mode, setMode] = useState('normal')
  const [activeTab, setActiveTab] = useState(0)
  const [toast, setToast] = useState(null)
  const [showQuickImport, setShowQuickImport] = useState(false)
  const [showBuilder, setShowBuilder] = useState(false)
  const [showImageImport, setShowImageImport] = useState(false)

  const summary = useMemo(() => computeSummary(activeKuji, counts), [activeKuji, counts])

  const showToast = useCallback((message, type = 'error') => {
    setToast({ message, type })
  }, [])

  const handleImportKuji = useCallback(async (jsonStr) => {
    try {
      await importKuji(jsonStr)
      showToast('くじ定義を読み込みました', 'success')
    } catch (e) {
      showToast(e.message)
    }
  }, [importKuji, showToast])

  const handleExportRecords = useCallback(() => {
    if (!activeKujiId) return
    const json = exportRecords()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kuji-records-${activeKujiId}-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [activeKujiId, exportRecords])

  const handleImportRecords = useCallback(async (jsonStr) => {
    try {
      await importRecords(jsonStr)
      showToast('記録を読み込みました', 'success')
    } catch (e) {
      showToast(e.message)
    }
  }, [importRecords, showToast])

  const handleExportKujiDef = useCallback(() => {
    if (!activeKuji) return
    const json = JSON.stringify(activeKuji, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kuji-def-${activeKujiId}-${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [activeKuji, activeKujiId])

  const handleDeleteKuji = useCallback(() => {
    if (!activeKujiId) return
    if (!window.confirm(`「${activeKuji?.name}」を削除しますか？この操作は取り消せません。`)) return
    removeKuji(activeKujiId)
    showToast('くじを削除しました', 'success')
  }, [activeKujiId, activeKuji, removeKuji, showToast])

  const handleReset = useCallback(() => {
    if (!window.confirm('記録をリセットしますか？この操作は取り消せません。')) return
    reset()
    showToast('記録をリセットしました', 'success')
  }, [reset, showToast])

  const handleQuickImportConfirm = useCallback(({ matched }) => {
    batchIncrement(matched)
    setShowQuickImport(false)
    showToast(`${matched.length}種類を記録しました`, 'success')
  }, [batchIncrement, showToast])

  const toggleMode = useCallback(() => {
    setMode(m => m === 'normal' ? 'quick' : 'normal')
  }, [])

  if (loading) {
    return <div className="loading">読み込み中...</div>
  }

  return (
    <div className="app">
      <Header
        kujis={kujis}
        activeKujiId={activeKujiId}
        onKujiChange={setActiveKujiId}
        onImportKuji={handleImportKuji}
        onExportRecords={handleExportRecords}
        onImportRecords={handleImportRecords}
        onReset={handleReset}
        onExportKujiDef={handleExportKujiDef}
        onDeleteKuji={handleDeleteKuji}
        onQuickImport={() => setShowQuickImport(true)}
        onAddKuji={() => setShowBuilder(true)}
        onImageImport={() => setShowImageImport(true)}
      />

      {kujis.length === 0 ? (
        <TemplateGallery
          onImportKuji={handleImportKuji}
          onOpenImageImport={() => setShowImageImport(true)}
          onOpenBuilder={() => setShowBuilder(true)}
        />
      ) : (
        <>
          <SummaryBar summary={summary} />
          <ProgressBar value={summary.pct} />
          {activeTab === 0 && <ModeBar mode={mode} onToggle={toggleMode} />}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 0 ? 'active' : ''}`}
              onClick={() => setActiveTab(0)}
            >すべて</button>
            <button
              className={`tab ${activeTab === 1 ? 'active' : ''}`}
              onClick={() => setActiveTab(1)}
            >獲得・未獲得</button>
          </div>
          <main className="main-content">
            {activeTab === 0 && activeKuji && (
              <GoodsGrid
                prizes={activeKuji.prizes}
                evePrizes={activeKuji.evePrizes}
                counts={counts}
                mode={mode}
                onIncrement={increment}
                onDecrement={decrement}
              />
            )}
            {activeTab === 1 && activeKuji && (
              <SplitView
                prizes={activeKuji.prizes}
                evePrizes={activeKuji.evePrizes}
                counts={counts}
                onIncrement={increment}
                onDecrement={decrement}
              />
            )}
          </main>
        </>
      )}

      {showQuickImport && (
        <QuickImportModal
          kujiDef={activeKuji}
          onConfirm={handleQuickImportConfirm}
          onClose={() => setShowQuickImport(false)}
          onImportKuji={handleImportKuji}
        />
      )}

      {showBuilder && (
        <KujiBuilderModal
          onImportKuji={handleImportKuji}
          onClose={() => setShowBuilder(false)}
        />
      )}

      {showImageImport && (
        <ImageImportModal
          onImportKuji={handleImportKuji}
          onClose={() => setShowImageImport(false)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
