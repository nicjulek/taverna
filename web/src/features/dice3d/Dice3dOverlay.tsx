import type { RollDto } from '@taverna/shared'
import { useEffect, useRef, useState } from 'react'
import { getSocket } from '@/lib/realtime'
import { diceFor } from './dice'
import { useDice3d } from './preference'

export function Dice3dOverlay({ campaignId }: { campaignId: string }) {
  const enabled = useDice3d()
  const canvas = useRef<HTMLCanvasElement>(null)
  const queue = useRef<RollDto[]>([])
  const running = useRef(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return
    const controller = new AbortController()
    const drain = async () => {
      if (running.current) return
      running.current = true
      setVisible(true)
      try {
        const engine = await import('./engine')
        while (queue.current.length && !controller.signal.aborted) {
          const roll = queue.current.shift()!
          const dice = diceFor(roll)
          if (dice.length && canvas.current) await engine.play(canvas.current, dice, { color: roll.color, signal: controller.signal })
        }
      } finally {
        running.current = false
        setVisible(false)
      }
    }
    const onRoll = (roll: RollDto) => {
      if (roll.campaignId !== campaignId || diceFor(roll).length === 0) return
      queue.current = [...queue.current.slice(-2), roll]
      void drain()
    }
    const socket = getSocket()
    socket.on('roll:new', onRoll)
    return () => {
      controller.abort()
      socket.off('roll:new', onRoll)
      queue.current = []
    }
  }, [enabled, campaignId])

  if (!enabled) return null
  return (
    <canvas
      ref={canvas}
      aria-hidden
      className={`pointer-events-none fixed inset-0 z-50 h-dvh w-screen transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    />
  )
}
