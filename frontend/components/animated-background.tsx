import type { CSSProperties } from 'react'

export function AnimatedBackground() {
  const bubbles = Array.from({ length: 12 }, (_, i) => i)

  return (
    <>
      <div aria-hidden className="app-ambient" />
      <div aria-hidden className="app-ambient-bubbles">
        {bubbles.map((index) => (
          <span
            key={index}
            className="ambient-bubble"
            style={
              {
                '--bubble-left': `${6 + ((index * 8.2) % 88)}%`,
                '--bubble-size': `${14 + (index % 5) * 12}px`,
                '--bubble-delay': `${(index % 6) * 1.1}s`,
                '--bubble-duration': `${14 + (index % 5) * 5}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div aria-hidden className="app-ambient-overlay" />
    </>
  )
}
