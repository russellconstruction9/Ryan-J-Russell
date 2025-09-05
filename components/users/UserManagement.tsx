import React, { useState, useEffect } from 'react';
import { supabase, type CompanyUser, type CompanyInvitation } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

export const UserManagement: React.FC = () => {
  const { user, currentCompany } = useAuth();
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [invitations, setInvitations] = useState<CompanyInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'member'>('member');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (user && currentCompany) {
      fetchCompanyUsers();
      fetchInvitations();
    }
  }, [user, currentCompany]);

  const fetchCompanyUsers = async () => {
    if (!currentCompany) return;
    
    try {
      const { data, error } = await supabase
        .from('company_users')
        .select(`
          *,
          profiles!inner(email, full_name)
        `)
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('joined_at', { ascending: false });
      
      if (error) throw error;
      setCompanyUsers(data || []);
    } catch (error) {
      console.error('Error fetching company users:', error);
    }
  };

  const fetchInvitations = async () => {
    if (!currentCompany) return;
    
    try {
      const { data, error } = await supabase
        .from('company_invitations')
        .select('*')
        .eq('company_id', currentCompany.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim() || !currentCompany || !user) return;
    
    setInviting(true);
    try {
      // Check if user already exists in company
      const { data: existingUser } = await supabase
        .from('company_users')
        .select('id')
        .eq('company_id', currentCompany.id)
        .eq('user_id', user.id)
        .single();
      
      if (existingUser) {
        alert('User is already a member of this company');
        return;
      }

      // Check if invitation already exists
      const { data: existingInvite } = await supabase
        .from('company_invitations')
        .select('id')
        .eq('company_id', currentCompany.id)
        .eq('email', inviteEmail.toLowerCase())
        .is('accepted_at', null)
        .single();
      
      if (existingInvite) {
        alert('An invitation has already been sent to this email address');
        return;
      }

      // Create invitation
      const { error } = await supabase
        .from('company_invitations')
        .insert([{
          company_id: currentCompany.id,
          email: inviteEmail.toLowerCase(),
          role: inviteRole,
          invited_by: user.id
        }]);
      
      if (error) throw error;
      
      // Refresh invitations list
      await fetchInvitations();
      
      // Reset form
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteModal(false);
      
      alert('Invitation sent successfully!');
    } catch (error) {
      console.error('Error inviting user:', error);
      alert('Failed to send invitation. Please try again.');
    } finally {
      setInviting(false);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    if (!currentCompany) return;
    
    try {
      const { error } = await supabase
        .from('company_users')
        .update({ role: newRole })
        .eq('company_id', currentCompany.id)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      await fetchCompanyUsers();
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('Failed to update user role');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!currentCompany) return;
    
    if (!confirm('Are you sure you want to remove this user from the company?')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('company_users')
        .update({ is_active: false })
        .eq('company_id', currentCompany.id)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      await fetchCompanyUsers();
    } catch (error) {
      console.error('Error removing user:', error);
      alert('Failed to remove user');
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('company_invitations')
        .delete()
        .eq('id', invitationId);
      
      if (error) throw error;
      
      await fetchInvitations();
    } catch (error) {
      console.error('Error canceling invitation:', error);
      alert('Failed to cancel invitation');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'member': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Team Management</h2>
          <p className="text-slate-600">Manage users and permissions for {currentCompany?.name}</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
        >
          Invite User
        </button>
      </div>

      {/* Current Users */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900">Company Users ({companyUsers.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {companyUsers.map((companyUser) => (
                <tr key={companyUser.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-slate-900">
                        {companyUser.profiles?.full_name || 'Unknown User'}
                      </div>
                      <div className="text-sm text-slate-500">
                        {companyUser.profiles?.email}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(companyUser.role)}`}>
                      {companyUser.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                    {formatDate(companyUser.joined_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {companyUser.user_id !== user?.id && companyUser.role !== 'owner' && (
                      <div className="flex space-x-2">
                        <select
                          value={companyUser.role}
                          onChange={(e) => handleUpdateUserRole(companyUser.user_id, e.target.value)}
                          className="text-sm border border-slate-300 rounded px-2 py-1"
                        >
                          <option value="member">Member</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleRemoveUser(companyUser.user_id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    {companyUser.user_id === user?.id && (
                      <span className="text-slate-500">You</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Pending Invitations ({invitations.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                      {invitation.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(invitation.role)}`}>
                        {invitation.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(invitation.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {formatDate(invitation.expires_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleCancelInvitation(invitation.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Invite New User</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="user@example.com"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role *
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'manager' | 'member')}
                  className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="member">Member - Basic access</option>
                  <option value="manager">Manager - Project management</option>
                  <option value="admin">Admin - User management</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setInviteRole('member');
                }}
                disabled={inviting}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteUser}
                disabled={inviting || !inviteEmail.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {inviting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};