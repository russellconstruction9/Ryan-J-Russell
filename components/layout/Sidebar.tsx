import React from 'react';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange }) => {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'upload', label: 'Upload Estimate', icon: '📤' },
    { id: 'customers', label: 'Customers', icon: '👥' },
    { id: 'subcontractors', label: 'Subcontractors', icon: '🔨' },
    { id: 'estimates', label: 'Estimates', icon: '📄' },
    { id: 'work-orders', label: 'Work Orders', icon: '📋' },
  ];

  return (
    <div className="bg-slate-900 text-white w-64 min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold text-white">Project ManageAI</h1>
        <p className="text-slate-400 text-sm mt-1">AI-Powered Project Management</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onPageChange(item.id)}
                className={`w-full flex items-center px-4 py-3 rounded-lg text-left transition-colors ${
                  currentPage === item.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* User Info & Sign Out */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.email}
            </p>
            <p className="text-xs text-slate-400">Signed in</p>
          </div>
          <button
            onClick={handleSignOut}
            className="ml-3 text-slate-400 hover:text-white text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};