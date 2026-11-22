import { useEffect, useState } from 'react'
import { subscribeErrors } from '../lib/errorBus'
import './Toast.css'

const DURATION_MS = 4000

export function Toast() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const unsubscribe = subscribeErrors((msg) => {
      setMessage(msg)
      clearTimeout(timer)
      timer = setTimeout(() => setMessage(null), DURATION_MS)
    })
    return () => {
      unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  if (message === null) return null
  return (
    <div className="toast" role="alert">
      {message}
    </div>
  )
}
