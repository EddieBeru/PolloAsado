import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCycle } from '../context/cycle'

const arrowClass =
  'p-1.5 rounded-xl border border-border-app/50 text-text-secondary hover:text-text-primary hover:bg-surface-app transition-colors'

export default function CycleNav() {
  const { range, goPrev, goNext, goToCurrent } = useCycle()

  return (
    <div className="flex items-center gap-3 text-text-primary">
      <button type="button" onClick={goPrev} aria-label="Ciclo anterior" className={arrowClass}>
        <ChevronLeft className="w-5 h-5" />
      </button>

      <span className="text-sm font-semibold capitalize min-w-[9rem] text-center">
        {range.label}
      </span>

      <button type="button" onClick={goNext} aria-label="Ciclo siguiente" className={arrowClass}>
        <ChevronRight className="w-5 h-5" />
      </button>

      {!range.isCurrent && (
        <button
          type="button"
          onClick={goToCurrent}
          className="text-xs font-semibold text-accent-app hover:underline"
        >
          Volver al actual
        </button>
      )}
    </div>
  )
}
