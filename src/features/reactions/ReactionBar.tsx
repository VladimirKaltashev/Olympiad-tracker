import { useReactionsStore, REACTION_COST } from '@/entities/reactions'
import type { ReactionKind } from '@/entities/reactions'
import { CrownIcon, ClownIcon } from '@/shared/ui'

interface ReactionBarProps {
  achievementId: string
  disabled?: boolean
  size?: 'sm' | 'md'
  compact?: boolean
  isOwner?: boolean
  ownerMessage?: string
}

export function ReactionBar({
  achievementId,
  disabled = false,
  size = 'md',
  compact = false,
  isOwner = false,
  ownerMessage = 'Вы не можете голосовать за своё. Арена решит исход.',
}: ReactionBarProps) {
  const agg = useReactionsStore((s) => s.byAchievement[achievementId])
  const pending = useReactionsStore((s) => s.pending.has(achievementId))
  const budgetRemaining = useReactionsStore((s) => s.budgetRemaining)
  const toggle = useReactionsStore((s) => s.toggle)

  const crowns = agg?.crowns ?? 0
  const clowns = agg?.clowns ?? 0
  const myKind = agg?.myKind ?? null

  const handleClick = (kind: ReactionKind) => {
    if (disabled || pending) return
    if (myKind !== kind && budgetRemaining < REACTION_COST[kind]) return
    toggle(achievementId, kind)
  }

  const isSm = size === 'sm'
  const padding = isSm ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-sm'
  const iconClass = isSm ? 'w-4 h-4' : 'w-5 h-5'

  const total = crowns + clowns
  const kingPct = total === 0 ? 50 : (crowns / total) * 100
  const clownPct = total === 0 ? 50 : (clowns / total) * 100
  const barHeight = isSm ? '30px' : '36px'

  let verdictLabel: string
  if (total === 0) {
    verdictLabel = 'Нет голосов'
  } else if (crowns === clowns) {
    verdictLabel = 'Ровно 50/50'
  } else if (crowns > clowns) {
    verdictLabel = `Корона ведёт ${Math.round(kingPct)}%`
  } else {
    verdictLabel = `Клоун ведёт ${Math.round(clownPct)}%`
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Compact label + counts above bar */}
      {compact && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold tracking-wider" style={{ color: 'var(--cork-text)' }}>
            {verdictLabel}
          </span>
          {total > 0 && (
            <span className="text-xs tabular-nums" style={{ color: 'var(--cork-text-mute)' }}>
              👑 {crowns}  🤡 {clowns}
            </span>
          )}
        </div>
      )}

      {/* Verdict bar — full width, only segments with votes */}
      <div className="cork-verdict-bar">
        <div className="cork-verdict-track" style={{ height: compact ? '6px' : barHeight }}>
          {crowns > 0 && (
            <div
              className="cork-verdict-king"
              style={{ width: `${kingPct}%` }}
            />
          )}
          {/* Center label — only for non-compact */}
          {!compact && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ zIndex: 3 }}
            >
              <span
                className="text-xs font-bold tracking-wider"
                style={{
                  color: total === 0 ? 'var(--cork-text-mute)' : 'var(--cork-brand-ink)',
                  textShadow: total > 0 ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                }}
              >
                {verdictLabel}
              </span>
            </div>
          )}
          {clowns > 0 && (
            <div
              className="cork-verdict-clown"
              style={{ width: `${clownPct}%`, marginLeft: 'auto' }}
            />
          )}
        </div>
      </div>

      {/* Buttons */}
      {!compact && !isOwner && (
        <div className="flex items-center gap-1.5">
          <ReactionButton
            Icon={CrownIcon}
            count={crowns}
            active={myKind === 'crown'}
            cost={1}
            disabled={disabled || pending}
            onClick={() => handleClick('crown')}
            kind="crown"
            iconClass={iconClass}
            padding={padding}
          />
          <ReactionButton
            Icon={ClownIcon}
            count={clowns}
            active={myKind === 'clown'}
            cost={2}
            disabled={disabled || pending}
            onClick={() => handleClick('clown')}
            kind="clown"
            iconClass={iconClass}
            padding={padding}
          />
          {disabled && (
            <span className="text-xs ml-1" style={{ color: 'var(--cork-text-mute)' }} title="Войдите, чтобы голосовать">
              Войти
            </span>
          )}
        </div>
      )}

      {isOwner && (
        <div
          className={compact ? 'text-[11px] flex flex-col gap-0.5' : 'text-xs flex flex-col gap-0.5'}
          style={{ color: 'var(--cork-text-mute)' }}
        >
          <span style={{ color: 'var(--cork-text)' }}>Это ваша заявка</span>
          <span>{ownerMessage}</span>
        </div>
      )}
    </div>
  )
}

interface ReactionButtonProps {
  Icon: React.FC<React.SVGProps<SVGSVGElement>>
  count: number
  active: boolean
  cost: number
  disabled: boolean
  onClick: () => void
  kind: 'crown' | 'clown'
  iconClass: string
  padding: string
}

function ReactionButton({
  Icon,
  count,
  active,
  cost,
  disabled,
  onClick,
  kind,
  iconClass,
  padding,
}: ReactionButtonProps) {
  const base = `inline-flex items-center gap-1 ring-1 transition-colors disabled:opacity-50 ${padding}`
  const activeStyle = active
    ? {
        background: kind === 'crown' ? 'rgba(198, 255, 61, 0.15)' : 'rgba(255, 45, 120, 0.15)',
        color: kind === 'crown' ? 'var(--cork-king)' : 'var(--cork-clown)',
        borderColor: kind === 'crown' ? 'var(--cork-king)' : 'var(--cork-clown)',
        ring: kind === 'crown' ? 'var(--cork-king)' : 'var(--cork-clown)',
      }
    : {
        background: 'transparent',
        color: 'var(--cork-text-dim)',
        borderColor: 'var(--cork-border-light)',
        ring: 'var(--cork-border-light)',
      }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={base}
      style={{
        borderRadius: 'var(--cork-radius-pill)',
        background: activeStyle.background,
        color: activeStyle.color,
        '--tw-ring-color': activeStyle.ring,
      } as React.CSSProperties}
      title={active ? 'Снять реакцию' : `Стоит ${cost} ${cost === 1 ? 'голос' : 'голоса'}`}
    >
      <Icon className={iconClass} />
      <span className="font-medium tabular-nums">{count}</span>
    </button>
  )
}
