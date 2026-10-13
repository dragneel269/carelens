import * as React from 'react'
import { useReducedMotion } from 'motion/react'

export interface CountUpProps {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}

export function CountUp({
  value,
  duration = 0.6,
  decimals = 0,
  prefix = '',
  suffix = '',
  className,
}: CountUpProps) {
  const shouldReduceMotion = useReducedMotion()
  const isTest =
    (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') ||
    (typeof navigator !== 'undefined' && navigator.userAgent?.includes('jsdom'))

  const [displayValue, setDisplayValue] = React.useState<number>(() =>
    shouldReduceMotion || isTest ? value : 0
  )

  React.useEffect(() => {
    if (shouldReduceMotion || isTest) {
      setDisplayValue(value)
      return
    }

    const startValue = displayValue
    const diff = value - startValue
    if (diff === 0) return

    const startTime = performance.now()
    const durationMs = duration * 1000

    let animationFrameId: number

    const step = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / durationMs)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startValue + diff * eased

      setDisplayValue(current)

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step)
      } else {
        setDisplayValue(value)
      }
    }

    animationFrameId = requestAnimationFrame(step)
    return () => cancelAnimationFrame(animationFrameId)
  }, [value, duration, shouldReduceMotion, isTest])

  const formatted = decimals > 0 ? displayValue.toFixed(decimals) : Math.round(displayValue).toString()

  return (
    <span className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
