import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/components/auth/AuthProvider';
import { useViewport } from '@/hooks/use-mobile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { cn } from '@/lib/utils';

import { 
  User, 
  Settings, 
  LogOut,
  Shield,
  QrCode,
  MessageCircle,
  Crown,
  Building2,
  UserPlus,
  ArrowLeftRight,
  type LucideIcon
} from 'lucide-react';
import { useGestures } from '@/hooks/useGestures';
import { useOrganization } from '@/contexts/OrganizationContext';

interface ProfileDropdownProps {
  profile?: {
    full_name?: string;
    avatar_url?: string;
  };
}

interface MenuItem {
  href: string;
  icon: LucideIcon;
  label: string;
  description: string;
  group: 'main' | 'admin' | 'tools';
  badge?: string;
}

export const ProfileDropdown: React.FC<ProfileDropdownProps> = ({ profile }) => {
  const { signOut, isAdmin, isSuperAdmin, isOrganizationAdmin } = useAuth();
  const { currentOrganization } = useOrganization();
  const location = useLocation();
  const haptics = useHapticFeedback();
  const { isMobile, isTablet, isDesktop } = useViewport();
  const [isOpen, setIsOpen] = useState(false);


  // Draggable floating trigger (long-press to move on mobile)
  const [dragging, setDragging] = useState(false);
  const [basePos, setBasePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const { ref, swipeState } = useGestures({
    onLongPress: () => {
      if (isMobile) {
        setDragging(true);
      }
    }
  });

  // Load saved position
  useEffect(() => {
    try {
      const saved = localStorage.getItem('profileFabPos');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          setBasePos(parsed);
        }
      }
    } catch {}
  }, []);

  // Persist position when drag ends
  useEffect(() => {
    if (!swipeState.isActive && dragging) {
      const newPos = {
        x: basePos.x + swipeState.deltaX,
        y: basePos.y + swipeState.deltaY,
      };
      setBasePos(newPos);
      try {
        localStorage.setItem('profileFabPos', JSON.stringify(newPos));
      } catch {}
      setDragging(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swipeState.isActive]);

  const translateX = dragging ? basePos.x + swipeState.deltaX : basePos.x;
  const translateY = dragging ? basePos.y + swipeState.deltaY : basePos.y;

  const getInitials = (name?: string) => {
    return name?.split(' ').map(n => n[0]).join('') || 'AC';
  };

  const getFirstName = (name?: string) => {
    return name?.split(' ')[0] || 'Alexandra';
  };

  const isActive = (path: string) => location.pathname === path;

  // Complete menu items with proper TypeScript types
  const menuItems: MenuItem[] = [
    { 
      href: '/profile', 
      icon: User, 
      label: 'Profile', 
      description: 'View and edit your profile',
      group: 'main'
    },
    { 
      href: '/messages', 
      icon: MessageCircle, 
      label: 'Messages', 
      description: 'Chat with community members',
      group: 'main',
      badge: '2' // Example unread count
    },
  ];

  // Add organization admin items
  if (isOrganizationAdmin) {
    menuItems.push(
      { 
        href: '/admin/organization', 
        icon: Building2, 
        label: 'Organization Settings', 
        description: 'Manage your organization',
        group: 'admin'
      },
      { 
        href: '/admin/invites', 
        icon: UserPlus, 
        label: 'Invite Members', 
        description: 'Grow your community',
        group: 'admin'
      },
      {
        href: '/organization/switch',
        icon: ArrowLeftRight,
        label: 'Switch Organization',
        description: 'Change active organization',
        group: 'admin'
      }
    );
  }
  
  // Add admin items if user is admin
  if (isAdmin) {
    menuItems.push({ 
      href: '/admin', 
      icon: Shield, 
      label: 'Admin Panel', 
      description: 'Manage the community',
      group: 'admin'
    });
  }
  
  // Add super admin for platform owner
  if (isSuperAdmin) {
    menuItems.push({ 
      href: '/super-admin', 
      icon: Crown, 
      label: 'Platform Admin', 
      description: 'Platform administration',
      group: 'admin'
    });
  }

  // Secondary/tool items
  const secondaryItems: MenuItem[] = [
    { 
      href: '/qr-scanner', 
      icon: QrCode, 
      label: 'Scan QR Code', 
      description: 'Mark event attendance and earn points',
      group: 'tools'
    },
    { 
      href: '/settings', 
      icon: Settings, 
      label: 'Settings', 
      description: 'Customize your experience',
      group: 'tools'
    },
  ];

  // Responsive positioning and sizing based on viewport
  const getDropdownProps = () => {
    if (isMobile) {
      return {
        side: "top" as const,
        align: "center" as const,
        sideOffset: 20,
        className: "profile-dropdown-mobile"
      };
    } else if (isTablet) {
      return {
        side: "right" as const,
        align: "start" as const,
        sideOffset: 16,
        className: "profile-dropdown-tablet"
      };
    }
    return {
      side: "right" as const,
      align: "start" as const,
      sideOffset: 20,
      className: "profile-dropdown-desktop"
    };
  };

  const dropdownProps = getDropdownProps();

  // Handle dropdown open/close with haptic feedback
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      haptics.impact('light');
    }
  };

  // Handle menu item selection
  const handleMenuItemClick = () => {
    haptics.tap();
    setIsOpen(false);
  };

  // Handle sign out with confirmation haptic
  const handleSignOut = () => {
    haptics.impact('heavy');
    signOut();
    setIsOpen(false);
  };

  // Render menu item component
  const renderMenuItem = (item: MenuItem) => {
    const IconComponent = item.icon;
    
    return (
      <DropdownMenuItem key={item.href} asChild>
        <Link 
          to={item.href}
          onClick={handleMenuItemClick}
          className={`
            flex items-center gap-4 p-4 rounded-2xl cursor-pointer 
            min-h-[64px] transition-all duration-300 hover:scale-[1.02]
            border border-transparent relative group
            ${isActive(item.href) 
              ? 'bg-primary/20 text-primary border-primary/30 shadow-lg ring-1 ring-primary/20' 
              : 'hover:bg-primary/10 active:bg-primary/15 hover:border-primary/20'
            }
          `}
        >
          <div className={`
            w-12 h-12 rounded-2xl flex items-center justify-center transition-all
            ${isActive(item.href) 
              ? 'bg-primary/30 text-primary shadow-lg' 
              : 'bg-muted/30 group-hover:bg-primary/20'
            }
          `}>
            <IconComponent className="w-6 h-6" strokeWidth={isActive(item.href) ? 2.5 : 2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate">{item.label}</span>
              {item.badge && (
                <Badge variant="secondary" className="text-xs bg-red-500 text-white px-1.5 py-0.5 min-w-[18px] h-[18px] flex items-center justify-center">
                  {item.badge}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
          </div>
        </Link>
      </DropdownMenuItem>
    );
  };

  return (
    <div
      ref={ref as unknown as React.RefObject<HTMLDivElement>}
      className={`fixed z-50 ${isMobile ? 'bottom-28 left-5' : isTablet ? 'bottom-6 left-6' : 'bottom-8 left-8'}`}
      style={{ transform: `translate(${translateX}px, ${translateY}px)` }}
    >
      <DropdownMenu open={isOpen} onOpenChange={handleOpenChange}>
        <DropdownMenuTrigger asChild>
          <button 
            className={`
              glass-button-enhanced rounded-full flex items-center justify-center 
              shadow-2xl border-2 transition-all duration-500 group
              bg-background/95 hover:bg-primary/15 hover:scale-110 active:scale-95 
              ring-2 ring-primary/20 hover:ring-primary/40 backdrop-blur-3xl
              focus:outline-none focus:ring-4 focus:ring-primary/30
              ${isMobile ? 'w-16 h-16' : isTablet ? 'w-14 h-14' : 'w-16 h-16'}
              ${isOpen ? 'scale-110 ring-primary/50 shadow-3xl' : ''}
            `}
            aria-label="Open profile menu"
            aria-expanded={isOpen}
            style={{ pointerEvents: dragging ? 'none' : 'auto' }}
          >
            <Avatar className={`ring-2 ring-primary/30 shadow-lg transition-all duration-300 group-hover:ring-primary/50 ${isMobile ? 'w-14 h-14' : isTablet ? 'w-12 h-12' : 'w-14 h-14'}`}>
              <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
              <AvatarFallback className="bg-gradient-to-br from-primary/40 to-secondary/40 text-sm font-bold">
                {getInitials(profile?.full_name)}
              </AvatarFallback>
            </Avatar>
            {/* Online status indicator */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background shadow-sm animate-pulse"></div>
            {/* Subtle glow effect when hovered */}
            <div className="absolute inset-0 rounded-full bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"></div>
          </button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          {...dropdownProps}
          className={`
            ${dropdownProps.className}
            w-80 glass-modal-enhanced border-2 bg-background/98 backdrop-blur-3xl 
            shadow-2xl rounded-3xl p-4 border-border/40 
            animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2
            data-[state=closed]:animate-out data-[state=closed]:fade-out-0 
            data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-bottom-2
            duration-300 z-[60]
          `}
          avoidCollisions={true}
          collisionPadding={16}
        >
          {/* Enhanced Profile Header */}
          <DropdownMenuLabel className="px-2 py-4 mb-3">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-14 h-14 ring-2 ring-primary/30 shadow-lg">
                  <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/40 to-secondary/40 text-sm font-bold">
                    {getInitials(profile?.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background shadow-sm"></div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-base truncate">
                    {profile?.full_name || 'Alexandra Collins'}
                  </h3>
                  {isAdmin && (
                    <Crown className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  Welcome back, {getFirstName(profile?.full_name)}!
                </p>
                {currentOrganization && (
                  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                    {currentOrganization.name}
                  </Badge>
                )}
              </div>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator className="my-3 bg-border/60" />
          
          {/* Main Menu Items */}
          <div className="space-y-1">
            {menuItems.map(renderMenuItem)}
          </div>
          
          {secondaryItems.length > 0 && (
            <>
              <DropdownMenuSeparator className="my-3 bg-border/60" />
              
              {/* Secondary Tool Items */}
              <div className="space-y-1">
                {secondaryItems.map(renderMenuItem)}
              </div>
            </>
          )}
          
          <DropdownMenuSeparator className="my-3 bg-border/60" />
          
          {/* Sign Out Button */}
          <DropdownMenuItem asChild>
            <button 
              onClick={handleSignOut}
              className="
                flex items-center gap-4 p-4 rounded-2xl cursor-pointer w-full text-left 
                text-destructive hover:bg-destructive/10 active:bg-destructive/15 
                min-h-[64px] transition-all duration-300 hover:scale-[1.02]
                border border-transparent hover:border-destructive/20 group
              "
            >
              <div className="w-12 h-12 rounded-2xl bg-destructive/20 flex items-center justify-center group-hover:bg-destructive/30 transition-colors">
                <LogOut className="w-6 h-6" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">Sign Out</div>
                <div className="text-xs text-muted-foreground mt-0.5">Securely sign out of your account</div>
              </div>
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};