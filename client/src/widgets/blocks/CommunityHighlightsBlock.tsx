import React, { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'

const CommunityHighlightsBlock: React.FC<{ limit?: number }> = ({ limit = 3 }) => {
  const [posts, setPosts] = useState<any[]>([])
  useEffect(() => {
    ;(async () => {
      try {
        const { data } = await supabase
          .from('posts')
          .select('id,title,content,cover_url,likes_count,created_at')
          .order('likes_count', { ascending: false })
          .limit(limit)
        setPosts(data || [])
      } catch {
        setPosts([])
      }
    })()
  }, [limit])

  if (!posts.length) return <div className="text-sm text-muted-foreground">Highlights will appear here once your community posts.</div>
  return (
    <div className="space-y-3">
      {posts.map(p => (
        <div key={p.id} className="card-secondary p-3 rounded-lg flex items-center gap-3">
          <div className="w-16 h-12 rounded bg-muted overflow-hidden">
            {p.cover_url ? <img src={p.cover_url} className="w-full h-full object-cover" /> : null}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium line-clamp-1">{p.title || (p.content || '').slice(0, 40)}</div>
            <div className="text-xs text-muted-foreground">{p.likes_count || 0} likes</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default CommunityHighlightsBlock

