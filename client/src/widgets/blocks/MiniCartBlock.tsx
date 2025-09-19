import React, { useEffect, useState } from 'react'
import { useOrganization } from '@/contexts/OrganizationContext'
import { OrgCommerceService } from '@/services/commerce/OrgCommerceService'
import { ShopifyClient } from '@/services/commerce/ShopifyClient'
import { Button } from '@/components/ui/button'

const MiniCartBlock: React.FC = () => {
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id
  const [shop, setShop] = useState<{ domain: string; token: string } | null>(null)
  const [count, setCount] = useState<number>(0)
  const [checkoutUrl, setCheckoutUrl] = useState<string>('')

  useEffect(() => {
    (async () => {
      if (!orgId) return
      const cfg = await OrgCommerceService.get(orgId)
      if (!cfg?.enabled) return
      setShop({ domain: cfg.shop_domain, token: cfg.storefront_access_token })
      const client = new ShopifyClient(cfg.shop_domain, cfg.storefront_access_token)
      // Ensure a checkout exists; then get current line items
      await client.ensureCheckout()
      const ck = await client.getCheckout()
      if (ck) { setCount(ck.lineItemsCount); setCheckoutUrl(ck.webUrl) }
    })()
  }, [orgId])

  if (!shop) return <div className="text-sm text-muted-foreground">Connect Shopify to enable cart.</div>

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border/40">
      <div className="text-sm">Cart: <strong>{count}</strong> item{count===1?'':'s'}</div>
      <Button size="sm" disabled={!checkoutUrl} onClick={() => { if (checkoutUrl) window.location.href = checkoutUrl }}>Checkout</Button>
    </div>
  )
}

export default MiniCartBlock

