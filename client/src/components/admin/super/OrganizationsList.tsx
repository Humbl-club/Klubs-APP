import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useOrganizationList } from '@/hooks/useOrganizationList';
import {
  Building2,
  Users,
  DollarSign,
  Activity,
  MoreVertical,
  Eye,
  Ban,
  CheckCircle,
  AlertTriangle,
  Clock,
  Shield,
  Star,
  Zap,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface OrganizationsListProps {
  searchTerm?: string;
}

export const OrganizationsList: React.FC<OrganizationsListProps> = ({ searchTerm = '' }) => {
  const { organizations, loading, suspendOrganization, activateOrganization, metrics } = useOrganizationList(searchTerm);
  const [selectedOrg, setSelectedOrg] = useState<string | null>(null);

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    if (score >= 40) return 'from-orange-500 to-red-500';
    return 'from-red-600 to-red-800';
  };

  const getHealthIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (score >= 60) return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    return <AlertTriangle className="w-4 h-4 text-red-400" />;
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'enterprise': return <Shield className="w-4 h-4 text-purple-400" />;
      case 'professional': return <Star className="w-4 h-4 text-blue-400" />;
      default: return <Zap className="w-4 h-4 text-green-400" />;
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  const getActivityStatus = (lastActivity: string | null) => {
    if (!lastActivity) return { label: 'Never', color: 'text-gray-400' };
    
    const hoursAgo = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60));
    
    if (hoursAgo < 1) return { label: 'Active now', color: 'text-green-400' };
    if (hoursAgo < 24) return { label: `${hoursAgo}h ago`, color: 'text-green-400' };
    if (hoursAgo < 48) return { label: 'Yesterday', color: 'text-yellow-400' };
    if (hoursAgo < 168) return { label: `${Math.floor(hoursAgo / 24)}d ago`, color: 'text-orange-400' };
    return { label: `${Math.floor(hoursAgo / 168)}w ago`, color: 'text-red-400' };
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white/5 border-white/10 animate-pulse">
            <CardHeader>
              <div className="h-6 bg-white/10 rounded w-3/4" />
              <div className="h-4 bg-white/10 rounded w-1/2 mt-2" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-8 bg-white/10 rounded" />
                <div className="h-4 bg-white/10 rounded" />
                <div className="h-4 bg-white/10 rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-400/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60">Total</p>
                <p className="text-2xl font-bold text-white">{metrics.totalOrgs}</p>
              </div>
              <Building2 className="w-8 h-8 text-blue-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-400/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60">Active</p>
                <p className="text-2xl font-bold text-white">{metrics.activeOrgs}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/20 to-red-600/20 border-red-400/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60">Suspended</p>
                <p className="text-2xl font-bold text-white">{metrics.suspendedOrgs}</p>
              </div>
              <Ban className="w-8 h-8 text-red-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-400/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60">Revenue</p>
                <p className="text-xl font-bold text-white">{formatCurrency(metrics.totalRevenue)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-400/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-yellow-400/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-white/60">Avg Health</p>
                <p className="text-2xl font-bold text-white">{metrics.avgHealthScore}%</p>
              </div>
              <Activity className="w-8 h-8 text-yellow-400/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {organizations.map((org, index) => (
            <motion.div
              key={org.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => setSelectedOrg(selectedOrg === org.id ? null : org.id)}
            >
              <Card 
                className={`relative overflow-hidden bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 cursor-pointer`}
              >
                {/* Health Score Gradient Bar */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getHealthColor(org.health_score)}`} />
                
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/10 rounded-lg">
                        {getTierIcon(org.subscription_tier)}
                      </div>
                      <div>
                        <CardTitle className="text-white text-lg flex items-center gap-2">
                          {org.name}
                          {!org.is_active && (
                            <Badge className="bg-red-500/20 text-red-300 text-xs">
                              Suspended
                            </Badge>
                          )}
                        </CardTitle>
                        <p className="text-xs text-white/50">{org.owner.email}</p>
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" className="text-white/60 hover:text-white">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-900 border-white/10">
                          <DropdownMenuLabel className="text-white/60">Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem className="text-white hover:bg-white/10">
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {org.is_active ? (
                            <DropdownMenuItem 
                              className="text-orange-400 hover:bg-orange-500/10"
                              onClick={() => suspendOrganization(org.id)}
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Suspend
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem 
                              className="text-green-400 hover:bg-green-500/10"
                              onClick={() => activateOrganization(org.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Activate
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem 
                            className="text-red-400 hover:bg-red-500/10"
                            onClick={async (e) => {
                              e.stopPropagation();
                              const confirmText = window.prompt(`Type PURGE to permanently delete ${org.name}`);
                              if (confirmText !== 'PURGE') return;
                              try {
                                const { error } = await supabase.functions.invoke('purge-organization', { body: { organizationId: org.id, confirm: 'PURGE' } });
                                if (error) throw error;
                                // Optimistic UI: hide card
                                setSelectedOrg(null);
                              } catch (err) {
                                console.error('Purge failed', err);
                                alert('Purge failed: ' + (err as any)?.message || 'Unknown error');
                              }
                            }}
                          >
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Purge (Danger)
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Health Score */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-white/60 flex items-center gap-1">
                        {getHealthIcon(org.health_score)}
                        Health Score
                      </span>
                      <span className="text-sm font-bold text-white">{org.health_score}%</span>
                    </div>
                    <Progress value={org.health_score} className="h-2" />
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <Users className="w-4 h-4 text-white/40" />
                        <span className="text-lg font-semibold text-white">{org.member_count}</span>
                      </div>
                      <p className="text-xs text-white/50 mt-1">Members</p>
                    </div>

                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <DollarSign className="w-4 h-4 text-white/40" />
                        <span className="text-lg font-semibold text-white">
                          {formatCurrency(org.monthly_revenue).split('.')[0]}
                        </span>
                      </div>
                      <p className="text-xs text-white/50 mt-1">Monthly</p>
                    </div>
                  </div>

                  {/* Activity Status */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <Badge className="bg-white/10 text-white/80 capitalize">
                      {org.subscription_tier}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-white/40" />
                      <span className={`text-xs ${getActivityStatus(org.last_activity).color}`}>
                        {getActivityStatus(org.last_activity).label}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {organizations.length === 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-12 text-center">
            <Building2 className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No organizations found</p>
            <p className="text-white/40 text-sm mt-2">
              {searchTerm ? 'Try adjusting your search' : 'Organizations will appear here'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
