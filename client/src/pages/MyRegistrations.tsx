import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/auth/AuthProvider';
import { EnhancedEventCard } from '@/components/events/EnhancedEventCard';
import { PageSection } from '@/components/sections/PageSection';
import { SectionHeader } from '@/components/sections/SectionHeader';
import { MobileCard } from '@/components/advanced/CompoundMobileCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Row = {
  event_id: string;
  registered_at: string;
  events: {
    id: string;
    title: string;
    description?: string | null;
    start_time: string;
    end_time?: string | null;
    location?: string | null;
    price_cents?: number | null;
    loyalty_points_price?: number | null;
  } | null;
};

const MyRegistrations: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true); setError(null);
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('event_id, registered_at, events:event_id(id,title,description,start_time,end_time,location,price_cents,loyalty_points_price)')
        .eq('user_id', user.id)
        .order('registered_at', { ascending: false });
      if (error) throw error;
      setRows((data || []) as any);
    } catch (e: any) {
      setError(e.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const now = useMemo(() => Date.now(), []);
  const { upcoming, past } = useMemo(() => {
    const u: Row[] = []; const p: Row[] = [];
    for (const r of rows) {
      const start = r.events?.start_time ? new Date(r.events.start_time).getTime() : 0;
      (start >= now ? u : p).push(r);
    }
    return { upcoming: u, past: p };
  }, [rows, now]);

  const unregister = async (eventId: string) => {
    try {
      const { error } = await supabase.rpc('unregister_from_event', {
        event_id_param: eventId,
        user_id_param: user!.id,
      });
      if (error) throw error;
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to unregister');
    }
  };

  const renderEvent = (r: Row) => {
    const e = r.events;
    if (!e) return null;
    return (
      <div key={e.id} className="mb-3">
        <EnhancedEventCard
          event={{
            id: e.id,
            title: e.title,
            description: e.description || undefined,
            start_time: e.start_time,
            end_time: e.end_time || undefined,
            location: e.location || undefined,
            price_cents: e.price_cents || undefined,
            loyalty_points_price: e.loyalty_points_price || undefined,
            is_registered: true,
            isUpcoming: (new Date(e.start_time).getTime() >= now),
          }}
          onViewDetails={() => {}}
        />
        {new Date(e.start_time).getTime() >= now && (
          <div className="flex justify-end mt-2">
            <Button variant="outline" onClick={() => unregister(e.id)}>Unregister</Button>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <MobileCard variant="touch-optimized">
          <MobileCard.Content>
            <div className="py-8 text-center">Loading…</div>
          </MobileCard.Content>
        </MobileCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <MobileCard variant="touch-optimized">
          <MobileCard.Content>
            <div className="text-center py-8">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={load}>Try Again</Button>
            </div>
          </MobileCard.Content>
        </MobileCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto space-y-6 p-4">
        <PageSection surface="hero" className="mb-2">
          <SectionHeader title="My Registrations" subtitle="Your upcoming and past events" />
        </PageSection>

        {!!upcoming.length && (
          <div>
            <h2 className={cn('text-sm font-semibold text-muted-foreground mb-2')}>Upcoming</h2>
            {upcoming.map(renderEvent)}
          </div>
        )}
        {!!past.length && (
          <div className="mt-4">
            <h2 className={cn('text-sm font-semibold text-muted-foreground mb-2')}>Past</h2>
            {past.map(renderEvent)}
          </div>
        )}
        {!upcoming.length && !past.length && (
          <MobileCard variant="touch-optimized">
            <MobileCard.Content>
              <div className="py-10 text-center text-muted-foreground">No registrations yet</div>
            </MobileCard.Content>
          </MobileCard>
        )}
      </div>
    </div>
  );
};

export default MyRegistrations;
