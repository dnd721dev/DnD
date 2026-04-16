import { DIE_CONFIG, type DieSides } from '@/lib/dnd5e'

type DiceShapeProps = {
  sides: DieSides
  size?: number
  /** 'full' = layered SVG with depth/highlight; 'icon' = flat simplified */
  theme?: 'full' | 'icon'
  className?: string
}

export function DiceShape({ sides, size = 32, theme = 'full', className = '' }: DiceShapeProps) {
  const cfg = DIE_CONFIG[sides]
  const isCircle = sides === 100
  const s = size

  if (theme === 'icon') {
    // Flat simplified shape for tiny buttons
    return (
      <svg
        viewBox="0 0 80 80"
        width={s}
        height={s}
        className={className}
        aria-label={`d${sides}`}
      >
        {isCircle ? (
          <>
            <circle cx="40" cy="40" r="34" fill={cfg.color} stroke={cfg.highlight} strokeWidth="2" strokeOpacity="0.7" />
            <text x="40" y="52" textAnchor="middle" fill={cfg.highlight} fontSize="22" fontWeight="bold" opacity="0.7">%</text>
          </>
        ) : (
          <polygon
            points={cfg.polygon!}
            fill={cfg.color}
            stroke={cfg.highlight}
            strokeWidth="2"
            strokeOpacity="0.7"
          />
        )}
      </svg>
    )
  }

  // 'full' theme — layered with shadow + gradient + highlight edge
  const gradId = `dshape-grad-${sides}`
  const shadowOp = 0.4

  return (
    <svg
      viewBox="0 0 80 80"
      width={s}
      height={s}
      className={className}
      aria-label={`d${sides}`}
    >
      <defs>
        <radialGradient id={gradId} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor={cfg.highlight} stopOpacity="0.5" />
          <stop offset="100%" stopColor={cfg.color} stopOpacity="1" />
        </radialGradient>
      </defs>

      {isCircle ? (
        <>
          {/* Shadow */}
          <circle cx="43" cy="44" r="34" fill="rgba(0,0,0,0.35)" />
          {/* Face */}
          <circle cx="40" cy="40" r="34" fill={`url(#${gradId})`} />
          {/* Edge highlight */}
          <circle cx="40" cy="40" r="34" fill="none" stroke={cfg.highlight} strokeWidth="1.5" strokeOpacity="0.5" />
          {/* Inner reflection */}
          <circle cx="26" cy="26" r="6" fill="white" opacity="0.12" />
          {/* % label */}
          <text x="40" y="52" textAnchor="middle" fill="white" fontSize="22" fontWeight="900" opacity="0.6">%</text>
        </>
      ) : (
        <>
          {/* Shadow layer */}
          <polygon points={cfg.shadowPolygon!} fill={`rgba(0,0,0,${shadowOp})`} />
          {/* Face layer */}
          <polygon points={cfg.polygon!} fill={`url(#${gradId})`} />
          {/* Edge highlight */}
          <polygon points={cfg.polygon!} fill="none" stroke={cfg.highlight} strokeWidth="1.5" strokeOpacity="0.5" />
          {/* Top-left inner glow */}
          <polygon points={cfg.polygon!} fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.15" />
        </>
      )}
    </svg>
  )
}
