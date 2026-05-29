import { useEffect } from 'react'

export default function Toast({ message, type = 'error', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`toast toast-${type}`} onClick={onClose}>
      {message}
    </div>
  )
}
