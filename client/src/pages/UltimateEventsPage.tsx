import React, { Suspense, memo, useCallback, useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useAdvancedMobileOptimization } from '@/hooks/useAdvancedMobileOptimization';
import { useEnhancedEventService } from '@/services/domain/EnhancedEventService';
import { useProgressiveEnhancement } from '@/hooks/useProgressiveEnhancement';
import { VirtualizedList } from '@/components/advanced/VirtualizedList';
import { EventCardPresentation } from '@/components/presentation/EventCardPresentation';
import { EnhancedEventCard } from '@/components/events/EnhancedEventCard';
import { EventSearch } from '@/components/events/EventSearch';
import { MobileCard } from '@/components/advanced/CompoundMobileCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from '@/hooks/use-toast';
import { eventBus } from '@/core/EventBus';
import { PerformanceMonitorService } from '@/services/core/PerformanceMonitorService';
import { Calendar, Plus, Grid3X3, List, LayoutGrid, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileLoading } from '@/components/ui/mobile-loading';
import { SEO } from '@/components/seo/SEO';
import { useOrganization } from '@/contexts/OrganizationContext';
import { PageSection } from '@/components/sections/PageSection';
import { SectionHeader } from '@/components/sections/SectionHeader';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as DayPicker } from '@/components/ui/calendar';
import { useFeatureFlags } from '@/contexts/FeatureFlagsContext';
import { LocationAutocomplete } from '@/components/events/LocationAutocomplete';
import { PaymentModal } from '@/components/payment/PaymentModal';
import { useProfileData } from '@/hooks/useProfileData';

