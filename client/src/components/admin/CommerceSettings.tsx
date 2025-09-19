import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MobileToggle } from '@/components/ui/mobile-toggle'
import { useOrganization } from '@/contexts/OrganizationContext'
import { OrgCommerceService } from '@/services/commerce/OrgCommerceService'

export const CommerceSettings: React.FC = () => {
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id
  const [shopDomain, setShopDomain] = useState('')
  const [token, setToken] = useState('')
  const [collection, setCollection] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      if (!orgId) return
      const cfg = await OrgCommerceService.get(orgId)
      if (cfg) {
        setShopDomain(cfg.shop_domain || '')
        setToken(cfg.storefront_access_token || '')
        setCollection(cfg.default_collection_handle || '')
        setEnabled(!!cfg.enabled)
      }
    })()
  }, [orgId])

  const save = async () => {
    if (!orgId) return
    setSaving(true)
    await OrgCommerceService.upsert({
      organization_id: orgId,
      shop_domain: shopDomain.trim(),
      storefront_access_token: token.trim(),
      default_collection_handle: collection.trim() || null,
      currency: null,
      enabled
    } as any)
    setSaving(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Commerce (Shopify)</CardTitle>
        <CardDescription>Connect a Shopify Storefront API to enable the commerce widgets.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Enable commerce</Label>
          <MobileToggle checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <div className="space-y-2">
          <Label>Shop Domain (your-shop.myshopify.com)</Label>
          <Input value={shopDomain} onChange={(e)=>setShopDomain(e.target.value)} placeholder="your-shop.myshopify.com" />
        </div>
        <div className="space-y-2">
          <Label>Storefront Access Token</Label>
          <Input value={token} onChange={(e)=>setToken(e.target.value)} placeholder="Storefront token" />
        </div>
        <div className="space-y-2">
          <Label>Default Collection Handle (optional)</Label>
          <Input value={collection} onChange={(e)=>setCollection(e.target.value)} placeholder="frontpage" />
        </div>
        <div className="pt-2">
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default CommerceSettings

