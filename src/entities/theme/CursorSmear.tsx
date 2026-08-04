import { useEffect, useRef } from 'react'
import { useThemeStore } from './store'

const SMOOTH = 0.2
const SHOW_DISTANCE = 18
const STOP_DISTANCE = 0.5

function clamp(v: number, min: number, max: number) {
  return v < min ? min : v > max ? max : v
}

function clearSmearStyles(style: CSSStyleDeclaration | null) {
  if (!style) return
  style.removeProperty('--cork-cursor-smear-x')
  style.removeProperty('--cork-cursor-smear-y')
  style.removeProperty('--cork-cursor-smear-w')
  style.removeProperty('--cork-cursor-smear-h')
  style.removeProperty('--cork-cursor-smear-angle')
  style.removeProperty('--cork-cursor-smear-opacity')
}

export function CursorSmear() {
  const theme = useThemeStore((s) => s.theme)
  const currentRef = useRef({ x: 0, y: 0 })
  const targetRef = useRef({ x: 0, y: 0 })
  const rafRef = useRef<number>(0)
  const hasPointerRef = useRef(false)
  const styleTarget = useRef<CSSStyleDeclaration | null>(null)

  useEffect(() => {
    const style = document.documentElement.style
    styleTarget.current = style
    clearSmearStyles(style)
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    hasPointerRef.current = false

    if (theme !== 'obsidian') {
      return () => {
        cancelAnimationFrame(rafRef.current)
        clearSmearStyles(style)
        styleTarget.current = null
      }
    }

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)')
    let motionAllowed = !motionQuery.matches
    let pointerAllowed = pointerQuery.matches
    let listening = false

    const stop = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      style.setProperty('--cork-cursor-smear-opacity', '0')
    }

    const animate = () => {
      const c = currentRef.current
      const t = targetRef.current

      c.x += (t.x - c.x) * SMOOTH
      c.y += (t.y - c.y) * SMOOTH

      const dx = t.x - c.x
      const dy = t.y - c.y
      const dist = Math.hypot(dx, dy)

      if (dist > SHOW_DISTANCE) {
        const angle = Math.atan2(dy, dx)
        const smearX = c.x + dx * 0.45
        const smearY = c.y + dy * 0.45
        const w = clamp(dist * 1.8, 120, 340)
        const h = clamp(dist * 0.35, 42, 92)
        const opacity = clamp(dist / 220, 0, 0.75)

        style.setProperty('--cork-cursor-smear-x', `${smearX}px`)
        style.setProperty('--cork-cursor-smear-y', `${smearY}px`)
        style.setProperty('--cork-cursor-smear-w', `${w}px`)
        style.setProperty('--cork-cursor-smear-h', `${h}px`)
        style.setProperty('--cork-cursor-smear-angle', `${angle}rad`)
        style.setProperty('--cork-cursor-smear-opacity', String(opacity))
      } else {
        style.setProperty('--cork-cursor-smear-opacity', '0')
      }

      if (dist <= STOP_DISTANCE) {
        rafRef.current = 0
        style.setProperty('--cork-cursor-smear-opacity', '0')
        return
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    const start = () => {
      if (!motionAllowed || !pointerAllowed || rafRef.current) return
      rafRef.current = requestAnimationFrame(animate)
    }

    const handleMove = (e: MouseEvent) => {
      const next = { x: e.clientX, y: e.clientY }
      targetRef.current = next

      if (!hasPointerRef.current) {
        currentRef.current = next
        hasPointerRef.current = true
        return
      }

      start()
    }

    const syncListener = () => {
      const shouldListen = motionAllowed && pointerAllowed
      if (shouldListen && !listening) {
        document.addEventListener('mousemove', handleMove, { passive: true })
        listening = true
      } else if (!shouldListen && listening) {
        document.removeEventListener('mousemove', handleMove)
        listening = false
        stop()
      }
    }

    const handleMotionChange = (e: MediaQueryListEvent) => {
      motionAllowed = !e.matches
      syncListener()
    }

    const handlePointerChange = (e: MediaQueryListEvent) => {
      pointerAllowed = e.matches
      syncListener()
    }

    motionQuery.addEventListener('change', handleMotionChange)
    pointerQuery.addEventListener('change', handlePointerChange)
    syncListener()

    return () => {
      cancelAnimationFrame(rafRef.current)
      if (listening) {
        document.removeEventListener('mousemove', handleMove)
      }
      motionQuery.removeEventListener('change', handleMotionChange)
      pointerQuery.removeEventListener('change', handlePointerChange)
      clearSmearStyles(style)
      styleTarget.current = null
    }
  }, [theme])

  return <div className="cork-cursor-smear" aria-hidden="true" />
}
