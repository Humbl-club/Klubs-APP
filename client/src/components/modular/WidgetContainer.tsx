import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react'

export const WidgetContainer: React.FC<{
  id: string
  title?: string
  editable?: boolean
  onRemove?: () => void
  onResize?: (dir: 'w+'|'w-'|'h+'|'h-') => void
  children: React.ReactNode
}> = ({ id, title, editable, onRemove, onResize, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  // simple drag-resize handle (bottom-right)
  const startRef = React.useRef<{ x: number; y: number } | null>(null)
  const lastStep = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const onPointerMove = React.useCallback((e: PointerEvent) => {
    if (!startRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    const stepX = Math.floor(dx / 40) // every 40px widen by 1
    const stepY = Math.floor(dy / 40) // every 40px taller by 1
    if (stepX > lastStep.current.x) { onResize?.('w+'); lastStep.current.x = stepX }
    if (stepX < lastStep.current.x) { onResize?.('w-'); lastStep.current.x = stepX }
    if (stepY > lastStep.current.y) { onResize?.('h+'); lastStep.current.y = stepY }
    if (stepY < lastStep.current.y) { onResize?.('h-'); lastStep.current.y = stepY }
  }, [onResize])
  const onPointerUp = React.useCallback(() => {
    startRef.current = null
    lastStep.current = { x: 0, y: 0 }
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
  }, [onPointerMove])
  const beginResize = React.useCallback((e: React.PointerEvent) => {
    if (!editable) return
    startRef.current = { x: e.clientX, y: e.clientY }
    lastStep.current = { x: 0, y: 0 }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
  }, [editable, onPointerMove, onPointerUp])

  return (
    <div ref={setNodeRef} style={style} className="card-primary rounded-2xl p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/40">
        <div className="flex items-center gap-2 text-sm font-medium">
          {editable && (
            <button className="p-1 rounded hover:bg-muted/50" {...attributes} {...listeners} aria-label="Drag">
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          <span>{title}</span>
        </div>
        {editable && (
          <div className="flex items-center gap-1">
            <button className="p-1 rounded hover:bg-muted/50" onClick={() => onResize?.('w-')} aria-label="Narrow">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button className="p-1 rounded hover:bg-muted/50" onClick={() => onResize?.('w+')} aria-label="Widen">
              <ArrowRight className="w-4 h-4" />
            </button>
            <button className="p-1 rounded hover:bg-muted/50" onClick={() => onResize?.('h-')} aria-label="Shorter">
              <ArrowUp className="w-4 h-4" />
            </button>
            <button className="p-1 rounded hover:bg-muted/50" onClick={() => onResize?.('h+')} aria-label="Taller">
              <ArrowDown className="w-4 h-4" />
            </button>
            <button className="p-1 rounded hover:bg-destructive/10" onClick={onRemove} aria-label="Remove">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
      <div className="p-4">
        {children}
        {editable && (
          <div className="absolute bottom-2 right-2">
            <div
              className="w-4 h-4 bg-muted rounded-sm border border-border/50 cursor-nwse-resize"
              onPointerDown={beginResize}
              title="Drag to resize"
            />
          </div>
        )}
      </div>
    </div>
  )
}
