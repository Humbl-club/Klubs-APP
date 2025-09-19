import React, { useMemo } from 'react'

const StoreCarouselBlock: React.FC<{ images?: { src: string; href?: string }[] }> = ({ images = [] }) => {
  const slides = useMemo(() => images.length ? images : [
    { src: 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?w=1200&q=60', href: '#' },
    { src: 'https://images.unsplash.com/photo-1503342217505-b0a15cf70489?w=1200&q=60', href: '#' }
  ], [images])
  return (
    <div className="w-full overflow-x-auto no-scrollbar">
      <div className="flex gap-3 min-w-full">
        {slides.map((s, i) => (
          <a key={i} href={s.href || '#'} className="block min-w-[240px] max-w-[240px]">
            <img src={s.src} className="w-full h-32 object-cover rounded-lg" />
          </a>
        ))}
      </div>
    </div>
  )
}

export default StoreCarouselBlock

