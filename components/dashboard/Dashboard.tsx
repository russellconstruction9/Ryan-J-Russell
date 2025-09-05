import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

interface DashboardStats {
  totalCustomers: number;
  totalEstimates: number;
  totalWorkOrders: number;
  totalBudgetValue: number;
  recentEstimates: any[];
  recentWorkOrders: any[];
}

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalCustomers: 0,
    totalEstimates: 0,
    totalWorkOrders: 0,
    totalBudgetValue: 0,
    recentEstimates: [],
    recentWorkOrders: []
  });
  const [loading, setLoading] = useState(true);
 const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
   
   // Update current date every minute
   const timer = setInterval(() => {
     setCurrentDate(new Date());
   }, 60000);
   
   return () => clearInterval(timer);
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch customers count
      const { count: customersCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);

      // Fetch estimates with customer info
      const { data: estimates, count: estimatesCount } = await supabase
        .from('insurance_estimates')
        .select(`
          *,
          customer:customers(name)
        `, { count: 'exact' })
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      // Fetch work orders with subcontractor info
      const { data: workOrders, count: workOrdersCount } = await supabase
        .from('work_orders')
        .select(`
          *,
          subcontractor:subcontractors(name, company_name),
          estimate:insurance_estimates(file_name, customer:customers(name))
        `, { count: 'exact' })
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      // Calculate total budget value
      const totalBudgetValue = estimates?.reduce((sum, estimate) => {
        return sum + (estimate.definitive_total || 0);
      }, 0) || 0;

      setStats({
        totalCustomers: customersCount || 0,
        totalEstimates: estimatesCount || 0,
        totalWorkOrders: workOrdersCount || 0,
        totalBudgetValue,
        recentEstimates: estimates?.slice(0, 5) || [],
        recentWorkOrders: workOrders?.slice(0, 5) || []
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

 const formatCurrentDate = () => {
   return currentDate.toLocaleDateString('en-US', {
     weekday: 'long',
     year: 'numeric',
     month: 'long',
     day: 'numeric'
   });
 };
 
 const formatCurrentTime = () => {
   return currentDate.toLocaleTimeString('en-US', {
     hour: '2-digit',
     minute: '2-digit'
   });
 };
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
     {/* Date and Time Header */}
     <div className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
       <div>
         <h2 className="text-xl font-semibold text-slate-900">{formatCurrentDate()}</h2>
         <p className="text-slate-600">{formatCurrentTime()}</p>
       </div>
       <div className="text-right">
         <p className="text-sm text-slate-600">Welcome back,</p>
         <p className="font-medium text-slate-900">{user?.email?.split('@')[0]}</p>
       </div>
     </div>
 
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome to Project ManageAI</h1>
        <p className="text-indigo-100">
          AI-powered project management for construction and insurance claims
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 text-blue-600">
              <span className="text-2xl">👥</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Total Customers</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 text-green-600">
              <span className="text-2xl">📄</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Total Estimates</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalEstimates}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 text-purple-600">
              <span className="text-2xl">📋</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Work Orders</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalWorkOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
              <span className="text-2xl">💰</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600">Total Budget Value</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatCurrency(stats.totalBudgetValue)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Estimates */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Recent Estimates</h3>
          </div>
          <div className="p-6">
            {stats.recentEstimates.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No estimates yet</p>
            ) : (
              <div className="space-y-4">
                {stats.recentEstimates.map((estimate) => (
                  <div key={estimate.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">{estimate.file_name}</p>
                      <p className="text-sm text-slate-500">
                        {estimate.customer?.name} • {formatDate(estimate.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      {estimate.definitive_total && (
                        <p className="font-semibold text-indigo-600">
                          {formatCurrency(estimate.definitive_total)}
                        </p>
                      )}
                      <p className="text-sm text-slate-500 capitalize">{estimate.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Work Orders */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">Recent Work Orders</h3>
          </div>
          <div className="p-6">
            {stats.recentWorkOrders.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No work orders yet</p>
            ) : (
              <div className="space-y-4">
                {stats.recentWorkOrders.map((workOrder) => (
                  <div key={workOrder.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900">
                        {workOrder.work_order_number}
                      </p>
                      <p className="text-sm text-slate-500">
                        {workOrder.category} • {workOrder.subcontractor?.name}
                      </p>
                      <p className="text-xs text-slate-400">
                        {workOrder.estimate?.customer?.name} • {formatDate(workOrder.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">
                        {formatCurrency(workOrder.total_amount)}
                      </p>
                      <p className="text-sm text-slate-500 capitalize">{workOrder.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <button 
           onClick={() => window.location.hash = '#upload'}
           className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
         >
            <span className="text-2xl mr-3">📤</span>
            <div className="text-left">
              <p className="font-medium text-slate-900">Upload New Estimate</p>
              <p className="text-sm text-slate-500">Process a new PDF estimate</p>
            </div>
          </button>
         <button 
           onClick={() => window.location.hash = '#customers'}
           className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
         >
            <span className="text-2xl mr-3">👥</span>
            <div className="text-left">
              <p className="font-medium text-slate-900">Add Customer</p>
              <p className="text-sm text-slate-500">Create a new customer record</p>
            </div>
          </button>
         <button 
           onClick={() => window.location.hash = '#subcontractors'}
           className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
         >
            <span className="text-2xl mr-3">🔨</span>
            <div className="text-left">
              <p className="font-medium text-slate-900">Add Subcontractor</p>
              <p className="text-sm text-slate-500">Register a new subcontractor</p>
            </div>
          </button>
        </div>
      </div>
     
     {/* Today's Schedule / Calendar Preview */}
     <div className="bg-white rounded-lg shadow p-6">
       <h3 className="text-lg font-semibold text-slate-900 mb-4">Today's Overview</h3>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div>
           <h4 className="font-medium text-slate-700 mb-3">Recent Activity</h4>
           <div className="space-y-2">
             {stats.recentEstimates.slice(0, 3).map((estimate, index) => (
               <div key={estimate.id} className="flex items-center text-sm">
                 <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                 <span className="text-slate-600">
                   New estimate: {estimate.file_name}
                 </span>
               </div>
             ))}
             {stats.recentWorkOrders.slice(0, 2).map((workOrder, index) => (
               <div key={workOrder.id} className="flex items-center text-sm">
                 <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                 <span className="text-slate-600">
                   Work order: {workOrder.work_order_number}
                 </span>
               </div>
             ))}
             {stats.recentEstimates.length === 0 && stats.recentWorkOrders.length === 0 && (
               <p className="text-slate-500 text-sm">No recent activity</p>
             )}
           </div>
         </div>
         
         <div>
           <h4 className="font-medium text-slate-700 mb-3">Quick Stats</h4>
           <div className="space-y-2 text-sm">
             <div className="flex justify-between">
               <span className="text-slate-600">Active Projects:</span>
               <span className="font-medium">{stats.totalEstimates}</span>
             </div>
             <div className="flex justify-between">
               <span className="text-slate-600">Total Customers:</span>
               <span className="font-medium">{stats.totalCustomers}</span>
             </div>
             <div className="flex justify-between">
               <span className="text-slate-600">Work Orders:</span>
               <span className="font-medium">{stats.totalWorkOrders}</span>
             </div>
             <div className="flex justify-between border-t pt-2">
               <span className="text-slate-600 font-medium">Total Value:</span>
               <span className="font-bold text-indigo-600">
                 {formatCurrency(stats.totalBudgetValue)}
               </span>
             </div>
           </div>
         </div>
       </div>
     </div>
    </div>
  );
};