import React from 'react'
import { Button } from '@/components/ui/button'

const PromoBlock: React.FC<{ title?: string; text?: string; href?: string; image?: string }> = ({ title='Special', text='Tap to learn more', href='#', image }) => {
  return (
    <div className="space-y-3">
      {image && <img src={image} className="w-full h-32 object-cover rounded-lg" alt={title} />}
      <div className="text-base font-semibold">{title}</div>
      <div className="text-sm text-muted-foreground">{text}</div>
      <div>
        <Button size="sm" onClick={() => (window.location.href = href!)}>View</Button>
      </div>
    </div>
  )
}

export default PromoBlock

