import { useEffect, useRef } from 'react'

type Star = { x: number; y: number; length: number; speed: number; angle: number; opacity: number }

function createStar(w: number, h: number): Star {
  return {
    x: -Math.random() * w,
    y: -Math.random() * h,
    length: Math.random() * 100 + 50,
    speed: 5,
    angle: Math.PI / 4,
    opacity: Math.random() * 0.5 + 0.5,
  }
}

export function ShootingStars() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let stars: Star[] = []
    let rafId = 0

    function resize() {
      const dpr = window.devicePixelRatio || 1
      canvas!.width = Math.floor(window.innerWidth * dpr)
      canvas!.height = Math.floor(window.innerHeight * dpr)
      canvas!.style.width = `${window.innerWidth}px`
      canvas!.style.height = `${window.innerHeight}px`
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      stars = Array.from({ length: 5 }, () => createStar(window.innerWidth, window.innerHeight))
    }

    function draw(star: Star) {
      ctx!.strokeStyle = `rgba(255,255,255,${star.opacity})`
      ctx!.lineWidth = 1.5
      ctx!.beginPath()
      ctx!.moveTo(star.x, star.y)
      ctx!.lineTo(star.x - star.length * Math.cos(star.angle), star.y - star.length * Math.sin(star.angle))
      ctx!.stroke()
    }

    function update(star: Star) {
      star.x += star.speed
      star.y += star.speed
      if (
        star.x - star.length * Math.cos(star.angle) > window.innerWidth ||
        star.y - star.length * Math.sin(star.angle) > window.innerHeight
      ) {
        Object.assign(star, createStar(window.innerWidth, window.innerHeight))
      }
    }

    function animate() {
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight)
      stars.forEach(s => { update(s); draw(s) })
      rafId = requestAnimationFrame(animate)
    }

    resize()
    animate()
    window.addEventListener('resize', resize)
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(rafId) }
  }, [])

  return <canvas ref={canvasRef} className="stars-canvas" aria-hidden="true" />
}
