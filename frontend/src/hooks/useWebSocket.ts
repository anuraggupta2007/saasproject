import { useCallback, useEffect, useRef, useState } from 'react'

type WebSocketStatus = 'connecting' | 'open' | 'closed' | 'error'

export function useWebSocket(url: string | null) {
  const [messages, setMessages] = useState<MessageEvent[]>([])
  const [status, setStatus] = useState<WebSocketStatus>('closed')
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!url) return

    const ws = new WebSocket(url)
    wsRef.current = ws
    setStatus('connecting')

    ws.onopen = () => setStatus('open')
    ws.onmessage = (e) => setMessages((prev) => [...prev, e])
    ws.onclose = () => setStatus('closed')
    ws.onerror = () => setStatus('error')

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [url])

  const send = useCallback((data: string | ArrayBuffer) => {
    wsRef.current?.send(data)
  }, [])

  return { messages, status, send }
}
