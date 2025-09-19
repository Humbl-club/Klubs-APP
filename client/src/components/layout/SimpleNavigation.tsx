import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Home, Calendar, Users, MessageCircle, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCartCount } from '@/hooks/useCartCount'
import { useOrganization } from '@/contexts/OrganizationContext'

const TABS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/events', label: 'Events', icon: Calendar },
  { href: '/social', label: 'Community', icon: Users },
  { href: '/messages', label: 'Messages', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: User },
]

export const SimpleNavigation: React.FC = () => {
  const location = useLocation()
  const isActive = (path: string) => location.pathname === path
  const cartCount = useCartCount()
  const { isFeatureEnabled } = useOrganization()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[9999] glass-nav border-t border-border/40 text-foreground">
      <div className="grid grid-cols-5 gap-0 px-2 py-3">
        {TABS.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            to={href}
            className={cn(
              'flex flex-col items-center justify-center p-2 rounded-lg transition-colors',
              isActive(href) ? 'text-primary bg-primary/12' : 'text-foreground/80 hover:text-foreground hover:bg-muted/60'
            )}
          >
            <div className="relative">
              <Icon className="w-6 h-6 mb-1" strokeWidth={isActive(href) ? 2.5 : 2} />
              {href === '/events' && isFeatureEnabled('commerce') && cartCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
            <span className="text-[11px] font-medium">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
