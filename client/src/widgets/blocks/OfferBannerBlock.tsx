import React from 'react'
import { Button } from '@/components/ui/button'

const OfferBannerBlock: React.FC<{ title?: string; text?: string; href?: string; image?: string }> = ({ title='Limited Offer', text='Tap to learn more', href='#', image }) => {
  return (
    <div className="space-y-3">
      {image && (
        <div className="w-full h-36 rounded-lg overflow-hidden bg-muted">
          <img src={image} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="text-lg font-semibold">{title}</div>
      <div className="text-sm text-muted-foreground">{text}</div>
      <div><Button size="sm" onClick={() => (window.location.href = href!)}>View</Button></div>
    </div>
  )
}

export default OfferBannerBlock