// Ultimate Events Page with enterprise architecture
const UltimateEventsPage = memo(() => {
  const { user } = useAuth();
  const { performanceMetrics, isMobileOptimized } = useAdvancedMobileOptimization();
  const { getEvents, createEvent, registerForEvent } = useEnhancedEventService();
  const { getLoadingStrategy, usePullToRefresh } = useProgressiveEnhancement();
  
  // Initialize pull-to-refresh
  usePullToRefresh(async () => {
    await loadEvents(activeTab);
    toast({
      title: "Refreshed",
      description: "Events updated"
    });
  });
  
  const [events, setEvents] = useState<any[]>([]);
  const [registeredEventIds, setRegisteredEventIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState('upcoming');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [savedEvents, setSavedEvents] = useState<Set<string>>(new Set());

  // Performance monitoring
  const performanceMonitor = PerformanceMonitorService.getInstance();

  // Feature flags and admin check
  const { flags } = useFeatureFlags();
  const { isAdmin } = useAuth();

  // Create Event modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [dateInput, setDateInput] = useState<Date | undefined>();
  const [startTimeInput, setStartTimeInput] = useState('18:00');
  const [endTimeInput, setEndTimeInput] = useState('19:00');
  const [priceInput, setPriceInput] = useState('');
  const [capacityInput, setCapacityInput] = useState<number | ''>('');
  const [submitting, setSubmitting] = useState(false);
  // Stripe Connect state for gating paid events
  const { currentOrganization } = useOrganization();
  const [orgStripeStatus, setOrgStripeStatus] = useState<{ charges_enabled?: boolean; payouts_enabled?: boolean } | null>(null);
  const [stripeLinkLoading, setStripeLinkLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!currentOrganization?.id) return;
      const { data } = await supabase
        .from('organizations')
        .select('charges_enabled, payouts_enabled')
        .eq('id', currentOrganization.id)
        .maybeSingle();
      if (data) setOrgStripeStatus(data as any);
    })();
  }, [currentOrganization?.id]);

  const connectWithStripe = async (mode: 'onboarding' | 'update' = 'onboarding') => {
    try {
      setStripeLinkLoading(true);
      const { data, error } = await supabase.functions.invoke('stripe-connect', { body: { mode } });
      if (error) throw error;
      if (data?.url) window.location.href = data.url as string;
    } catch (e) {
      toast({ title: 'Failed to open Stripe', description: e instanceof Error ? e.message : 'Please try again', variant: 'destructive' });
    } finally {
      setStripeLinkLoading(false);
    }
  };

  const refreshStripeStatus = async () => {
    try {
      const { error } = await supabase.functions.invoke('stripe-sync-status');
      if (error) throw error;
      const { data } = await supabase
        .from('organizations')
        .select('charges_enabled, payouts_enabled')
        .eq('id', currentOrganization!.id)
        .maybeSingle();
      if (data) setOrgStripeStatus(data as any);
      toast({ title: 'Stripe status refreshed' });
    } catch (e) {
      toast({ title: 'Refresh failed', description: e instanceof Error ? e.message : 'Please try again', variant: 'destructive' });
    }
  };
  // Payment state
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentEvent, setPaymentEvent] = useState<any | null>(null);
  const { profile } = useProfileData(user?.id);

  // Load events with enhanced caching and monitoring
  const loadEvents = useCallback(async (status = 'upcoming') => {
    performance.mark('loadEvents-start');
    console.log(`🔄 Loading events with status: ${status}, user: ${user?.id}`);
    
    try {
      setLoading(true);
      setError(null);
      
      const eventsData = await getEvents({
        userId: user?.id,
        status,
        limit: 20
      });
      const list = Array.isArray(eventsData) ? eventsData : [];
      // Ensure registered state is consistent with server registrations
      const merged = list.map((e: any) => ({
        ...e,
        is_registered: Boolean(e.is_registered) || registeredEventIds.has(e.id)
      }));
      console.log(`✅ Loaded ${merged.length} events`, merged);
      setEvents(merged);
      
      performance.mark('loadEvents-end');
      performance.measure('loadEvents-duration', 'loadEvents-start', 'loadEvents-end');
      
    } catch (err) {
      console.error('❌ Error loading events:', err);
      setError('Failed to load events');
      toast({
        title: 'Error',
        description: 'Failed to load events. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [getEvents, user?.id, registeredEventIds]);

  const loadRegisteredEventIds = useCallback(async () => {
    try {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', user.id);
      if (error) throw error;
      const ids = new Set((data || []).map((r: any) => r.event_id));
      setRegisteredEventIds(ids);
    } catch (err) {
      // Non-fatal; keep UI going
    }
  }, [user?.id]);

  // Enhanced event registration with payment flow for paid events
  const handleRegister = useCallback(async (eventId: string) => {
    if (!user) return;

    const evt = events.find(e => e.id === eventId);
    if (evt && ((evt.price_cents && evt.price_cents > 0) || (evt.loyalty_points_price && evt.loyalty_points_price > 0))) {
      setPaymentEvent(evt);
      setPaymentOpen(true);
      return;
    }
    
    try {
      // Optimistic update for free events
      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? { ...event, is_registered: true }
          : event
      ));
      setRegisteredEventIds(prev => new Set(prev).add(eventId));

      await registerForEvent(eventId, user.id);
      
      toast({
        title: 'Success',
        description: 'Successfully registered for event!'
      });
    } catch (err) {
      // Revert optimistic update on error
      setEvents(prev => prev.map(event => 
        event.id === eventId 
          ? { ...event, is_registered: false }
          : event
      ));
      setRegisteredEventIds(prev => {
        const copy = new Set(prev);
        copy.delete(eventId);
        return copy;
      });
      
      console.error('Registration error:', err);
      toast({
        title: 'Registration Failed',
        description: err instanceof Error ? err.message : 'Failed to register for event',
        variant: 'destructive'
      });
    }
  }, [events, registerForEvent, user]);

  // Unregister from event (free events only)
  const handleUnregister = useCallback(async (eventId: string) => {
    if (!user) return;
    try {
      // Optimistic update
      setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, is_registered: false } : ev));
      setRegisteredEventIds(prev => { const c = new Set(prev); c.delete(eventId); return c; });

      const { error } = await supabase.rpc('unregister_from_event', {
        event_id_param: eventId,
        user_id_param: user.id,
      });
      if (error) throw error;
      toast({ title: 'Unregistered', description: 'You have been unregistered from the event.' });
    } catch (err) {
      // Revert
      setEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, is_registered: true } : ev));
      setRegisteredEventIds(prev => new Set(prev).add(eventId));
      toast({ title: 'Failed to unregister', description: err instanceof Error ? err.message : 'Please try again', variant: 'destructive' });
    }
  }, [user]);

  // Save/Unsave event functionality
  const handleSaveEvent = useCallback(async (eventId: string, saved: boolean) => {
    // Update local state immediately for better UX
    setSavedEvents(prev => {
      const newSet = new Set(prev);
      if (saved) {
        newSet.add(eventId);
      } else {
        newSet.delete(eventId);
      }
      return newSet;
    });

    // TODO: Implement API call to save/unsave event
    // This would typically involve a database call to store user preferences
  }, []);

  // Share event functionality
  const handleShareEvent = useCallback(async (eventId: string) => {
    // Analytics tracking could be added here
    console.log('Event shared:', eventId);
  }, []);

  // Create Event submit handler
  const handleCreateEventSubmit = useCallback(async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to create events', variant: 'destructive' });
      return;
    }
    if (!titleInput.trim()) {
      toast({ title: 'Title required', description: 'Please enter an event title', variant: 'destructive' });
      return;
    }
    if (!dateInput) {
      toast({ title: 'Date required', description: 'Please select a date', variant: 'destructive' });
      return;
    }
    const combineDateTime = (date: Date, time: string) => {
      const [h, m] = time.split(':').map(Number);
      const d = new Date(date);
      d.setHours(h || 0, m || 0, 0, 0);
      return d.toISOString();
    };

    try {
      setSubmitting(true);
      const startIso = combineDateTime(dateInput, startTimeInput);
      const endIso = endTimeInput ? combineDateTime(dateInput, endTimeInput) : undefined;

      const payload: any = {
        title: titleInput.trim(),
        description: descriptionInput?.trim() || null,
        location: locationInput?.trim() || null,
        start_time: startIso,
        ...(endIso ? { end_time: endIso } : {}),
        price_cents: priceInput ? Math.round(parseFloat(priceInput) * 100) : null,
        max_capacity: typeof capacityInput === 'number' ? capacityInput : null,
      };

      // Gate paid events on Stripe connect status
      const priceCents = payload.price_cents || 0;
      if (priceCents > 0) {
        if (!orgStripeStatus?.charges_enabled || !orgStripeStatus?.payouts_enabled) {
          toast({ title: 'Connect Stripe to enable paid events', description: 'Go to Organization Settings → Payments', variant: 'destructive' });
          setSubmitting(false);
          return;
        }
      }

      await createEvent(payload, user.id);
      toast({ title: 'Event created', description: 'Your event has been created.' });
      setCreateOpen(false);
      setTitleInput('');
      setDescriptionInput('');
      setLocationInput('');
      setDateInput(undefined);
      setStartTimeInput('18:00');
      setEndTimeInput('19:00');
      setPriceInput('');
      setCapacityInput('');
      await loadEvents(activeTab);
    } catch (err: any) {
      console.error('Create event failed:', err);
      toast({ title: 'Failed to create event', description: err?.message || 'Please try again', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  }, [user, titleInput, dateInput, startTimeInput, endTimeInput, descriptionInput, locationInput, priceInput, capacityInput, createEvent, loadEvents, activeTab]);

  // Filtered and sorted events
  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event => 
        event.title?.toLowerCase().includes(query) ||
        event.description?.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query)
      );
    }

    // Apply category filters
    if (activeFilters.length > 0) {
      filtered = filtered.filter(event => {
        if (activeFilters.includes('free') && !event.price_cents && !event.loyalty_points_price) return true;
        if (activeFilters.includes('paid') && (event.price_cents || event.loyalty_points_price)) return true;
        if (activeFilters.includes('today') && event.isToday) return true;
        if (activeFilters.includes('this-week')) {
          const eventDate = new Date(event.start_time);
          const weekFromNow = new Date();
          weekFromNow.setDate(weekFromNow.getDate() + 7);
          return eventDate <= weekFromNow;
        }
        if (activeFilters.includes('available')) {
          return !event.max_capacity || event.current_capacity < event.max_capacity;
        }
        return false;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
        case 'price':
          const priceA = a.price_cents || a.loyalty_points_price || 0;
          const priceB = b.price_cents || b.loyalty_points_price || 0;
          return priceA - priceB;
        case 'popularity':
          return (b.current_capacity || 0) - (a.current_capacity || 0);
        default:
          return 0;
      }
    });

    // Add saved status to events
    return filtered.map(event => ({
      ...event,
      isSaved: savedEvents.has(event.id)
    }));
  }, [events, searchQuery, activeFilters, sortBy, savedEvents]);

  // Featured event (only on Upcoming, when no search/filters)
  const featuredEvent = useMemo(() => {
    if (activeTab !== 'upcoming' || searchQuery || activeFilters.length > 0) return null;
    return filteredEvents[0] || null;
  }, [activeTab, searchQuery, activeFilters, filteredEvents]);

  // Exclude featured from listings below
  const displayedEvents = useMemo(() => {
    if (!featuredEvent) return filteredEvents;
    return filteredEvents.filter((e) => e.id !== featuredEvent.id);
  }, [filteredEvents, featuredEvent]);

  // Real-time event updates
  useEffect(() => {
    const unsubscribeCreated = eventBus.on('event:created', () => {
      loadEvents(activeTab);
    });

    const unsubscribeRegistered = eventBus.on('event:registered', () => {
      loadRegisteredEventIds();
      loadEvents(activeTab);
    });

    return () => {
      unsubscribeCreated();
      unsubscribeRegistered();
    };
  }, [loadEvents, loadRegisteredEventIds, activeTab]);


  // Initial load and tab changes
  useEffect(() => {
    loadEvents(activeTab);
    loadRegisteredEventIds();
  }, [loadEvents, loadRegisteredEventIds, activeTab]);

  // Handle Stripe Checkout return and verify payment
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const sessionId = params.get('session_id');

    if (payment === 'success' && sessionId) {
      (async () => {
        try {
          toast({ title: 'Verifying payment…', description: 'Please wait a moment.' });
          const { data, error } = await supabase.functions.invoke('verify-payment', {
            body: { sessionId }
          });

          if (error || !data || data.status !== 'completed') {
            toast({ title: 'Payment not completed', description: 'If you were charged, please contact support.', variant: 'destructive' });
          } else {
            toast({ title: 'Payment confirmed', description: 'You are registered for the event!' });
          }

          await loadRegisteredEventIds();
          await loadEvents(activeTab);
        } catch (e) {
          toast({ title: 'Verification failed', description: 'Please refresh the page.', variant: 'destructive' });
        } finally {
          const url = new URL(window.location.href);
          url.searchParams.delete('payment');
          url.searchParams.delete('session_id');
          window.history.replaceState({}, '', url.toString());
        }
      })();
    }
  }, [activeTab, loadEvents, loadRegisteredEventIds]);

  // Enhanced render event card with error boundaries
  const renderEventCard = useCallback((event: any, index: number) => (
    <div key={event.id} className={cn(
      'transition-all duration-200',
      viewMode === 'grid' ? 'mb-4' : 'mb-3'
    )}>
      {/* Paid events disabled badge for admins when Stripe not connected */}
      {isAdmin && (event.price_cents || 0) > 0 && (!orgStripeStatus?.charges_enabled || !orgStripeStatus?.payouts_enabled) && (
        <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 text-amber-900 p-2 text-xs">
          Paid events are disabled until Stripe is connected.
        </div>
      )}
      <EnhancedEventCard
        event={event}
        onRegister={handleRegister}
        onViewDetails={(id) => console.log('View details:', id)}
        onUnregister={handleUnregister}
        onSave={handleSaveEvent}
        onShare={handleShareEvent}
        variant={viewMode === 'list' || isMobileOptimized ? 'compact' : 'default'}
      />
    </div>
  ), [handleRegister, handleSaveEvent, handleShareEvent, isMobileOptimized, viewMode]);

  // Adaptive loading strategy
  const loadingStrategy = getLoadingStrategy();
  
  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <MobileLoading 
          variant="skeleton"
          size="lg"
          text="Loading events..."
        />
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
              <Button onClick={() => loadEvents(activeTab)}>
                Try Again
              </Button>
            </div>
          </MobileCard.Content>
        </MobileCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background mobile:p-2 sm:p-4 lg:p-6 safe-area-top" data-pull-refresh>
      <SEO title="Events" description="Discover and join girls-only meetups, workshops, and activities." canonical="/events" />
      <h1 className="sr-only">Events</h1>
      {isMobileOptimized && (
        <div className="pull-refresh-indicator">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
        </div>
      )}
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <PageSection surface="hero" className="mb-3 motion-safe:animate-fade-in">
          <SectionHeader
            title="Events"
            subtitle="Discover and join community events"
            actions={isAdmin && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="glass-button mobile:w-full lg:w-auto mobile:h-10 sm:h-11 lg:h-12 mobile:px-4 sm:px-6" aria-label="Create event" haptic="light">
                    <Plus className="mobile:w-4 mobile:h-4 sm:w-5 sm:h-5 mr-2" />
                    <span className="mobile:text-sm sm:text-base">Create Event</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="glass-card max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create Event</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="evt-title">Title</Label>
                      <Input id="evt-title" value={titleInput} onChange={(e) => setTitleInput(e.target.value)} placeholder="e.g., Weekend Walk & Talk" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="evt-desc">Description</Label>
                      <Textarea id="evt-desc" rows={3} value={descriptionInput} onChange={(e) => setDescriptionInput(e.target.value)} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="justify-start">
                            {dateInput ? dateInput.toLocaleDateString() : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <DayPicker
                            mode="single"
                            selected={dateInput}
                            onSelect={setDateInput}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-2">
                        <Label htmlFor="evt-start">Start time</Label>
                        <Input id="evt-start" type="time" value={startTimeInput} onChange={(e) => setStartTimeInput(e.target.value)} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="evt-end">End time</Label>
                        <Input id="evt-end" type="time" value={endTimeInput} onChange={(e) => setEndTimeInput(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="evt-location">Location</Label>
                      <LocationAutocomplete id="evt-location" value={locationInput} onChange={setLocationInput} placeholder="Search address or place..." />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-2">
                        <Label htmlFor="evt-price">Price (EUR)</Label>
                        <Input id="evt-price" type="number" min="0" step="0.01" value={priceInput} onChange={(e) => setPriceInput(e.target.value)} />
                        {isAdmin && Number(priceInput || 0) > 0 && (!orgStripeStatus?.charges_enabled || !orgStripeStatus?.payouts_enabled) && (
                          <div className="text-xs rounded-md border border-amber-200 bg-amber-50 text-amber-800 p-2">
                            Paid events require Stripe Connect. Connect your Stripe account to accept payments.
                            <div className="mt-2 flex gap-2">
                              <Button size="sm" onClick={() => connectWithStripe('onboarding')} disabled={stripeLinkLoading}>Connect with Stripe</Button>
                              <Button size="sm" variant="outline" onClick={refreshStripeStatus}>Refresh</Button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="evt-capacity">Capacity</Label>
                        <Input id="evt-capacity" type="number" min="0" value={capacityInput as any} onChange={(e) => setCapacityInput(e.target.value === '' ? '' : Number(e.target.value))} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={submitting}>Cancel</Button>
                      <Button onClick={handleCreateEventSubmit} disabled={submitting}>
                        {submitting ? 'Creating…' : 'Create'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          />
          {isAdmin && (
            <div className="mt-2">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const { data, error } = await supabase.functions.invoke('create-calendar-feed-token');
                    if (error) throw error;
                    const url = data?.ics_url as string;
                    await navigator.clipboard.writeText(url);
                    toast({ title: 'ICS link copied', description: 'Paste into your calendar app.' });
                  } catch (e: any) {
                    toast({ title: 'Failed to create ICS link', description: e?.message || 'Try again', variant: 'destructive' })
                  }
                }}
              >
                Create ICS Link
              </Button>
            </div>
          )}
          
        </PageSection>

        {/* Stripe Connect Banner for Admins */}
        {isAdmin && (!orgStripeStatus?.charges_enabled || !orgStripeStatus?.payouts_enabled) && (
          <PageSection className="mobile:p-3 sm:p-4 lg:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 p-3">
              <div className="text-amber-900 text-sm">
                <div className="font-medium">Enable paid events with Stripe Connect</div>
                <div className="opacity-90">Connect your Stripe account to accept payments and receive payouts directly.</div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => connectWithStripe('onboarding')} disabled={stripeLinkLoading}>Connect with Stripe</Button>
                <Button variant="outline" onClick={() => connectWithStripe('update')}>Update Details</Button>
                <Button variant="secondary" onClick={refreshStripeStatus}>Refresh Status</Button>
              </div>
            </div>
          </PageSection>
        )}

        {/* Featured Event */}
        {featuredEvent && (
          <div className="glass-card-enhanced p-0 motion-safe:animate-fade-in">
            <EnhancedEventCard
              event={featuredEvent}
              onRegister={handleRegister}
              onViewDetails={(id) => console.log('View details:', id)}
              onSave={handleSaveEvent}
              onShare={handleShareEvent}
              variant="featured"
            />
          </div>
        )}

        {/* Search & Filters */}
        <PageSection className="mobile:p-3 sm:p-4 lg:p-6 motion-safe:animate-fade-in">
          <EventSearch
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            activeFilters={activeFilters}
            onFilterChange={setActiveFilters}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </PageSection>

        <PageSection className="mobile:p-3 sm:p-4 lg:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex mobile:flex-col sm:flex-row mobile:gap-3 sm:items-center sm:justify-between mb-4">
              <TabsList className="grid w-full grid-cols-3 mobile:h-12 sm:h-10 gap-1">
                <TabsTrigger 
                  value="upcoming" 
                  className="mobile:text-sm sm:text-base font-medium touch-manipulation"
                >
                  Upcoming
                </TabsTrigger>
                <TabsTrigger 
                  value="ongoing" 
                  className="mobile:text-sm sm:text-base font-medium touch-manipulation"
                >
                  Ongoing
                </TabsTrigger>
                <TabsTrigger 
                  value="completed" 
                  className="mobile:text-sm sm:text-base font-medium touch-manipulation"
                >
                  Past
                </TabsTrigger>
              </TabsList>

              {/* View Mode Toggle - Hidden on mobile */}
              {!isMobileOptimized && (
                <div className="flex gap-1">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="h-8 w-8 p-0"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="h-8 w-8 p-0"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <TabsContent value="upcoming" className="mobile:mt-4 sm:mt-6">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: isMobileOptimized ? 2 : 3 }).map((_, i) => (
                    <div key={i} className="glass-card mobile:h-32 sm:h-40 rounded-xl animate-pulse" />
                  ))}
                </div>
               ) : displayedEvents.length === 0 ? (
                <EmptyState
                  icon={searchQuery || activeFilters.length > 0 ? <Search className="w-full h-full" /> : <Calendar className="w-full h-full" />}
                  title={searchQuery || activeFilters.length > 0 
                    ? "No events match your search" 
                    : `No ${activeTab} events found`}
                  description={searchQuery || activeFilters.length > 0
                    ? "Try adjusting your search criteria or filters to find events that match your interests."
                    : "New exciting events are added regularly. Check back soon to discover amazing experiences!"}
                  action={{
                    label: searchQuery || activeFilters.length > 0 ? "Clear Filters" : "Explore All Events",
                    onClick: () => {
                      if (searchQuery || activeFilters.length > 0) {
                        setSearchQuery('');
                        setActiveFilters([]);
                      } else {
                        setActiveTab('all');
                      }
                    },
                    variant: "default"
                  }}
                />
                {isAdmin && (!orgStripeStatus?.charges_enabled || !orgStripeStatus?.payouts_enabled) && (
                  <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900 text-sm">
                    Want to host paid events? Connect your Stripe account to accept payments and receive payouts directly.
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => connectWithStripe('onboarding')} disabled={stripeLinkLoading}>Connect with Stripe</Button>
                      <Button size="sm" variant="outline" onClick={() => connectWithStripe('update')}>Update Details</Button>
                      <Button size="sm" variant="secondary" onClick={refreshStripeStatus}>Refresh Status</Button>
                    </div>
                  </div>
                )}
              ) : (
                <div className="mobile:space-y-3 sm:space-y-4">
                  {/* Mobile-first event list */}
                  {isMobileOptimized ? (
                    <div className="space-y-3">
                      {displayedEvents.slice(0, 10).map((event, index) => renderEventCard(event, index))}
                      
                      {displayedEvents.length > 10 && (
                        <div className="text-center pt-4">
                          <Button variant="outline" className="w-full">
                            <Plus className="w-4 h-4 mr-2" />
                            Load More Events ({displayedEvents.length - 10} remaining)
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={cn(
                      'grid gap-4',
                      viewMode === 'grid' ? 'sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
                    )}>
                      {displayedEvents.slice(0, 12).map((event, index) => renderEventCard(event, index))}
                      
                      {displayedEvents.length > 12 && (
                        <div className="col-span-full text-center pt-4">
                          <Button variant="outline">
                            <Plus className="w-4 h-4 mr-2" />
                            Load More Events ({displayedEvents.length - 12} remaining)
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="ongoing" className="mobile:mt-4 sm:mt-6">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: isMobileOptimized ? 2 : 3 }).map((_, i) => (
                    <div key={i} className="glass-card mobile:h-32 sm:h-40 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredEvents.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="w-full h-full" />}
                  title="No ongoing events"
                  description="There are currently no events in progress. Check back later for live events and activities!"
                />
              ) : (
                <div className="mobile:space-y-3 sm:space-y-4">
                  {/* Mobile-first event list */}
                  {isMobileOptimized ? (
                    <div className="space-y-3">
                      {filteredEvents.slice(0, 10).map((event, index) => renderEventCard(event, index))}
                    </div>
                  ) : (
                    <div className={cn(
                      'grid gap-4',
                      viewMode === 'grid' ? 'sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
                    )}>
                      {filteredEvents.slice(0, 12).map((event, index) => renderEventCard(event, index))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mobile:mt-4 sm:mt-6">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: isMobileOptimized ? 2 : 3 }).map((_, i) => (
                    <div key={i} className="glass-card mobile:h-32 sm:h-40 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredEvents.length === 0 ? (
                <EmptyState
                  icon={<Calendar className="w-full h-full" />}
                  title="No past events"
                  description="Past events will appear here once they're completed. Check out upcoming events to join the community!"
                  action={{
                    label: "View Upcoming Events",
                    onClick: () => setActiveTab('upcoming'),
                    variant: "default"
                  }}
                />
              ) : (
                <div className="mobile:space-y-3 sm:space-y-4">
                  {/* Mobile-first event list */}
                  {isMobileOptimized ? (
                    <div className="space-y-3">
                      {filteredEvents.slice(0, 10).map((event, index) => renderEventCard(event, index))}
                    </div>
                  ) : (
                    <div className={cn(
                      'grid gap-4',
                      viewMode === 'grid' ? 'sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
                    )}>
                      {filteredEvents.slice(0, 12).map((event, index) => renderEventCard(event, index))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </PageSection>
      </div>

      {paymentEvent && (
        <PaymentModal
          isOpen={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          event={{
            id: paymentEvent.id,
            title: paymentEvent.title,
            price_cents: paymentEvent.price_cents || 0,
            loyalty_points_price: paymentEvent.loyalty_points_price ?? undefined,
          }}
          userPoints={profile?.available_loyalty_points ?? 0}
        />
      )}

      {/* Enhanced Performance Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed mobile:bottom-4 sm:bottom-6 right-4 glass-modal p-2 rounded-lg mobile:text-xs sm:text-sm space-y-1 z-40 max-w-32">
          <div>Mobile: {isMobileOptimized ? '✓' : '✗'}</div>
          <div>View: {viewMode}</div>
          <div>Events: {filteredEvents.length}/{events.length}</div>
        </div>
      )}
    </div>
  );
});

UltimateEventsPage.displayName = 'UltimateEventsPage';

export default UltimateEventsPage;
