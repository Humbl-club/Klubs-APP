import React, { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const dayKey = (d: Date) => d.toISOString().slice(0,10)

const MiniCalendarBlock: React.FC<{ days?: number }> = ({ days = 7 }) => {
  const [marks, setMarks] = useState<Record<string, number>>({})
  const start = new Date()
  const end = new Date(Date.now() + (days-1)*24*60*60*1000)
  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await supabase
          .from('events')
          .select('start_time')
          .gte('start_time', start.toISOString())
          .lte('start_time', end.toISOString())
        const m: Record<string, number> = {}
        ;(data||[]).forEach(e => { const k = (e.start_time as string).slice(0,10); m[k] = (m[k]||0)+1 })
        setMarks(m)
      } catch { setMarks({}) }
    })()
  }, [days])

  const daysArr = Array.from({ length: days }).map((_,i) => new Date(Date.now() + i*86400000))

  return (
    <div className="grid grid-cols-7 gap-2">
      {daysArr.map(d => {
        const k = dayKey(d)
        const has = !!marks[k]
        return (
          <div key={k} className={`h-12 rounded-lg flex items-center justify-center text-xs ${has ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground/80'}`}>
            {d.toLocaleDateString(undefined,{ weekday:'short' }).slice(0,2)} {d.getDate()}
          </div>
        )
      })}
    </div>
  )
}

export default MiniCalendarBlock

