import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { 
  Plus,
  QrCode,
  Copy,
  Users,
  Calendar,
  Settings,
  Trash2,
  Edit,
  Share,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  UserPlus,
  Link,
  RefreshCcw as RefreshIcon
} from 'lucide-react';
import { useOrganization } from '../../contexts/OrganizationContext';
import { supabase } from '../../integrations/supabase/client';
import { useMobileFirst } from '../../hooks/useMobileFirst';

interface InviteCode {
  id: string;
  code: string;
  type: string;
  max_uses?: number;
  current_uses: number;
  expires_at?: string;
  default_role: string;
  custom_welcome_message?: string;
  source?: string;
  campaign?: string;
  qr_code_url?: string;
  created_at: string;
  last_used_at?: string;
  created_by?: string;
}

export const InviteCodeManager: React.FC = () => {
  const { isMobile } = useMobileFirst();
  const { currentOrganization, isAdmin } = useOrganization();
  
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const [newInvite, setNewInvite] = useState({
    type: 'permanent',
    max_uses: '',
    expires_at: '',
    default_role: 'member',
    custom_welcome_message: '',
    source: '',
    campaign: ''
  });

  // Load invite codes
  useEffect(() => {
    if (currentOrganization?.id && isAdmin) {
      loadInviteCodes();
    }
  }, [currentOrganization?.id, isAdmin]);

  const loadInviteCodes = async () => {
    if (!currentOrganization?.id) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInviteCodes(data || []);
    } catch (err) {
      console.error('Failed to load invite codes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invite codes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!currentOrganization?.id || !isAdmin) {
      setError('Only admins can create invite codes');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const inviteData: any = {
        organization_id: currentOrganization.id,
        type: newInvite.type,
        default_role: newInvite.default_role,
        created_by: user.id,
        custom_welcome_message: newInvite.custom_welcome_message || null,
        source: newInvite.source || null,
        campaign: newInvite.campaign || null
      };

      // Add type-specific fields
      if (newInvite.type === 'limited' && newInvite.max_uses) {
        inviteData.max_uses = parseInt(newInvite.max_uses);
      } else if (newInvite.type === 'one-time') {
        inviteData.max_uses = 1;
      }

      if (newInvite.expires_at) {
        inviteData.expires_at = new Date(newInvite.expires_at).toISOString();
      } else {
        // Apply org default auto-expiration if configured
        const defaultDays = (currentOrganization?.settings as any)?.invites?.auto_expire_days || 0;
        if (defaultDays > 0) {
          inviteData.expires_at = new Date(Date.now() + defaultDays * 24 * 60 * 60 * 1000).toISOString();
        }
      }

      const { error } = await supabase
        .from('invite_codes')
        .insert(inviteData);

      if (error) throw error;

      setSuccess('Invite code created successfully!');
      setShowCreateDialog(false);
      setNewInvite({
        type: 'permanent',
        max_uses: '',
        expires_at: '',
        default_role: 'member',
        custom_welcome_message: '',
        source: '',
        campaign: ''
      });
      await loadInviteCodes();
    } catch (err) {
      console.error('Failed to create invite code:', err);
      setError(err instanceof Error ? err.message : 'Failed to create invite code');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (!isAdmin) {
      setError('Only admins can delete invite codes');
      return;
    }

    if (!confirm('Are you sure you want to delete this invite code?')) return;

    try {
      const { error } = await supabase
        .from('invite_codes')
        .delete()
        .eq('id', inviteId);

      if (error) throw error;

      setSuccess('Invite code deleted successfully!');
      await loadInviteCodes();
    } catch (err) {
      console.error('Failed to delete invite code:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete invite code');
    }
  };

  const copyInviteUrl = async (code: string) => {
    const url = `${window.location.origin}/join/${code}`;
    try {
      await navigator.clipboard.writeText(url);
      setSuccess('Invite URL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy URL:', err);
      setError('Failed to copy URL to clipboard');
    }
  };

  const regenerateInviteCode = async (inviteId: string) => {
    // Generate a random 8-char uppercase code; backend has unique constraint
    const rnd = () => Math.random().toString(36).slice(2, 10).toUpperCase();
    let attempts = 0;
    while (attempts < 5) {
      const newCode = rnd();
      const { error } = await supabase
        .from('invite_codes')
        .update({ code: newCode })
        .eq('id', inviteId);
      if (!error) {
        setSuccess('Invite code regenerated');
        await loadInviteCodes();
        return;
      }
      attempts++;
    }
    setError('Failed to regenerate invite code after several attempts');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'permanent': return 'bg-green-100 text-green-800';
      case 'limited': return 'bg-blue-100 text-blue-800';
      case 'one-time': return 'bg-purple-100 text-purple-800';
      case 'event': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'moderator': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isUsageLimitReached = (invite: InviteCode) => {
    if (!invite.max_uses) return false;
    return invite.current_uses >= invite.max_uses;
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Admin Access Required</h3>
          <p className="text-gray-600">Only organization admins can manage invite codes.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Invite Code Manager</h2>
          <p className="text-gray-600">Create and manage invitation codes for your organization</p>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Invite Code
            </Button>
          </DialogTrigger>
          <DialogContent className={isMobile ? 'w-full max-w-sm' : 'max-w-md'}>
            <DialogHeader>
              <DialogTitle>Create New Invite Code</DialogTitle>
              <DialogDescription>
                Generate a new invitation code for your organization
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Invite Type</Label>
                  <Select
                    value={newInvite.type}
                    onValueChange={(value) => setNewInvite(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="permanent">Permanent</SelectItem>
                      <SelectItem value="limited">Limited Uses</SelectItem>
                      <SelectItem value="one-time">One Time</SelectItem>
                      <SelectItem value="event">Event Specific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Default Role</Label>
                  <Select
                    value={newInvite.default_role}
                    onValueChange={(value) => setNewInvite(prev => ({ ...prev, default_role: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="moderator">Moderator</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newInvite.type === 'limited' && (
                <div className="space-y-2">
                  <Label htmlFor="maxUses">Maximum Uses</Label>
                  <Input
                    id="maxUses"
                    type="number"
                    min="1"
                    value={newInvite.max_uses}
                    onChange={(e) => setNewInvite(prev => ({ ...prev, max_uses: e.target.value }))}
                    placeholder="e.g., 10"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expires At (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={newInvite.expires_at}
                  onChange={(e) => setNewInvite(prev => ({ ...prev, expires_at: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="welcomeMessage">Custom Welcome Message (Optional)</Label>
                <Textarea
                  id="welcomeMessage"
                  value={newInvite.custom_welcome_message}
                  onChange={(e) => setNewInvite(prev => ({ ...prev, custom_welcome_message: e.target.value }))}
                  placeholder="Welcome to our community!"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="source">Source (Optional)</Label>
                  <Input
                    id="source"
                    value={newInvite.source}
                    onChange={(e) => setNewInvite(prev => ({ ...prev, source: e.target.value }))}
                    placeholder="e.g., email, social"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campaign">Campaign (Optional)</Label>
                  <Input
                    id="campaign"
                    value={newInvite.campaign}
                    onChange={(e) => setNewInvite(prev => ({ ...prev, campaign: e.target.value }))}
                    placeholder="e.g., summer2024"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateInvite} disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Invite
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Status Messages */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* Stats Overview */}
      <div className={`grid ${isMobile ? 'grid-cols-2' : 'grid-cols-4'} gap-4`}>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{inviteCodes.length}</div>
            <div className="text-sm text-blue-600">Total Codes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {inviteCodes.filter(c => !isExpired(c.expires_at) && !isUsageLimitReached(c)).length}
            </div>
            <div className="text-sm text-green-600">Active</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {inviteCodes.reduce((sum, code) => sum + code.current_uses, 0)}
            </div>
            <div className="text-sm text-purple-600">Total Uses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">
              {inviteCodes.filter(c => isExpired(c.expires_at) || isUsageLimitReached(c)).length}
            </div>
            <div className="text-sm text-gray-600">Expired/Full</div>
          </CardContent>
        </Card>
      </div>

      {/* Invite Codes List */}
      <Card>
        <CardHeader>
          <CardTitle>Invite Codes</CardTitle>
          <CardDescription>
            Manage your organization's invitation codes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-gray-600">Loading invite codes...</p>
            </div>
          ) : inviteCodes.length === 0 ? (
            <div className="text-center py-8">
              <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No invite codes yet</h3>
              <p className="text-gray-600 mb-4">Create your first invite code to start inviting members</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Invite Code
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {inviteCodes.map((invite) => {
                const expired = isExpired(invite.expires_at);
                const usageFull = isUsageLimitReached(invite);
                const isActive = !expired && !usageFull;

                return (
                  <div
                    key={invite.id}
                    className={`p-4 border rounded-lg ${
                      isActive ? 'border-green-200 bg-green-50/30' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <code className="font-mono text-lg font-semibold bg-gray-100 px-2 py-1 rounded">
                            {invite.code}
                          </code>
                          
                          <Badge className={getTypeColor(invite.type)}>
                            {invite.type}
                          </Badge>
                          
                          <Badge className={getRoleColor(invite.default_role)}>
                            {invite.default_role}
                          </Badge>

                          {!isActive && (
                            <Badge variant="destructive">
                              {expired ? 'Expired' : 'Usage Limit Reached'}
                            </Badge>
                          )}
                        </div>

                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {invite.current_uses}
                              {invite.max_uses ? ` / ${invite.max_uses}` : ''} uses
                            </span>
                            
                            {invite.expires_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                Expires {new Date(invite.expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {invite.custom_welcome_message && (
                            <div className="text-gray-500 italic">
                              "{invite.custom_welcome_message}"
                            </div>
                          )}

                          <div className="text-xs text-gray-400">
                            Created {new Date(invite.created_at).toLocaleDateString()}
                            {invite.last_used_at && (
                              <span> • Last used {new Date(invite.last_used_at).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInviteUrl(invite.code)}
                        >
                          <Copy className="w-4 h-4" />
                          {!isMobile && <span className="ml-1">Copy URL</span>}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => regenerateInviteCode(invite.id)}
                        >
                          <RefreshIcon />
                          {!isMobile && <span className="ml-1">Regenerate</span>}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteInvite(invite.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
