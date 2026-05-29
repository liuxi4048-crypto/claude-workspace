import { useEffect, useRef } from 'react'

export default function Toast({ message, type = 'error', onClose }) {
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })
  useEffect(() => {
    const t = setTimeout(() => onCloseRef.current(), 4000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={`toast toast-${type}`} onClick={onClose}>
      {message}
    </div>
  )
}
