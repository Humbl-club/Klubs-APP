import React, { useEffect, useMemo, useState } from 'react'
import { useOrganization } from '@/contexts/OrganizationContext'
import { OrgCommerceService } from '@/services/commerce/OrgCommerceService'
import { ShopifyClient } from '@/services/commerce/ShopifyClient'
import ProductDetailSheet from './ProductDetailSheet'
import { Button } from '@/components/ui/button'

const FeaturedProductBlock: React.FC<{ productHandle?: string }> = ({ productHandle = '' }) => {
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id
  const [shop, setShop] = useState<{ domain: string; token: string } | null>(null)
  const [product, setProduct] = useState<any | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    (async () => {
      if (!orgId) return
      const cfg = await OrgCommerceService.get(orgId)
      if (!cfg?.enabled) return
      if (!productHandle && !cfg.default_collection_handle) return
      setShop({ domain: cfg.shop_domain, token: cfg.storefront_access_token })
      const client = new ShopifyClient(cfg.shop_domain, cfg.storefront_access_token)
      // If no productHandle provided, try first product of default collection
      if (!productHandle && cfg.default_collection_handle) {
        const items = await client.productsByCollection(cfg.default_collection_handle, 1)
        setProduct(items?.[0] || null)
      } else if (productHandle) {
        const p = await client.productByHandle(productHandle)
        setProduct(p)
      }
    })()
  }, [orgId, productHandle])

  if (!shop) return <div className="text-sm text-muted-foreground">Connect Shopify in Commerce settings to feature a product.</div>
  if (!product) return <div className="text-sm text-muted-foreground">No product found.</div>

  const img = product.images?.edges?.[0]?.node?.url || product.featuredImage?.url

  return (
    <div className="space-y-3">
      <div className="w-full h-40 rounded-lg overflow-hidden bg-muted">
        {img && <img src={img} className="w-full h-full object-cover" />}
      </div>
      <div className="text-base font-semibold">{product.title}</div>
      <div className="flex items-center justify-between">
        <Button size="sm" onClick={() => setOpen(true)}>View</Button>
      </div>
      <ProductDetailSheet open={open} onOpenChange={setOpen} product={product} shop={{ domain: shop.domain, token: shop.token }} />
    </div>
  )
}

export default FeaturedProductBlock

