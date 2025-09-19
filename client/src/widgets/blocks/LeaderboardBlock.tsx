import React, { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const LeaderboardBlock: React.FC<{ limit?: number }> = ({ limit = 5 }) => {
  const [rows, setRows] = useState<any[]>([])
  useEffect(() => {
    ;(async () => {
      try {
        const { data, error } = await supabase
          .from('walking_leaderboards')
          .select('user_full_name,total_steps')
          .order('total_steps', { ascending: false })
          .limit(limit)
        if (!error && data) setRows(data)
        else setRows([])
      } catch { setRows([]) }
    })()
  }, [limit])
  if (!rows.length) return <div className="text-sm text-muted-foreground">Connect challenges to show a leaderboard.</div>
  return (
    <div className="space-y-2">
      {rows.map((r, idx) => (
        <div key={idx} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-muted flex items-center justify-center text-xs">{idx+1}</span>
            <span className="font-medium">{r.user_full_name || 'Member'}</span>
          </div>
          <div className="text-muted-foreground">{r.total_steps || 0} steps</div>
        </div>
      ))}
    </div>
  )
}

export default LeaderboardBlock

