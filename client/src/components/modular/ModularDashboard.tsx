import React, { useEffect, useMemo, useState } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { arrayMove, SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import { WidgetContainer } from './WidgetContainer'
import { EditorToolbar } from './EditorToolbar'
import { VersionsSheet } from './VersionsSheet'
import { AddBlockSheet } from './AddBlockSheet'
import { BlockConfigSheet } from './BlockConfigSheet'
import { WidgetCatalog } from '@/widgets/catalog'
import type { WidgetInstance, WidgetKey } from '@/widgets/types'
import { v4 as uuidv4 } from 'uuid'
import { useOrganization } from '@/contexts/OrganizationContext'
import { OrgLayoutService } from '@/services/layout/OrgLayoutService'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import { useHapticFeedback } from '@/hooks/useHapticFeedback'

// Block renderers (mobile-first)
const FeaturedEventBlock = React.lazy(() => import('@/widgets/blocks/FeaturedEventBlock'))
const UpcomingEventsBlock = React.lazy(() => import('@/widgets/blocks/UpcomingEventsBlock'))
const StepsBlock = React.lazy(() => import('@/widgets/blocks/StepsBlock'))
const PromoBlock = React.lazy(() => import('@/widgets/blocks/PromoBlock'))
const QuickActionsBlock = React.lazy(() => import('@/widgets/blocks/QuickActionsBlock'))
const PointsBlock = React.lazy(() => import('@/widgets/blocks/PointsBlock'))
const CommunityHighlightsBlock = React.lazy(() => import('@/widgets/blocks/CommunityHighlightsBlock'))
const MiniCalendarBlock = React.lazy(() => import('@/widgets/blocks/MiniCalendarBlock'))
const LeaderboardBlock = React.lazy(() => import('@/widgets/blocks/LeaderboardBlock'))
const StoreCarouselBlock = React.lazy(() => import('@/widgets/blocks/StoreCarouselBlock'))
const ProductGridBlock = React.lazy(() => import('@/widgets/blocks/ProductGridBlock'))
const FeaturedProductBlock = React.lazy(() => import('@/widgets/blocks/FeaturedProductBlock'))
const OfferBannerBlock = React.lazy(() => import('@/widgets/blocks/OfferBannerBlock'))
const MiniCartBlock = React.lazy(() => import('@/widgets/blocks/MiniCartBlock'))

const Renderer: React.FC<{ inst: WidgetInstance; editing?: boolean }> = ({ inst, editing }) => {
  const { isFeatureEnabled } = useOrganization()
  const key = inst.key
  const meta = WidgetCatalog[key]
  const gated = meta.featureFlag && !isFeatureEnabled(meta.featureFlag)
  if (gated) {
    return editing ? (
      <div className="text-sm text-muted-foreground">Enable {meta.featureFlag} feature to use “{meta.name}”.</div>
    ) : null
  }
  switch (key) {
    case 'featured-event':
      return <FeaturedEventBlock {...(inst.props || {})} />
    case 'upcoming-events':
      return <UpcomingEventsBlock {...(inst.props || {})} />
    case 'steps':
      return <StepsBlock {...(inst.props || {})} />
    case 'promo':
      return <PromoBlock {...(inst.props || {})} />
    case 'quick-actions':
      return <QuickActionsBlock {...(inst.props || {})} />
    case 'points':
      return <PointsBlock {...(inst.props || {})} />
    case 'community-highlights':
      return <CommunityHighlightsBlock {...(inst.props || {})} />
    case 'mini-calendar':
      return <MiniCalendarBlock {...(inst.props || {})} />
    case 'leaderboard':
      return <LeaderboardBlock {...(inst.props || {})} />
    case 'store-carousel':
      return <StoreCarouselBlock {...(inst.props || {})} />
    case 'product-grid':
      return <ProductGridBlock {...(inst.props || {})} />
    case 'featured-product':
      return <FeaturedProductBlock {...(inst.props || {})} />
    case 'offer-banner':
      return <OfferBannerBlock {...(inst.props || {})} />
    case 'mini-cart':
      return <MiniCartBlock {...(inst.props || {})} />
    default:
      return null
  }
}

export const ModularDashboard: React.FC = () => {
  const { currentOrganization, isOrganizationAdmin } = useOrganization()
  const { user } = useAuth()
  const haptics = useHapticFeedback()
  const [instances, setInstances] = useState<WidgetInstance[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editMode, setEditMode] = useState<'none'|'org'|'user'>('none')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [lpTimer, setLpTimer] = useState<number | null>(null)
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [previewVersionId, setPreviewVersionId] = useState<number | null>(null)

  const orgId = currentOrganization?.id

  useEffect(() => {
    (async () => {
      if (!orgId) return
      setLoading(true)
      // Prefer user override; fall back to published; else defaults
      const override = user?.id ? await OrgLayoutService.fetchUserOverride(orgId, user.id) : null
      if (override?.instances?.length) setInstances(override.instances)
      else {
        const layout = await OrgLayoutService.fetchPublished(orgId)
        if (layout?.instances?.length) setInstances(layout.instances)
        else {
          const defs: WidgetInstance[] = []
          defs.push({ id: uuidv4(), key: 'featured-event', title: 'Featured Event', layout: { w: 4, h: 2 } })
          defs.push({ id: uuidv4(), key: 'quick-actions', title: 'Quick Actions', layout: { w: 4, h: 1 } })
          defs.push({ id: uuidv4(), key: 'upcoming-events', title: 'Upcoming Events', layout: { w: 4, h: 2 } })
          defs.push({ id: uuidv4(), key: 'steps', title: 'Steps & Activity', layout: { w: 4, h: 1 } })
          defs.push({ id: uuidv4(), key: 'points', title: 'Your Points', layout: { w: 2, h: 1 } })
          setInstances(defs)
        }
      }
      setLoading(false)
    })()
  }, [orgId])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const onDragEnd = (event: any) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = instances.findIndex(i => i.id === active.id)
    const newIndex = instances.findIndex(i => i.id === over.id)
    const next = arrayMove(instances, oldIndex, newIndex)
    setInstances(next)
    haptics.tap()
  }

  const removeInstance = (id: string) => setInstances(prev => prev.filter(i => i.id !== id))

  const resizeInstance = (id: string, dir: 'w+'|'w-'|'h+'|'h-') => {
    setInstances(prev => prev.map(i => {
      if (i.id !== id) return i
      const w0 = i.layout?.w ?? 4
      const h0 = i.layout?.h ?? 1
      const w = Math.max(1, Math.min(4, w0 + (dir === 'w+' ? 1 : dir === 'w-' ? -1 : 0)))
      const h = Math.max(1, Math.min(3, h0 + (dir === 'h+' ? 1 : dir === 'h-' ? -1 : 0)))
      return { ...i, layout: { w, h } }
    }))
    haptics.tap()
  }

  const addInstance = (key: WidgetKey) => {
    const meta = WidgetCatalog[key]
    const defaults: Record<string, { w: number; h: number }> = {
      'featured-event': { w: 4, h: 2 },
      'upcoming-events': { w: 4, h: 2 },
      'steps': { w: 4, h: 1 },
      'promo': { w: 4, h: 1 },
      'quick-actions': { w: 4, h: 1 },
      'points': { w: 2, h: 1 },
    }
    const layout = defaults[key] || { w: 4, h: 1 }
    setInstances(prev => ([...prev, { id: uuidv4(), key, title: meta.name, props: meta.defaultProps, layout }]))
    setSheetOpen(false)
  }

  const saveLayout = async () => {
    if (!orgId) return
    const ok = await OrgLayoutService.save(orgId, instances)
    if (ok) setEditing(false)
  }

  if (loading) return <div className="space-y-4"><div className="h-48 skeleton-mobile" /><div className="h-48 skeleton-mobile" /></div>

  return (
    <div 
      className="space-y-4"
      onPointerDown={(e) => {
        if (editing) return
        const t = window.setTimeout(() => {
          setEditing(true)
          setEditMode(isOrganizationAdmin ? 'org' : 'user')
          haptics.impact('light')
          setLpTimer(null)
        }, 600)
        setLpTimer(t as unknown as number)
      }}
      onPointerUp={() => { if (lpTimer) { clearTimeout(lpTimer); setLpTimer(null) } }}
      onPointerLeave={() => { if (lpTimer) { clearTimeout(lpTimer); setLpTimer(null) } }}
    >
      <div className="flex justify-end gap-2">
        {isOrganizationAdmin && (
          <Button variant={editing && editMode==='org' ? 'secondary' : 'outline'} size="sm" onClick={() => { setEditing(!editing || editMode!=='org'); setEditMode(editing && editMode==='org' ? 'none' : 'org') }}>
            <Pencil className="w-4 h-4 mr-2" /> {editing && editMode==='org' ? 'Editing Org' : 'Edit Org'}
          </Button>
        )}
        {!isOrganizationAdmin && (
          <Button variant={editing && editMode==='user' ? 'secondary' : 'outline'} size="sm" onClick={() => { setEditing(!editing || editMode!=='user'); setEditMode(editing && editMode==='user' ? 'none' : 'user') }}>
            {editing && editMode==='user' ? 'Customizing' : 'Customize'}
          </Button>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={instances.map(i => i.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-4 gap-3">
            {instances.map(inst => (
              <div key={inst.id} style={{ gridColumn: `span ${inst.layout?.w ?? 4} / span ${inst.layout?.w ?? 4}`, gridRow: `span ${inst.layout?.h ?? 1}` }}>
                <div onClick={() => { if (editing) { setSelectedId(inst.id); setConfigOpen(true) } }}>
                <WidgetContainer 
                  id={inst.id} 
                  title={inst.title} 
                  editable={editing} 
                  onRemove={() => removeInstance(inst.id)}
                  onResize={(dir) => resizeInstance(inst.id, dir)}
                >
                  <React.Suspense fallback={<div className="h-24 skeleton-mobile" />}>
                    <Renderer inst={inst} editing={editing} />
                  </React.Suspense>
                </WidgetContainer>
                </div>
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <EditorToolbar 
        editing={editing}
        onAdd={() => setSheetOpen(true)}
        onSave={async () => {
          if (!orgId) return
          if (editMode === 'org') {
            await OrgLayoutService.savePublished(orgId, instances, user?.id || undefined)
          } else if (editMode === 'user' && user?.id) {
            await OrgLayoutService.saveUserOverride(orgId, user.id, instances)
          }
          setEditing(false)
          setEditMode('none')
        }}
        onCancel={() => { setEditing(false); setEditMode('none') }}
        primaryLabel={editMode === 'org' ? 'Publish' : 'Save'}
        secondaryActions={editMode === 'org' ? [
          { label: 'Save Draft', onClick: async () => { if (orgId) await OrgLayoutService.saveDraft(orgId, instances, user?.id || undefined) } },
          { label: 'Versions', onClick: async () => { if (!orgId) return; setVersionsOpen(true) } }
        ] : editMode === 'user' ? [
          { label: 'Reset', onClick: async () => { if (orgId && user?.id) { await OrgLayoutService.resetUserOverride(orgId, user.id); const pub = await OrgLayoutService.fetchPublished(orgId); if (pub) setInstances(pub.instances) } } }
        ] : []}
      />
      {orgId && (
        <VersionsSheet
          orgId={orgId}
          open={versionsOpen}
          onOpenChange={setVersionsOpen}
          onPreview={async (vid) => { const v = await OrgLayoutService.fetchVersion(orgId, vid); if (v) { setInstances(v.instances); setPreviewVersionId(vid) } }}
          onRollback={async (vid) => { await OrgLayoutService.rollbackTo(orgId, vid, user?.id || undefined); const pub = await OrgLayoutService.fetchPublished(orgId); if (pub) setInstances(pub.instances) }}
        />
      )}
      {previewVersionId && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[9998] px-3">
          <div className="glass-card-enhanced px-4 py-2 rounded-xl border border-border/50 flex items-center gap-3 text-sm">
            <span>Previewing version #{previewVersionId}</span>
            <Button size="sm" onClick={async () => { if (orgId) { await OrgLayoutService.savePublished(orgId, instances, user?.id || undefined); setPreviewVersionId(null) } }}>Publish this</Button>
            <Button variant="outline" size="sm" onClick={async () => { if (orgId) { const pub = await OrgLayoutService.fetchPublished(orgId); if (pub) setInstances(pub.instances); setPreviewVersionId(null) } }}>Exit preview</Button>
          </div>
        </div>
      )}
      <AddBlockSheet open={sheetOpen} onOpenChange={setSheetOpen} onAdd={addInstance} />
      <BlockConfigSheet 
        open={configOpen} 
        onOpenChange={setConfigOpen}
        instance={instances.find(i => i.id === selectedId) || null}
        onChange={(next) => setInstances(prev => prev.map(i => i.id === next.id ? next : i))}
      />
    </div>
  )
}

export default ModularDashboard
