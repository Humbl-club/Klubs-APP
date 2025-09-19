import React, { useEffect, useState } from 'react'
import { useOrganization } from '@/contexts/OrganizationContext'
import { useAuth } from '@/components/auth/AuthProvider'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export const LoyaltyConnect: React.FC = () => {
  const { currentOrganization } = useOrganization()
  const { user } = useAuth()
  const orgId = currentOrganization?.id
  const [email, setEmail] = useState('')
  const [linked, setLinked] = useState<boolean>(false)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => { (async () => {
    if (!orgId || !user?.id) return
    const { data } = await supabase.from('user_loyalty_links').select('email').eq('organization_id', orgId).eq('user_id', user.id).maybeSingle()
    if (data) { setLinked(true); setEmail(data.email || '') }
  })() }, [orgId, user?.id])

  const link = async () => {
    if (!orgId || !user?.id || !email) return
    await supabase.from('user_loyalty_links').upsert({ organization_id: orgId, user_id: user.id, provider: 'smile', email })
    setLinked(true)
  }

  const syncNow = async () => {
    if (!orgId || !user?.id) return
    setSyncing(true)
    await supabase.functions.invoke('loyalty-pull', { body: { organizationId: orgId, userId: user.id } })
    setSyncing(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loyalty</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Store Email</Label>
          <Input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="you@store-email.com" />
        </div>
        <div className="flex gap-2">
          <Button onClick={link} disabled={!email || linked}>{linked ? 'Linked' : 'Link Account'}</Button>
          <Button variant="outline" onClick={syncNow} disabled={!linked || syncing}>{syncing ? 'Syncing…' : 'Sync now'}</Button>
        </div>
        <div className="text-xs text-muted-foreground">We match your store loyalty account by email. Your data is protected and only shared with your store’s loyalty provider.</div>
      </CardContent>
    </Card>
  )
}

export default LoyaltyConnect

