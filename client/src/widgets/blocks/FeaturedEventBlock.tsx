import React, { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin } from 'lucide-react'

const FeaturedEventBlock: React.FC<{ daysAhead?: number }> = ({ daysAhead = 14 }) => {
  const [event, setEvent] = useState<any | null>(null)
  useEffect(() => {
    ;(async () => {
      const now = new Date().toISOString()
      const until = new Date(Date.now() + daysAhead*24*60*60*1000).toISOString()
      const { data } = await supabase
        .from('events')
        .select('id,title,start_time,location,image_url,price_cents,loyalty_points_price')
        .gte('start_time', now).lte('start_time', until)
        .order('start_time', { ascending: true })
        .limit(1)
      setEvent(data?.[0] || null)
    })()
  }, [daysAhead])
  if (!event) return <div className="text-sm text-muted-foreground">No upcoming event found.</div>
  const price = event.loyalty_points_price ? `${event.loyalty_points_price} pts` : (event.price_cents ? `€${(event.price_cents/100).toFixed(2)}` : 'Free')
  return (
    <div className="space-y-3">
      {event.image_url ? (
        <img src={event.image_url} alt={event.title} className="w-full h-36 object-cover rounded-lg" />
      ) : (
        <div className="w-full h-36 rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
          <Calendar className="w-10 h-10 text-primary/50" />
        </div>
      )}
      <div className="space-y-1">
        <div className="text-base font-semibold">{event.title}</div>
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <Calendar className="w-3 h-3" />
          {new Date(event.start_time).toLocaleString()}
        </div>
        {event.location && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <MapPin className="w-3 h-3" /> {event.location}
          </div>
        )}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{price}</div>
        <Button size="sm" onClick={() => (window.location.href = `/events/${event.id}`)}>View</Button>
      </div>
    </div>
  )
}

export default FeaturedEventBlock

