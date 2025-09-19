import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import type { 
  Organization, 
  OrganizationMember, 
  OrganizationContextType,
  OrganizationFeature,
  FeatureCatalogItem,
  OrganizationTheme,
  OrganizationTypography,
  OrganizationBranding,
  OrganizationLayout,
  InviteCode,
  ClubSignupPage
} from '../types/organization';

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

interface OrganizationProviderProps {
  children: React.ReactNode;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children }) => {
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [userMemberships, setUserMemberships] = useState<OrganizationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Multi-tenant feature states
  const [organizationFeatures, setOrganizationFeatures] = useState<OrganizationFeature[]>([]);
  const [featureCatalog, setFeatureCatalog] = useState<FeatureCatalogItem[]>([]);
  const [organizationTheme, setOrganizationTheme] = useState<OrganizationTheme | null>(null);
  const [organizationTypography, setOrganizationTypography] = useState<OrganizationTypography | null>(null);
  const [organizationBranding, setOrganizationBranding] = useState<OrganizationBranding | null>(null);
  const [organizationLayout, setOrganizationLayout] = useState<OrganizationLayout | null>(null);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [signupPage, setSignupPage] = useState<ClubSignupPage | null>(null);
  const [dashboardWidgets, setDashboardWidgets] = useState<any[]>([]);
  const [navigationItems, setNavigationItems] = useState<any[]>([]);
  const [platformAdmin, setPlatformAdmin] = useState<any | null>(null);
  const [organizationStats, setOrganizationStats] = useState<any>(null);

  // Get user's role in current organization
  const userRole = currentOrganization 
    ? userMemberships.find(m => m.organization_id === currentOrganization.id)?.role || null
    : null;

  const isAdmin = userRole === 'owner' || userRole === 'admin';
  const isModerator = userRole === 'moderator' || isAdmin;
  const isMember = userRole !== null;
  const isOwner = userRole === 'owner';
  const isPlatformAdmin = platformAdmin !== null;
  const isSuperAdmin = platformAdmin?.role === 'super_admin';

  // Load user's organizations on mount
  useEffect(() => {
    loadUserOrganizations();
    loadFeatureCatalog();
    checkPlatformAdminStatus();
  }, []);
  
  // Load organization-specific data when organization changes
  useEffect(() => {
    if (currentOrganization) {
      loadOrganizationFeatures();
      loadOrganizationTheme();
      loadOrganizationBranding();
      loadOrganizationLayout();
      loadDashboardWidgets();
      loadNavigationItems();
      loadOrganizationStats();
      loadInviteCodes();
      loadSignupPage();
    }
  }, [currentOrganization?.id]);

  // Set up real-time subscription for organization changes
  useEffect(() => {
    if (!currentOrganization) return;

    const subscription = supabase
      .channel('organization-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'organizations',
          filter: `id=eq.${currentOrganization.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setCurrentOrganization(payload.new as Organization);
          } else if (payload.eventType === 'DELETE') {
            // Organization was deleted, switch to first available
            handleOrganizationDeleted();
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentOrganization?.id]);

  // Check if user is a platform admin
  const checkPlatformAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: admin } = await supabase
        .from('platform_admins')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();
      
      setPlatformAdmin(admin);
    } catch (err) {
      console.log('Not a platform admin');
    }
  };
  
  // Load feature catalog
  const loadFeatureCatalog = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_catalog')
        .select('*')
        .eq('available', true)
        .order('category', { ascending: true });
      
      if (error) throw error;
      setFeatureCatalog(data || []);
    } catch (err) {
      console.error('Failed to load feature catalog:', err);
    }
  };
  
  // Load organization features
  const loadOrganizationFeatures = async () => {
    if (!currentOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('organization_features')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('enabled', true);
      
      if (error) throw error;
      setOrganizationFeatures(data || []);
    } catch (err) {
      console.error('Failed to load organization features:', err);
    }
  };
  
  // Load organization theme
  const loadOrganizationTheme = async () => {
    if (!currentOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('organization_themes')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setOrganizationTheme(data);
      
      // Load typography settings
      const { data: typography } = await supabase
        .from('organization_typography')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .single();
      
      setOrganizationTypography(typography);
    } catch (err) {
      console.error('Failed to load theme:', err);
    }
  };
  
  // Load organization branding
  const loadOrganizationBranding = async () => {
    if (!currentOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('organization_branding')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setOrganizationBranding(data);
    } catch (err) {
      console.error('Failed to load branding:', err);
    }
  };
  
  // Load organization layout
  const loadOrganizationLayout = async () => {
    if (!currentOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('organization_layouts')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setOrganizationLayout(data);
    } catch (err) {
      console.error('Failed to load layout:', err);
    }
  };
  
  // Load dashboard widgets
  const loadDashboardWidgets = async () => {
    if (!currentOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_visible', true)
        .order('position_y', { ascending: true })
        .order('position_x', { ascending: true });
      
      if (error) throw error;
      setDashboardWidgets(data || []);
    } catch (err) {
      console.error('Failed to load dashboard widgets:', err);
    }
  };
  
  // Load navigation items
  const loadNavigationItems = async () => {
    if (!currentOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('navigation_items')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .eq('is_visible', true)
        .order('position', { ascending: true });
      
      if (error) throw error;
      setNavigationItems(data || []);
    } catch (err) {
      console.error('Failed to load navigation items:', err);
    }
  };
  
  // Load organization stats
  const loadOrganizationStats = async () => {
    if (!currentOrganization) return;
    
    try {
      const { data, error } = await supabase
        .rpc('get_organization_stats', { 
          p_organization_id: currentOrganization.id 
        });
      
      if (error && error.code !== 'PGRST202') {
        // Function doesn't exist yet, skip
        return;
      }
      setOrganizationStats(data);
    } catch (err) {
      console.error('Failed to load organization stats:', err);
    }
  };
  
  // Load invite codes
  const loadInviteCodes = async () => {
    if (!currentOrganization || !isAdmin) return;
    
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setInviteCodes(data || []);
    } catch (err) {
      console.error('Failed to load invite codes:', err);
    }
  };
  
  // Load signup page configuration
  const loadSignupPage = async () => {
    if (!currentOrganization) return;
    
    try {
      const { data, error } = await supabase
        .from('club_signup_pages')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setSignupPage(data);
    } catch (err) {
      console.error('Failed to load signup page:', err);
    }
  };
  
  const loadUserOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get user's organization memberships
      const { data: memberships, error: membershipError } = await supabase
        .from('organization_members')
        .select(`
          *,
          organizations (*)
        `)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('joined_at', { ascending: false });

      if (membershipError) throw membershipError;

      if (memberships && memberships.length > 0) {
        setUserMemberships(memberships);
        
        // Check if user has a saved current organization preference
        const { data: profile } = await supabase
          .from('profiles')
          .select('current_organization_id')
          .eq('id', user.id)
          .single();

        // Set current organization (preference or first one)
        let targetOrgId = profile?.current_organization_id;
        if (!targetOrgId || !memberships.find(m => m.organization_id === targetOrgId)) {
          targetOrgId = memberships[0].organization_id;
        }

        const targetMembership = memberships.find(m => m.organization_id === targetOrgId);
        if (targetMembership) {
          setCurrentOrganization(targetMembership.organizations as Organization);
        }
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const switchOrganization = async (orgId: string) => {
    try {
      setError(null);
      
      const membership = userMemberships.find(m => m.organization_id === orgId);
      if (!membership) {
        throw new Error('You are not a member of this organization');
      }

      setCurrentOrganization(membership.organizations as Organization);

      // Save user's preference
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ current_organization_id: orgId })
          .eq('id', user.id);
      }
    } catch (err) {
      console.error('Failed to switch organization:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch organization');
    }
  };

  const handleOrganizationDeleted = async () => {
    // Remove from memberships and switch to first available
    const updatedMemberships = userMemberships.filter(
      m => m.organization_id !== currentOrganization?.id
    );
    setUserMemberships(updatedMemberships);
    
    if (updatedMemberships.length > 0) {
      await switchOrganization(updatedMemberships[0].organization_id);
    } else {
      setCurrentOrganization(null);
    }
  };

  // Feature management functions
  const isFeatureEnabled = useCallback((featureKey: string): boolean => {
    return organizationFeatures.some(f => f.feature_key === featureKey && f.enabled);
  }, [organizationFeatures]);
  
  const toggleFeature = async (featureKey: string, enabled: boolean) => {
    if (!currentOrganization || !isAdmin) return;
    
    try {
      if (enabled) {
        const { error } = await supabase
          .from('organization_features')
          .insert({
            organization_id: currentOrganization.id,
            feature_key: featureKey,
            enabled: true,
            enabled_by: (await supabase.auth.getUser()).data.user?.id
          });
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('organization_features')
          .update({ enabled: false })
          .eq('organization_id', currentOrganization.id)
          .eq('feature_key', featureKey);
        
        if (error) throw error;
      }
      
      await loadOrganizationFeatures();
    } catch (err) {
      console.error('Failed to toggle feature:', err);
      throw err;
    }
  };
  
  // Theme management functions
  const updateTheme = async (updates: Partial<OrganizationTheme>) => {
    if (!currentOrganization || !isAdmin) return;
    
    try {
      const { error } = await supabase
        .from('organization_themes')
        .upsert({
          organization_id: currentOrganization.id,
          ...updates,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      await loadOrganizationTheme();
    } catch (err) {
      console.error('Failed to update theme:', err);
      throw err;
    }
  };
  
  const updateTypography = async (updates: Partial<OrganizationTypography>) => {
    if (!currentOrganization || !isAdmin) return;
    
    try {
      const { error } = await supabase
        .from('organization_typography')
        .upsert({
          organization_id: currentOrganization.id,
          ...updates,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      await loadOrganizationTheme();
    } catch (err) {
      console.error('Failed to update typography:', err);
      throw err;
    }
  };
  
  const updateBranding = async (updates: Partial<OrganizationBranding>) => {
    if (!currentOrganization || !isAdmin) return;
    
    try {
      const { error } = await supabase
        .from('organization_branding')
        .upsert({
          organization_id: currentOrganization.id,
          ...updates,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
      await loadOrganizationBranding();
    } catch (err) {
      console.error('Failed to update branding:', err);
      throw err;
    }
  };
  
  // Widget management functions
  const addWidget = async (widget: any) => {
    if (!currentOrganization || !isAdmin) return;
    
    try {
      const { error } = await supabase
        .from('dashboard_widgets')
        .insert({
          organization_id: currentOrganization.id,
          ...widget,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });
      
      if (error) throw error;
      await loadDashboardWidgets();
    } catch (err) {
      console.error('Failed to add widget:', err);
      throw err;
    }
  };
  
  const updateWidget = async (widgetId: string, updates: any) => {
    if (!currentOrganization || !isAdmin) return;
    
    try {
      const { error } = await supabase
        .from('dashboard_widgets')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', widgetId)
        .eq('organization_id', currentOrganization.id);
      
      if (error) throw error;
      await loadDashboardWidgets();
    } catch (err) {
      console.error('Failed to update widget:', err);
      throw err;
    }
  };
  
  const removeWidget = async (widgetId: string) => {
    if (!currentOrganization || !isAdmin) return;
    
    try {
      const { error } = await supabase
        .from('dashboard_widgets')
        .delete()
        .eq('id', widgetId)
        .eq('organization_id', currentOrganization.id);
      
      if (error) throw error;
      await loadDashboardWidgets();
    } catch (err) {
      console.error('Failed to remove widget:', err);
      throw err;
    }
  };
  
  // Invite code management
  const createInviteCode = async (inviteData: any) => {
    if (!currentOrganization || !isAdmin) return;
    
    try {
      const { data, error } = await supabase
        .from('invite_codes')
        .insert({
          organization_id: currentOrganization.id,
          ...inviteData,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      await loadInviteCodes();
      return data;
    } catch (err) {
      console.error('Failed to create invite code:', err);
      throw err;
    }
  };
  
  const value: OrganizationContextType = {
    // Core organization data
    currentOrganization,
    userMemberships,
    switchOrganization,
    userRole,
    isAdmin,
    isModerator,
    isOwner,
    isMember,
    isPlatformAdmin,
    isSuperAdmin,
    loading,
    error,
    
    // Multi-tenant features
    organizationFeatures,
    featureCatalog,
    organizationTheme,
    organizationTypography,
    organizationBranding,
    organizationLayout,
    inviteCodes,
    signupPage,
    dashboardWidgets,
    navigationItems,
    platformAdmin,
    organizationStats,
    
    // Feature management
    isFeatureEnabled,
    toggleFeature,
    
    // Theme management
    updateTheme,
    updateTypography,
    updateBranding,
    
    // Widget management
    addWidget,
    updateWidget,
    removeWidget,
    
    // Invite management
    createInviteCode,
    
    // Refresh functions
    refreshOrganization: loadUserOrganizations,
    refreshFeatures: loadOrganizationFeatures,
    refreshTheme: loadOrganizationTheme,
    refreshWidgets: loadDashboardWidgets
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};
