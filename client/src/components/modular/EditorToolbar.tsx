import React from 'react'
import { Button } from '@/components/ui/button'
import { Plus, Save, X } from 'lucide-react'

export const EditorToolbar: React.FC<{
  editing: boolean
  onAdd: () => void
  onSave: () => void
  onCancel: () => void
  primaryLabel?: string
  secondaryActions?: { label: string; onClick: () => void }[]
}> = ({ editing, onAdd, onSave, onCancel, primaryLabel = 'Save', secondaryActions = [] }) => {
  if (!editing) return null
  return (
    <div className="fixed bottom-16 left-0 right-0 z-[9998] px-3">
      <div className="glass-card-enhanced p-3 rounded-xl border border-border/40 flex items-center gap-2">
        <Button variant="secondary" className="flex-1" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-2" /> Add block
        </Button>
        <Button className="flex-1" onClick={onSave}>
          <Save className="w-4 h-4 mr-2" /> {primaryLabel}
        </Button>
        {secondaryActions.map((a, i) => (
          <Button key={i} variant="outline" className="flex-1" onClick={a.onClick}>{a.label}</Button>
        ))}
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          <X className="w-4 h-4 mr-2" /> Cancel
        </Button>
      </div>
    </div>
  )
}
