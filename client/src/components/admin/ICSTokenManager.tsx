import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/auth/AuthProvider'
import { useOrganization } from '@/contexts/OrganizationContext'
import { toast } from '@/hooks/use-toast'

type TokenRow = { token: string; created_at: string; organization_id: string | null }

export const ICSTokenManager: React.FC = () => {
  const { user } = useAuth()
  const { currentOrganization } = useOrganization()
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [loading, setLoading] = useState(false)

  const functionsBase = useMemo(() => {
    const url = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined
    if (!url) return ''
    return url.replace('.supabase.co', '.functions.supabase.co')
  }, [])

  const loadTokens = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('calendar_feed_tokens')
        .select('token, created_at, organization_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setTokens((data || []) as TokenRow[])
    } catch (e) {
      console.error(e)
      toast({ title: 'Failed to load tokens', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const createToken = async () => {
    try {
      const { error } = await supabase.functions.invoke('create-calendar-feed-token', { body: {} })
      if (error) throw error
      toast({ title: 'Calendar feed token created' })
      await loadTokens()
    } catch (e) {
      console.error(e)
      toast({ title: 'Failed to create token', variant: 'destructive' })
    }
  }

  const revokeToken = async (token: string) => {
    try {
      const { error } = await supabase
        .from('calendar_feed_tokens')
        .delete()
        .eq('token', token)
      if (error) throw error
      toast({ title: 'Token revoked' })
      setTokens(prev => prev.filter(t => t.token !== token))
    } catch (e) {
      console.error(e)
      toast({ title: 'Failed to revoke token', variant: 'destructive' })
    }
  }

  useEffect(() => { loadTokens() }, [user?.id])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar (ICS) Feed</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button onClick={createToken} disabled={loading}>Create Token</Button>
          <Button variant="outline" onClick={loadTokens} disabled={loading}>Refresh</Button>
        </div>
        {tokens.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tokens yet. Create one to subscribe your calendar client.</p>
        ) : (
          <div className="space-y-3">
            {tokens.map((t) => {
              const icsUrl = functionsBase && t.token
                ? `${functionsBase}/calendar-ics?token=${t.token}${currentOrganization?.id ? `&orgId=${currentOrganization.id}` : ''}`
                : ''
              return (
                <div key={t.token} className="border rounded-md p-3 space-y-2">
                  <div className="text-xs text-muted-foreground">Created: {new Date(t.created_at).toLocaleString()}</div>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={icsUrl} className="flex-1 text-xs" />
                    <Button
                      variant="secondary"
                      onClick={() => { navigator.clipboard.writeText(icsUrl); toast({ title: 'Copied URL' }) }}
                    >Copy</Button>
                    <Button variant="destructive" onClick={() => revokeToken(t.token)}>Revoke</Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Paste the ICS URL into Google Calendar (Other calendars → From URL) or Apple Calendar (File → New Calendar Subscription).
        </p>
      </CardContent>
    </Card>
  )
}

