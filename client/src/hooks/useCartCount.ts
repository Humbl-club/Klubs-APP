import { useEffect, useState } from 'react'
import { OrgCommerceService } from '@/services/commerce/OrgCommerceService'
import { ShopifyClient } from '@/services/commerce/ShopifyClient'
import { useOrganization } from '@/contexts/OrganizationContext'

export function useCartCount() {
  const { currentOrganization, isFeatureEnabled } = useOrganization()
  const orgId = currentOrganization?.id
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!orgId || !isFeatureEnabled('commerce')) return
      const cfg = await OrgCommerceService.get(orgId)
      if (!cfg?.enabled) return
      const client = new ShopifyClient(cfg.shop_domain, cfg.storefront_access_token)
      const ck = await client.getCheckout()
      if (!cancelled && ck) setCount(ck.lineItemsCount)
    })()
    const onVis = async () => {
      if (document.visibilityState === 'visible' && orgId && isFeatureEnabled('commerce')) {
        const cfg = await OrgCommerceService.get(orgId)
        if (!cfg?.enabled) return
        const client = new ShopifyClient(cfg.shop_domain, cfg.storefront_access_token)
        const ck = await client.getCheckout()
        if (ck) setCount(ck.lineItemsCount)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => { cancelled = true; document.removeEventListener('visibilitychange', onVis) }
  }, [orgId, isFeatureEnabled])

  return count
}

