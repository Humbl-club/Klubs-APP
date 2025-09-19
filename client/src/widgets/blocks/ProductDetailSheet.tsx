import React, { useMemo, useState } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ShopifyClient } from '@/services/commerce/ShopifyClient'

type Variant = { id: string; title: string; availableForSale: boolean; price: { amount: string; currencyCode: string } }

export const ProductDetailSheet: React.FC<{
  open: boolean
  onOpenChange: (v:boolean) => void
  product: any
  shop: { domain: string; token: string }
}> = ({ open, onOpenChange, product, shop }) => {
  const client = useMemo(() => new ShopifyClient(shop.domain, shop.token), [shop.domain, shop.token])
  const variants: Variant[] = (product.variants?.edges || []).map((e:any)=>e.node)
  const [selected, setSelected] = useState<string>(variants[0]?.id)
  const price = variants.find(v => v.id===selected)?.price

  const checkout = async () => {
    const url = await client.addLineItem(selected!, 1)
    window.location.href = url
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{product.title}</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 mt-3">
          <div className="w-full h-40 rounded-lg overflow-hidden bg-muted">
            {product.images?.edges?.[0]?.node?.url && (
              <img src={product.images.edges[0].node.url} className="w-full h-full object-cover" />
            )}
          </div>
          <div className="text-sm text-muted-foreground line-clamp-4">{product.description}</div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Variant</div>
            <div className="grid grid-cols-2 gap-2">
              {variants.map(v => (
                <button key={v.id} onClick={() => setSelected(v.id)} className={`p-2 rounded border text-left ${selected===v.id ? 'border-primary bg-primary/10' : 'border-border/40 hover:bg-muted/40'}`}>
                  <div className="text-sm">{v.title}</div>
                  <div className="text-xs text-muted-foreground">{v.price.amount} {v.price.currencyCode}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="pt-2">
            <Button disabled={!selected} className="w-full" onClick={checkout}>
              Buy{price ? ` • ${price.amount} ${price.currencyCode}` : ''}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export default ProductDetailSheet

