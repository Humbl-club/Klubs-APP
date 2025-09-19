import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useRateLimited } from '@/hooks/useRateLimited';

interface UserProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  location: string | null;
  instagram_handle: string | null;
  available_loyalty_points: number | null;
  total_loyalty_points: number | null;
  created_at: string;
}

interface LoyaltyTransaction {
  id: string;
  type: string;
  points: number;
  description: string | null;
  created_at: string;
  reference_type: string | null;
}

interface CompletedChallenge {
  id: string;
  completion_date: string;
  challenges: {
    title: string;
    badge_name: string | null;
    points_reward: number | null;
  };
}

export const useProfileData = (userId: string | undefined) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<LoyaltyTransaction[]>([]);
  const [completedChallenges, setCompletedChallenges] = useState<CompletedChallenge[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { currentOrganization } = useOrganization();
  const { executeWithRateLimit } = useRateLimited();

  useEffect(() => {
    if (userId && currentOrganization) {
      fetchAllData();
    } else if (!currentOrganization) {
      setProfile(null);
      setLoyaltyTransactions([]);
      setCompletedChallenges([]);
      setLoading(false);
    }
  }, [userId, currentOrganization?.id]);

  // Realtime subscriptions for points and profile updates
  useEffect(() => {
    if (!userId || !currentOrganization?.id) return;

    // Subscribe to loyalty_transactions inserts for this user (org-filtered in handler)
    const channel = supabase
      .channel(`rt-points-${userId}-${currentOrganization.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'loyalty_transactions',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          try {
            const row = payload.new as any;
            // Only apply updates for current organization context
            if (row && (!row.organization_id || row.organization_id === currentOrganization.id)) {
              // Prepend transaction for immediacy
              setLoyaltyTransactions((prev) => [row, ...prev]);
              // Refresh profile points to ensure accuracy (earned/redeemed math is centralized in DB triggers)
              const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();
              if (!error && data) setProfile(data as any);
            }
          } catch (e) {
            // Non-fatal
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as any;
          // Keep profile (including points) in sync in case of external adjustments
          setProfile((prev) => ({ ...(prev || {}), ...(row || {}) } as any));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, currentOrganization?.id]);

  const fetchAllData = async () => {
    try {
      await Promise.all([
        fetchProfile(),
        fetchLoyaltyTransactions(),
        fetchCompletedChallenges()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive"
      });
    }
  };

  const fetchLoyaltyTransactions = async () => {
    if (!userId || !currentOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLoyaltyTransactions(data || []);
    } catch (error) {
      console.error('Error fetching loyalty transactions:', error);
    }
  };

  const fetchCompletedChallenges = async () => {
    if (!userId || !currentOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('challenge_participations')
        .select(`
          id,
          completion_date,
          challenges!challenge_participations_challenge_id_fkey (
            title,
            badge_name,
            points_reward
          )
        `)
        .eq('user_id', userId)
        .eq('organization_id', currentOrganization.id)
        .eq('completed', true)
        .order('completion_date', { ascending: false });

      if (error) throw error;
      setCompletedChallenges(data || []);
    } catch (error) {
      console.error('Error fetching completed challenges:', error);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!userId) return false;
    
    return executeWithRateLimit(
      async () => {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        if (error) throw error;
        
        setProfile(prev => prev ? { ...prev, ...updates } : null);
        return true;
      },
      { configKey: 'profiles:update', showToast: true }
    );
  };

  return {
    profile,
    loyaltyTransactions,
    completedChallenges,
    loading,
    updateProfile,
    refreshData: fetchAllData
  };
};
