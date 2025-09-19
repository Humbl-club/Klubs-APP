import React, { useEffect, useMemo, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { WidgetInstance, WidgetKey } from '@/widgets/types'
import { useOrganization } from '@/contexts/OrganizationContext'
import { OrgCommerceService } from '@/services/commerce/OrgCommerceService'
import { ShopifyClient } from '@/services/commerce/ShopifyClient'

type Preset = { name: string; w: number; h: number }
const PRESETS: Preset[] = [
  { name: 'Hero (4x2)', w: 4, h: 2 },
  { name: 'Wide (4x1)', w: 4, h: 1 },
  { name: 'Tall (2x2)', w: 2, h: 2 },
  { name: 'Half (2x1)', w: 2, h: 1 },
]

export const BlockConfigSheet: React.FC<{
  open: boolean
  onOpenChange: (v: boolean) => void
  instance: WidgetInstance | null
  onChange: (next: WidgetInstance) => void
}> = ({ open, onOpenChange, instance, onChange }) => {
  if (!instance) return null
  const layout = instance.layout || { w: 4, h: 1 }
  const setLayout = (w: number, h: number) => onChange({ ...instance, layout: { w, h } })

  // helper for prop updates
  const setProp = (key: string, value: any) => onChange({ ...instance, props: { ...(instance.props || {}), [key]: value } })

  // Optional commerce helpers for pickers
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id
  const isCommerce = instance.key === 'product-grid' || instance.key === 'featured-product'
  const [shop, setShop] = useState<{ domain: string; token: string } | null>(null)
  const client = useMemo(() => (shop ? new ShopifyClient(shop.domain, shop.token) : null), [shop])
  const [collections, setCollections] = useState<Array<{ handle: string; title: string }>>([])
  const [productResults, setProductResults] = useState<Array<{ handle: string; title: string }>>([])

  useEffect(() => {
    (async () => {
      if (!isCommerce || !orgId) return
      const cfg = await OrgCommerceService.get(orgId)
      if (!cfg?.enabled) return
      setShop({ domain: cfg.shop_domain, token: cfg.storefront_access_token })
    })()
  }, [isCommerce, orgId])

  const KeySpecificFields = () => {
    switch (instance.key as WidgetKey) {
      case 'upcoming-events':
        return (
          <div className="space-y-2">
            <Label>Filter</Label>
            <Select value={instance.props?.filter || 'this_week'} onValueChange={(v) => setProp('filter', v)}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="this_week">This week</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )
      case 'featured-event':
        return (
          <div className="space-y-2">
            <Label>Days ahead</Label>
            <Input type="number" value={instance.props?.daysAhead ?? 14} onChange={(e) => setProp('daysAhead', parseInt(e.target.value || '14'))} />
          </div>
        )
      case 'promo':
        return (
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={instance.props?.title || ''} onChange={(e) => setProp('title', e.target.value)} />
            <Label>Text</Label>
            <Input value={instance.props?.text || ''} onChange={(e) => setProp('text', e.target.value)} />
            <Label>Link</Label>
            <Input value={instance.props?.href || ''} onChange={(e) => setProp('href', e.target.value)} />
          </div>
        )
      case 'product-grid':
        return (
          <div className="space-y-2">
            <Label>Collection Handle</Label>
            <div className="flex gap-2">
              <Input placeholder="frontpage or custom" value={instance.props?.collectionHandle || ''} onChange={(e) => setProp('collectionHandle', e.target.value)} />
              <button type="button" className="px-3 rounded border" onClick={async()=>{ if (!client) return; const cols = await client.listCollections(12); setCollections(cols) }}>Load</button>
            </div>
            {collections.length > 0 && (
              <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto p-1 border rounded">
                {collections.map(c => (
                  <button key={c.handle} type="button" className="text-left text-sm p-2 rounded hover:bg-muted/50" onClick={()=> setProp('collectionHandle', c.handle)}>
                    <div className="font-medium">{c.title}</div>
                    <div className="text-xs text-muted-foreground">{c.handle}</div>
                  </button>
                ))}
              </div>
            )}
            <Label>Search (title contains)</Label>
            <Input placeholder="Search products" value={instance.props?.search || ''} onChange={(e) => setProp('search', e.target.value)} />
            <Label>Max items</Label>
            <Input type="number" value={instance.props?.first ?? 6} onChange={(e) => setProp('first', parseInt(e.target.value || '6'))} />
          </div>
        )
      case 'featured-product':
        return (
          <div className="space-y-2">
            <Label>Product Handle</Label>
            <div className="flex gap-2">
              <Input placeholder="product-handle" value={instance.props?.productHandle || ''} onChange={(e) => setProp('productHandle', e.target.value)} />
              <button type="button" className="px-3 rounded border" onClick={async()=>{ if (!client) return; const q = instance.props?.productHandle || ''; const res = await client.searchProducts(q || '', 10); setProductResults(res) }}>Search</button>
            </div>
            {productResults.length > 0 && (
              <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto p-1 border rounded">
                {productResults.map(p => (
                  <button key={p.handle} type="button" className="text-left text-sm p-2 rounded hover:bg-muted/50" onClick={()=> setProp('productHandle', p.handle)}>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground">{p.handle}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[70vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Configure block</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={instance.title || ''} onChange={(e) => onChange({ ...instance, title: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>Size preset</Label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.name}
                  className={`p-3 rounded-lg border text-left ${layout.w===p.w && layout.h===p.h ? 'border-primary bg-primary/10' : 'border-border/50 hover:bg-muted/40'}`}
                  onClick={() => setLayout(p.w, p.h)}
                >
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{p.w} cols × {p.h} rows</div>
                </button>
              ))}
            </div>
          </div>

          <KeySpecificFields />
        </div>
      </SheetContent>
    </Sheet>
  )
}
