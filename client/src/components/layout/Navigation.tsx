import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { useViewport } from '@/hooks/use-mobile';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Users, 
  Calendar, 
  Trophy, 
  User, 
  Settings, 
  LogOut,
  Shield,
  MoreHorizontal,
  X,
  MessageCircle,
  QrCode,
  Plus,
  Building2,
  CheckCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OrganizationAdminDropdown } from '@/components/admin/OrganizationAdminDropdown';
import { OrganizationSwitcher } from '@/components/organization/OrganizationSwitcher';
import { ProfileDropdown } from './ProfileDropdown';
import { MessagingOverlay } from '@/components/messaging/MessagingOverlay';
import { useMessaging } from '@/hooks/useMessaging';
import { useOrganization } from '@/contexts/OrganizationContext';

interface NavigationProps {
  profile?: {
    full_name?: string;
    avatar_url?: string;
  };
}

export const Navigation: React.FC<NavigationProps> = ({ profile }) => {
  const { user, signOut, isAdmin, isSuperAdmin, isOrganizationAdmin } = useAuth();
  const { currentOrganization, isFeatureEnabled } = useOrganization();
  const location = useLocation();
  const { isMobile, isTablet, isDesktop } = useViewport();
  const haptics = useHapticFeedback();
  const [showMessaging, setShowMessaging] = useState(false);
  const [showOrgAdmin, setShowOrgAdmin] = useState(false);
  const { totalUnreadCount } = useMessaging();

  // Force re-render and ensure navigation is always visible
  React.useEffect(() => {
    console.log('Navigation render state:', { isMobile, isTablet, isDesktop, width: window.innerWidth });
  }, [isMobile, isTablet, isDesktop]);

  // Feature-gated navigation items
  const navItems = [
    { href: '/dashboard', icon: Home, label: 'Home', feature: undefined },
    { href: '/social', icon: Users, label: 'Community', feature: 'social' },
    { href: '/events', icon: Calendar, label: 'Events', feature: 'events' },
    { href: '/challenges', icon: Trophy, label: 'Wellness', feature: 'challenges' },
  ].filter(item => !item.feature || isFeatureEnabled(item.feature));

  const secondaryNavItems = [
    { href: '/messages', icon: MessageCircle, label: 'Messages', feature: 'messaging' },
    { href: '/my/registrations', icon: CheckCircle, label: 'My Events', feature: undefined },
  ].filter(item => !item.feature || isFeatureEnabled(item.feature));

  if (isAdmin) {
    secondaryNavItems.push({ href: '/admin', icon: Shield, label: 'Admin' });
  }

  const isActive = (path: string) => location.pathname === path;

  // Always render navigation - fallback to mobile if detection fails
  const shouldRenderMobile = isMobile || window.innerWidth < 768;
  const shouldRenderTablet = !shouldRenderMobile && (isTablet || (window.innerWidth >= 768 && window.innerWidth < 1024));
  const shouldRenderDesktop = !shouldRenderMobile && !shouldRenderTablet;

  // Mobile Navigation - Simple and highly visible
  if (shouldRenderMobile) {
    return (
      <>
        {/* Simple, highly visible mobile navigation - NO TOP BAR */}
        <nav className="fixed bottom-0 left-0 right-0 z-[9999] glass-nav border-t border-border/40 text-foreground">
          <div className="grid grid-cols-4 gap-0 px-2 py-3">
            {navItems.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                to={href}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-lg transition-colors",
                  isActive(href)
                    ? 'text-primary bg-primary/12'
                    : 'text-foreground/80 hover:text-foreground hover:bg-muted/60'
                )}
              >
                <Icon className="w-6 h-6 mb-1" strokeWidth={isActive(href) ? 2.5 : 2} />
                <span className="text-xs font-medium">
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </nav>
        
        {/* Floating action buttons */}
        <div className="fixed bottom-20 right-4 z-[9999] flex flex-col gap-3">
          {/* Organization Admin Button (Club Owners) */}
          {isOrganizationAdmin && (
            <DropdownMenu open={showOrgAdmin} onOpenChange={setShowOrgAdmin}>
              <DropdownMenuTrigger asChild>
                <button className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="left" align="end" className="w-auto mb-2">
                <OrganizationAdminDropdown />
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Super Admin Button (YOU - Platform Owner) */}
          {isSuperAdmin && (
            <Link 
              to="/super-admin"
              className="w-12 h-12 bg-purple-600 text-white rounded-full shadow-lg flex items-center justify-center"
            >
              <Shield className="w-5 h-5" />
            </Link>
          )}

          {/* Messages Button */}
          <button
            onClick={() => setShowMessaging(true)}
            className="w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center"
          >
            <MessageCircle className="w-5 h-5" />
            {totalUnreadCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
              </span>
            )}
          </button>
        </div>
        
        <MessagingOverlay 
          isOpen={showMessaging} 
          onClose={() => setShowMessaging(false)} 
        />
        
        {/* Profile Dropdown (Draggable on long-press) */}
        <ProfileDropdown profile={profile || user?.user_metadata || {}} />
      </>
    );
  }

  // Enhanced Tablet Navigation with Labels and Improved UX
  if (shouldRenderTablet) {
    return (
      <nav className="fixed top-0 left-0 w-20 h-full z-50">
        <div className="glass-nav h-full border-r border-border/20 flex flex-col bg-background/95 backdrop-blur-xl">
          {/* Enhanced Tablet Logo with Org Switcher */}
          <div className="p-4 border-b border-border/20">
            {currentOrganization ? (
              <OrganizationSwitcher compact />
            ) : (
              <Link to="/organization/new" className="block">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg relative overflow-hidden hover:scale-105 transition-transform">
                  <Plus className="text-white w-6 h-6" />
                </div>
              </Link>
            )}
          </div>

          {/* Enhanced Navigation Items with Better Spacing */}
          <div className="flex-1 flex flex-col space-y-3 p-3 mt-6">
            {[...navItems, ...secondaryNavItems].map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                to={href}
                title={label}
                className={cn(
                  "flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all duration-200 group relative overflow-hidden",
                  isActive(href)
                    ? 'bg-primary/20 text-primary backdrop-blur-md shadow-lg border border-primary/30'
                    : 'text-foreground/80 hover:text-foreground hover:bg-background/60 hover:backdrop-blur-sm hover:shadow-md'
                )}
                onClick={() => haptics.tap()}
              >
                {isActive(href) && (
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl" />
                )}
                <Icon className="w-6 h-6 relative z-10 transition-transform group-hover:scale-110" strokeWidth={isActive(href) ? 2.5 : 2} />
                <span className="text-[10px] font-medium tracking-wide text-center leading-none relative z-10 mt-1">
                  {label}
                </span>
                {isActive(href) && (
                  <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-primary rounded-full shadow-md" />
                )}
              </Link>
            ))}
          </div>

          {/* Enhanced Tablet Actions */}
          <div className="p-3 border-t border-border/20 space-y-2">
            <Link
              to="/settings"
              title="Settings"
              className="flex flex-col items-center justify-center w-14 h-14 rounded-xl text-foreground/80 hover:text-foreground hover:bg-background/60 hover:backdrop-blur-sm transition-all duration-200 group"
              onClick={() => haptics.tap()}
            >
              <Settings className="w-5 h-5 transition-transform group-hover:rotate-90" />
              <span className="text-[10px] font-medium tracking-wide mt-1">Settings</span>
            </Link>
            
            <Button
              variant="ghost"
              size="sm"
              title="Logout"
              onClick={() => {
                haptics.tap();
                signOut();
              }}
              className="flex flex-col items-center justify-center w-14 h-14 p-0 rounded-xl text-foreground/80 hover:text-destructive hover:bg-destructive/10 hover:backdrop-blur-sm transition-all duration-200 group"
            >
              <LogOut className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              <span className="text-[10px] font-medium tracking-wide mt-1">Logout</span>
            </Button>
          </div>
        </div>
      </nav>
    );
  }

  // Desktop Navigation (Full Glass Experience) - Default fallback
  return (
    <nav className="fixed top-0 left-0 w-20 h-full z-50">
      <div className="glass-nav h-full border-r border-border/20 flex flex-col">
        {/* Desktop Logo with Org Switcher */}
        <div className="p-4 border-b border-border/20">
          {currentOrganization ? (
            <OrganizationSwitcher compact />
          ) : (
            <div className="w-12 h-12 mx-auto bg-gradient-to-br from-editorial-charcoal via-editorial-navy to-editorial-charcoal rounded-xl flex items-center justify-center shadow-xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent" />
              <span className="text-white font-bold text-xl tracking-tight relative z-10">H</span>
            </div>
          )}
        </div>

        {/* Navigation Items with Premium Glass Effect */}
        <div className="flex-1 flex flex-col space-y-3 p-3 mt-6">
          {[...navItems, ...secondaryNavItems].map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              to={href}
              className={cn(
                "flex flex-col items-center space-y-2 p-3 rounded-xl transition-all duration-200 group relative overflow-hidden",
                isActive(href)
                  ? 'bg-primary/20 text-primary backdrop-blur-md shadow-lg border border-primary/30'
                  : 'text-foreground/80 hover:text-foreground hover:bg-background/60 hover:backdrop-blur-sm hover:shadow-md'
              )}
            >
              {isActive(href) && (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl" />
              )}
              <Icon className="w-5 h-5 relative z-10 transition-transform group-hover:scale-110" strokeWidth={isActive(href) ? 2.5 : 2} />
              <span className="text-xs font-medium tracking-wide text-center leading-none relative z-10">
                {label}
              </span>
              {isActive(href) && (
                <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-1 h-8 bg-primary rounded-full shadow-md" />
              )}
            </Link>
          ))}
        </div>

        {/* Desktop Actions with Glass Effects */}
        <div className="p-3 border-t border-border/20 space-y-2">
          <Link
            to="/settings"
            className="flex flex-col items-center space-y-1 p-3 rounded-xl text-foreground/80 hover:text-foreground hover:bg-background/60 hover:backdrop-blur-sm transition-all duration-200 group"
          >
            <Settings className="w-5 h-5 transition-transform group-hover:rotate-90" />
            <span className="text-xs font-medium tracking-wide">Settings</span>
          </Link>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut()}
            className="flex flex-col items-center space-y-1 p-3 w-full rounded-xl text-foreground/80 hover:text-destructive hover:bg-destructive/10 hover:backdrop-blur-sm transition-all duration-200 group"
          >
            <LogOut className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            <span className="text-xs font-medium tracking-wide">Logout</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};
