import React, { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'

const UpcomingEventsBlock: React.FC<{ limit?: number; filter?: 'today'|'this_week' }> = ({ limit = 3, filter = 'this_week' }) => {
  const [events, setEvents] = useState<any[]>([])
  useEffect(() => {
    ;(async () => {
      const now = new Date()
      let to = new Date()
      if (filter === 'today') {
        to.setHours(23,59,59,999)
      } else {
        const day = to.getDay()
        const diff = 7 - day
        to.setDate(to.getDate() + diff)
        to.setHours(23,59,59,999)
      }
      const { data } = await supabase
        .from('events')
        .select('id,title,start_time,image_url,price_cents,loyalty_points_price')
        .gte('start_time', now.toISOString())
        .lte('start_time', to.toISOString())
        .order('start_time',{ ascending: true })
        .limit(limit)
      setEvents(data || [])
    })()
  }, [limit, filter])
  if (!events.length) return <div className="text-sm text-muted-foreground">No upcoming events.</div>
  return (
    <div className="space-y-3">
      {events.map(e => (
        <button key={e.id} className="w-full text-left card-secondary p-3 rounded-lg flex items-center gap-3" onClick={() => (window.location.href = `/events/${e.id}`)}>
          <div className="w-16 h-12 rounded bg-muted overflow-hidden">
            {e.image_url ? <img src={e.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Calendar className="w-4 h-4 text-muted-foreground"/></div>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium line-clamp-1">{e.title}</div>
            <div className="text-xs text-muted-foreground">{new Date(e.start_time).toLocaleString()}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

export default UpcomingEventsBlock

