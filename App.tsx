
import React, { useState, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthForm } from './components/auth/AuthForm';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { UploadPage } from './components/upload/UploadPage';
import { CustomerList } from './components/customers/CustomerList';
import { SubcontractorList } from './components/subcontractors/SubcontractorList';

const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [currentPage, setCurrentPage] = useState('dashboard');

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show auth form if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Insurance Budget Reconciler</h1>
            <p className="text-slate-600 mt-2">Professional budget management for insurance claims</p>
          </div>
          <AuthForm 
            mode={authMode} 
            onToggleMode={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} 
          />
        </div>
      </div>
    );
  }

  const renderCurrentPage = () => {
    switch (currentPage) {
     case 'dashboard':
       return <Dashboard />;
     case 'upload':
       return <UploadPage />;
      case 'customers':
        return <CustomerList />;
      case 'subcontractors':
        return <SubcontractorList />;
      case 'estimates':
        return <div className="text-center p-8">Estimates page coming soon...</div>;
      case 'work-orders':
        return <div className="text-center p-8">Work Orders page coming soon...</div>;
      default:
       return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <Sidebar currentPage={currentPage} onPageChange={setCurrentPage} />
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6">
            {renderCurrentPage()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
