import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, MapPin, Users, ExternalLink, QrCode, Share2, Download } from 'lucide-react'
import { useEnhancedEventService } from '@/services/domain/EnhancedEventService'
import { useIsMobile } from '@/hooks/useMobileFirst'

type EventRow = {
  id: string
  title: string
  description?: string
  image_url?: string
  location?: string
  start_time: string
  end_time?: string
  price_cents?: number
  loyalty_points_price?: number
  max_capacity?: number
  current_capacity?: number
  organization_id?: string
}

const EventDetail: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { registerForEvent } = useEnhancedEventService()
  const isMobile = useIsMobile()
  const [event, setEvent] = useState<EventRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [related, setRelated] = useState<EventRow[]>([])

  useEffect(() => {
    (async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('events')
          .select('*')
          .eq('id', id)
          .maybeSingle()
        if (error) throw error
        const evt = data as EventRow
        setEvent(evt)
        // Fetch related upcoming events in same org
        if (evt?.organization_id) {
          const { data: rel } = await supabase
            .from('events')
            .select('id,title,start_time,image_url,organization_id')
            .eq('organization_id', evt.organization_id)
            .neq('id', evt.id)
            .in('status', ['upcoming'])
            .order('start_time', { ascending: true })
            .limit(3)
          setRelated(rel as any || [])
        }
      } catch (e: any) {
        setErr(e?.message || 'Failed to load event')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const priceDisplay = useMemo(() => {
    if (!event) return ''
    if (event.loyalty_points_price) return `${event.loyalty_points_price} points`
    if (event.price_cents) return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR' }).format((event.price_cents || 0) / 100)
    return 'Free'
  }, [event])

  const register = useCallback(async () => {
    if (!event) return
    try {
      await registerForEvent(event.id, (await supabase.auth.getUser()).data.user?.id as string)
      navigate('/events')
    } catch {}
  }, [event, registerForEvent, navigate])

  const share = useCallback(async () => {
    if (!event) return
    const url = window.location.href
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: event.title, text: event.description, url })
      } else {
        await navigator.clipboard.writeText(url)
        alert('Link copied to clipboard')
      }
    } catch {}
  }, [event])

  const downloadICS = useCallback(() => {
    if (!event) return
    const dt = (iso: string) => iso.replace(/[-:]/g, '').split('.')[0].replace(/\+\d{2}:?\d{2}$/,'Z');
    const uid = `${event.id}@girlsclub`
    const body = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GirlsClub//Events//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dt(new Date().toISOString())}`,
      `DTSTART:${dt(event.start_time)}`,
      `DTEND:${dt(event.end_time || event.start_time)}`,
      `SUMMARY:${(event.title || '').replace(/\n/g, ' ')}`,
      `DESCRIPTION:${(event.description || '').replace(/\n/g, ' ')}`,
      `LOCATION:${(event.location || '').replace(/\n/g, ' ')}`,
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\r\n')
    const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.title || 'event'}.ics`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [event])

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="glass-card-enhanced p-8 text-center">Loading event…</div>
      </div>
    )
  }
  if (err || !event) {
    return (
      <div className="container mx-auto p-4">
        <div className="glass-card-enhanced p-8 text-center">{err || 'Event not found'}</div>
      </div>
    )
  }

  const d = new Date(event.start_time)
  const dateLine = d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="container mx-auto p-0 sm:p-4">
      {/* Hero */}
      <div className="relative w-full h-64 sm:h-80 overflow-hidden">
        {event.image_url ? (
          <img src={event.image_url} alt={event.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center">
            <Calendar className="w-12 h-12 text-primary/40" />
          </div>
        )}
        <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-background/80 to-transparent">
          <div className="text-2xl font-semibold">{event.title}</div>
          <div className="text-sm text-muted-foreground">{priceDisplay}</div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        <Card className="glass-card-enhanced">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{dateLine}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>
            )}
            {typeof event.max_capacity === 'number' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>Capacity: {event.current_capacity || 0}/{event.max_capacity}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {event.description && (
          <Card className="glass-card-enhanced">
            <CardContent className="p-4">
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{event.description}</div>
            </CardContent>
          </Card>
        )}

        {related.length > 0 && (
          <Card className="glass-card-enhanced">
            <CardContent className="p-4 space-y-3">
              <div className="text-sm font-semibold">Related Events</div>
              <div className="grid grid-cols-1 gap-3">
                {related.map((r) => (
                  <button key={r.id} className="text-left card-secondary p-3 rounded-lg" onClick={() => navigate(`/events/${r.id}`)}>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-12 rounded-md overflow-hidden bg-muted">
                        {r.image_url ? <img src={r.image_url} alt={r.title} className="w-full h-full object-cover" /> : null}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium line-clamp-1">{r.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(r.start_time).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="px-4 pb-20 sm:pb-0 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={share}>
            <Share2 className="w-4 h-4 mr-2" /> Share
          </Button>
          <Button variant="outline" className="flex-1" onClick={downloadICS}>
            <Download className="w-4 h-4 mr-2" /> Add to Calendar
          </Button>
        </div>
      </div>

      {/* Sticky CTA on mobile */}
      {isMobile && (
        <div className="sticky bottom-0 inset-x-0 z-10">
          <div className="bg-background/90 backdrop-blur border-t border-border px-3 py-2 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>
              <ExternalLink className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button className="flex-1" onClick={register}>
              <Users className="w-4 h-4 mr-2" /> Register
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => navigate('/qr-scanner')}>
              <QrCode className="w-4 h-4 mr-2" /> Scan QR
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventDetail
