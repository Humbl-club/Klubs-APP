import React, { memo } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { useDashboardData } from '@/hooks/useDashboardData';
import { ModularDashboard } from '@/components/modular/ModularDashboard';

const MobileDashboard: React.FC = memo(() => {
  const { user } = useAuth();
  const { profile } = useDashboardData(user?.id);
  return (
    <div className="mobile-app-container bg-background px-4" style={{ paddingTop: '16px', paddingBottom: '100px' }}>
      <header className="py-2 mb-2">
        <h1 className="text-2xl font-bold tracking-tight">Hey, {profile?.full_name?.split(' ')[0] || 'Friend'} ✨</h1>
        <p className="text-sm text-muted-foreground">Make today count.</p>
      </header>
      <ModularDashboard />
      <div className="h-20" />
    </div>
  )
});

export default MobileDashboard;
