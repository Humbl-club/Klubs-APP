import React from 'react'
import { orderedCatalog } from '@/widgets/catalog'
import { useOrganization } from '@/contexts/OrganizationContext'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'

export const AddBlockSheet: React.FC<{
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdd: (key: string) => void
}> = ({ open, onOpenChange, onAdd }) => {
  const { isFeatureEnabled } = useOrganization()
  const visible = orderedCatalog.filter(m => !m.featureFlag || isFeatureEnabled(m.featureFlag))
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Add a block</SheetTitle>
        </SheetHeader>
        <div className="grid grid-cols-2 gap-3 mt-4">
          {visible.map(meta => (
            <Button key={meta.key} variant="secondary" className="justify-start" onClick={() => onAdd(meta.key)}>
              <meta.icon className="w-4 h-4 mr-2" />
              {meta.name}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
