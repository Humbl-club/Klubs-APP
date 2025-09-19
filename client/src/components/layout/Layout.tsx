import React, { memo, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useViewport } from '@/hooks/use-mobile';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { Navigation } from './Navigation';
import { SimpleNavigation } from './SimpleNavigation';
import { SidebarTrigger, SidebarProvider } from '@/components/ui/sidebar';
import AppSidebar from '@/components/app-sidebar/AppSidebar';
import { MobileLoading } from '@/components/ui/mobile-loading';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { iPadLayout as IPadLayout } from '@/components/ipad';
import { UserThemeController } from '@/components/theme/UserThemeController';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = memo(({ children }) => {
  const { user, loading } = useAuth();
  const { isMobile, isTablet } = useViewport();
  const { isTablet: isTabletOptimized, isDesktop } = useMobileOptimization();
  const location = useLocation();
  const [profile, setProfile] = useState<any>(null);
  
  // Show header only on dashboard/home routes
  const showHeader = location.pathname === '/' || location.pathname === '/dashboard';

  useEffect(() => {
    const fetchProfile = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();
        
        setProfile(data || user.user_metadata);
      }
    };

    fetchProfile();
  }, [user?.id, user?.user_metadata]);

  // Apply compact density on mobile for a more elegant, tighter UI
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-density', isMobile ? 'compact' : 'comfortable');
  }, [isMobile]);

  if (loading) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center bg-atelier-hero safe-area-layout",
        "pt-[env(safe-area-inset-top,0px)]"
      )}>
        <MobileLoading 
          variant="ios"
          size={isMobile ? "md" : "lg"}
          text="Loading your experience..."
          className="glass-card rounded-xl p-8 max-w-sm mobile:max-w-xs mobile:p-6"
        />
      </div>
    );
  }

  const getLayoutPadding = () => {
    if (isMobile) return 'pb-24 pt-4'; // No header, just bottom navigation
    if (isTablet) return 'pt-4'; // Sidebar handles left spacing
    return 'pt-4'; // Sidebar handles left spacing
  };

  const getMainPadding = () => {
    if (isMobile) return 'px-4 py-4';
    if (isTablet) return 'px-6 py-6';
    return 'px-8 py-8';
  };

  // Use the new unified mobile-first layout system with glass effects
  return (
    <div className={cn(
      "min-h-screen bg-background text-foreground",
      "pt-[env(safe-area-inset-top,0px)]",
      getLayoutPadding()
    )}>
      {/* User theme controller for authenticated users */}
      <UserThemeController />
      
      <a href="#main-content" className="sr-only focus:not-sr-only fixed top-2 left-2 z-50 px-3 py-2 rounded-md bg-background text-foreground ring-2 ring-primary">Skip to content</a>
      {isMobile ? (
        <>
          <SimpleNavigation />
          <main id="main-content" className={cn(
            `responsive-container max-w-7xl mx-auto ${getMainPadding()}`,
            "px-[env(safe-area-inset-left,0px)]",
            "pr-[env(safe-area-inset-right,0px)]"
          )}>
            <div className="pull-refresh-indicator" />
            {children}
          </main>
        </>
      ) : (isTabletOptimized || isDesktop) ? (
        // iPad/Tablet: Custom iPad Layout
        <IPadLayout profile={profile}>
          {children}
        </IPadLayout>
      ) : (
        // Desktop: Shadcn Sidebar layout
        <SidebarProvider>
          <div className="flex w-full">
            <AppSidebar />
            <div className="flex-1 min-w-0">
              {/* Removed EditorialMasthead */}
              <main id="main-content" className={cn(
                `responsive-container max-w-7xl mx-auto ${getMainPadding()} animate-fade-in`,
                "px-[env(safe-area-inset-left,0px)]",
                "pr-[env(safe-area-inset-right,0px)]"
              )}>
                <div className="pull-refresh-indicator" />
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      )}
    </div>
  );
});
