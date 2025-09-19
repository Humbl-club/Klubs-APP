import React, { useEffect, useState } from 'react'
import { useOrganization } from '@/contexts/OrganizationContext'
import { OrgCommerceService } from '@/services/commerce/OrgCommerceService'
import { ShopifyClient } from '@/services/commerce/ShopifyClient'
import ProductDetailSheet from './ProductDetailSheet'

const ProductGridBlock: React.FC<{ collectionHandle?: string; first?: number; search?: string }> = ({ collectionHandle = '', first = 6, search = '' }) => {
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization?.id
  const [shop, setShop] = useState<{ domain: string; token: string } | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [cartCount, setCartCount] = useState<number>(0)
  const [checkoutUrl, setCheckoutUrl] = useState<string>('')
  const [sel, setSel] = useState<any|null>(null)

  useEffect(() => {
    (async () => {
      if (!orgId) return
      const cfg = await OrgCommerceService.get(orgId)
      if (!cfg?.enabled) return
      setShop({ domain: cfg.shop_domain, token: cfg.storefront_access_token })
      const handle = collectionHandle || cfg.default_collection_handle || 'frontpage'
      const client = new ShopifyClient(cfg.shop_domain, cfg.storefront_access_token)
      const list = await client.productsByCollection(handle, first)
      const filtered = search ? (list || []).filter((p:any) => (p.title || '').toLowerCase().includes(search.toLowerCase())) : list
      setProducts(filtered)
      // mini-cart badge
      await client.ensureCheckout()
      const ck = await client.getCheckout()
      if (ck) { setCartCount(ck.lineItemsCount); setCheckoutUrl(ck.webUrl) }
    })()
  }, [orgId, collectionHandle, first, search])

  if (!shop) return <div className="text-sm text-muted-foreground">Connect Shopify in Org Admin → Commerce to show products.</div>
  if (!products.length) return <div className="text-sm text-muted-foreground">No products found.</div>

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end">
        <button disabled={!checkoutUrl} onClick={()=>{ if (checkoutUrl) window.location.href = checkoutUrl }} className="text-xs rounded-full border px-3 py-1">
          Cart • {cartCount}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {products.map(p => (
          <button key={p.id} className="text-left" onClick={() => setSel(p)}>
            <div className="w-full h-28 rounded-lg overflow-hidden bg-muted">
              {p.featuredImage?.url && <img src={p.featuredImage.url} className="w-full h-full object-cover" />}
            </div>
            <div className="mt-1 text-sm font-medium line-clamp-2">{p.title}</div>
          </button>
        ))}
        {sel && (
          <ProductDetailSheet
            open={!!sel}
            onOpenChange={(v) => { if (!v) setSel(null) }}
            product={sel}
            shop={{ domain: shop.domain, token: shop.token }}
          />
        )}
      </div>
    </div>
  )
}

export default ProductGridBlock
