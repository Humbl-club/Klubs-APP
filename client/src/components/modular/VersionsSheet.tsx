import React, { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { OrgLayoutService } from '@/services/layout/OrgLayoutService'
import type { OrgLayout } from '@/widgets/types'

type VersionRow = { id: number; status: string; created_at: string; created_by?: string | null }

export const VersionsSheet: React.FC<{
  orgId: string
  open: boolean
  onOpenChange: (v: boolean) => void
  onPreview: (versionId: number) => void
  onRollback: (versionId: number) => Promise<void>
}> = ({ orgId, open, onOpenChange, onPreview, onRollback }) => {
  const [versions, setVersions] = useState<VersionRow[]>([])
  const [loading, setLoading] = useState(false)
  const [previews, setPreviews] = useState<Record<number, OrgLayout | null>>({})
  const load = async () => {
    setLoading(true)
    const vs = await OrgLayoutService.listVersions(orgId, 20)
    setVersions(vs as any)
    // fetch small previews lazily
    const map: Record<number, OrgLayout | null> = {}
    for (const v of (vs || [])) {
      const layout = await OrgLayoutService.fetchVersion(orgId, v.id)
      map[v.id] = layout
    }
    setPreviews(map)
    setLoading(false)
  }
  useEffect(() => { if (open) load() }, [open])

  const TinyPreview: React.FC<{ layout: OrgLayout | null }> = ({ layout }) => {
    const inst = layout?.instances || []
    return (
      <div className="grid grid-cols-4 gap-0.5 w-28 h-14 border border-border/40 rounded overflow-hidden p-0.5 bg-background">
        {inst.map((i, idx) => (
          <div key={idx} style={{ gridColumn: `span ${i.layout?.w ?? 4} / span ${i.layout?.w ?? 4}`, gridRow: `span ${i.layout?.h ?? 1}` }} className="bg-muted/60 border border-border/30 rounded-sm" />
        ))}
      </div>
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Layout Versions</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {loading && <div className="text-sm text-muted-foreground">Loading…</div>}
          {!loading && versions.length === 0 && (
            <div className="text-sm text-muted-foreground">No versions yet.</div>
          )}
          {!loading && versions.map(v => (
            <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40">
              <div className="flex items-center gap-3">
                <TinyPreview layout={previews[v.id] || null} />
                <div>
                  <div className="text-sm font-medium">#{v.id} • {v.status}</div>
                  <div className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => onPreview(v.id)}>Preview</Button>
                <Button variant="outline" size="sm" onClick={() => onRollback(v.id)}>Rollback</Button>
              </div>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default VersionsSheet
