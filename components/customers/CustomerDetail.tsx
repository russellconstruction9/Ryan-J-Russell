import React, { useState, useEffect } from 'react';
import { supabase, type Customer, type InsuranceEstimate, type WorkOrder } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { FileTextIcon } from '../icons/FileTextIcon';
import { BudgetDisplay } from '../BudgetDisplay';
import { reconcileBudget } from '../../utils/reconcile';
import type { BudgetData, ReconcileResult, CategoryScaled, ReconcileInput } from '../../types';

interface CustomerDetailProps {
  customer: Customer;
  onBack: () => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString();
};

export const CustomerDetail: React.FC<CustomerDetailProps> = ({ customer, onBack }) => {
  const { user } = useAuth();
  const [estimates, setEstimates] = useState<InsuranceEstimate[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'estimates' | 'workorders' | 'budgets'>('info');
  const [selectedEstimate, setSelectedEstimate] = useState<InsuranceEstimate | null>(null);
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [reconciledResult, setReconciledResult] = useState<ReconcileResult | null>(null);
  const [selectedLineItem, setSelectedLineItem] = useState<CategoryScaled | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [budgetVersions, setBudgetVersions] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      fetchCustomerData();
    }
  }, [user, customer.id]);

  const fetchCustomerData = async () => {
    try {
      // Fetch estimates for this customer
      const { data: estimatesData, error: estimatesError } = await supabase
        .from('insurance_estimates')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (estimatesError) throw estimatesError;
      setEstimates(estimatesData || []);

      // Fetch work orders for this customer
      const { data: workOrdersData, error: workOrdersError } = await supabase
        .from('work_orders')
        .select(`
          *,
          subcontractor:subcontractors(name, company_name, specialty),
          estimate:insurance_estimates(file_name)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (workOrdersError) throw workOrdersError;
      
      // Filter work orders that belong to this customer's estimates
      const customerEstimateIds = estimatesData?.map(e => e.id) || [];
      const customerWorkOrders = workOrdersData?.filter(wo => 
        customerEstimateIds.includes(wo.estimate_id)
      ) || [];
      
      setWorkOrders(customerWorkOrders);
      
      // Fetch budget versions if we have estimates
      if (estimatesData && estimatesData.length > 0) {
        fetchBudgetVersions();
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgetVersions = async () => {
    try {
      const estimateIds = estimates.map(e => e.id);
      if (estimateIds.length === 0) return;

      const { data, error } = await supabase
        .from('budget_versions')
        .select('*')
        .in('estimate_id', estimateIds)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBudgetVersions(data || []);
    } catch (error) {
      console.error('Error fetching budget versions:', error);
    }
  };

  const handleViewEstimate = (estimate: InsuranceEstimate) => {
    setSelectedEstimate(estimate);
  };

  const handleViewBudget = (estimate: InsuranceEstimate) => {
    if (!estimate.budget_data) return;
    
    try {
      const budgetJson = estimate.budget_data;
      const categoriesWithIds = budgetJson.categories.map((c: any, i: number) => ({
        ...c,
        id: c.id || `cat-${Date.now()}-${i}`,
        estimateId: estimate.id,
        customerId: customer.id
      }));
      
      const newBudgetData: BudgetData = {
        json: { ...budgetJson, categories: categoriesWithIds },
        markdown: '' // We don't store markdown, just JSON
      };
      
      setBudgetData(newBudgetData);
      
      // Reconcile the budget
      if (newBudgetData.json.definitive.totalProjectBudget) {
        const reconcileInput: ReconcileInput = {
          definitiveTotal: newBudgetData.json.definitive.totalProjectBudget,
          oAndPPercent: newBudgetData.json.definitive.oAndPPercent,
          taxRate: newBudgetData.json.definitive.taxRate,
          categoriesPre: categoriesWithIds,
        };
        
        const result = reconcileBudget(reconcileInput);
        setReconciledResult(result);
      }
      
      setActiveTab('budgets');
    } catch (error) {
      console.error('Error loading budget:', error);
    }
  };

  const handleCategoriesChange = (updatedCategories: CategoryScaled[]) => {
    if (!budgetData?.json.definitive.totalProjectBudget) return;

    const reconcileInput: ReconcileInput = {
      definitiveTotal: budgetData.json.definitive.totalProjectBudget,
      oAndPPercent: budgetData.json.definitive.oAndPPercent,
      taxRate: budgetData.json.definitive.taxRate,
      categoriesPre: updatedCategories,
    };
    
    try {
      const result = reconcileBudget(reconcileInput);
      setReconciledResult(result);
      setHasUnsavedChanges(true);
      
      setHasUnsavedChanges(false);
      // Save updated categories to database
      if (budgetData.json.categories[0] && (budgetData.json.categories[0] as any).estimateId) {
        const estimateId = (budgetData.json.categories[0] as any).estimateId;
        supabase
          .from('insurance_estimates')
          .update({
            budget_data: { ...budgetData.json, categories: updatedCategories },
            reconciled_data: result,
            updated_at: new Date().toISOString()
          })
          .eq('id', estimateId)
          .then(({ error }) => {
            if (error) console.log('Failed to update estimate:', error);
          });
      }
    } catch (err) {
      console.error('Reconciliation failed:', err);
    }
  };

  const handleBudgetUpdate = (update: { oAndPPercent: number }) => {
    if (!budgetData || !reconciledResult || budgetData.json.definitive.totalProjectBudget === null) return;
    
    const reconcileInput: ReconcileInput = {
      definitiveTotal: budgetData.json.definitive.totalProjectBudget,
      oAndPPercent: update.oAndPPercent,
      taxRate: budgetData.json.definitive.taxRate,
      categoriesPre: reconciledResult.categories,
    };

    try {
      const result = reconcileBudget(reconcileInput);
      setReconciledResult(result);

      setBudgetData(prev => {
        setHasUnsavedChanges(true);
        if (!prev) return null;
        const newJson = { 
          ...prev.json, 
          definitive: {
            ...prev.json.definitive,
            oAndPPercent: update.oAndPPercent
          }
        };
        return { ...prev, json: newJson };
      });
      
      // Save updated budget to database
      if (budgetData.json.categories[0] && (budgetData.json.categories[0] as any).estimateId) {
        const estimateId = (budgetData.json.categories[0] as any).estimateId;
        supabase
          .from('insurance_estimates')
          .update({
            budget_data: { ...budgetData.json, definitive: { ...budgetData.json.definitive, oAndPPercent: update.oAndPPercent } },
            reconciled_data: result,
            updated_at: new Date().toISOString()
          })
          .eq('id', estimateId)
          .then(({ error }) => {
            if (error) console.log('Failed to update estimate:', error);
          });
      }
    } catch (err) {
      console.error("Reconciliation failed on budget update:", err);
    }
  };

  const handleSaveBudgetVersion = async (notes?: string) => {
    if (!budgetData || !reconciledResult || !user) return;

    const estimateId = (budgetData.json.categories[0] as any)?.estimateId;
    if (!estimateId) return;

    try {
      // Get the next version number
      const { data: existingVersions, error: versionError } = await supabase
        .from('budget_versions')
        .select('version_number')
        .eq('estimate_id', estimateId)
        .order('version_number', { ascending: false })
        .limit(1);

      if (versionError) throw versionError;

      const nextVersion = existingVersions && existingVersions.length > 0 
        ? existingVersions[0].version_number + 1 
        : 1;

      // Save the new version
      const { error: saveError } = await supabase
        .from('budget_versions')
        .insert([{
          estimate_id: estimateId,
          user_id: user.id,
          version_number: nextVersion,
          budget_data: budgetData.json,
          reconciled_data: reconciledResult,
          notes: notes || `Version ${nextVersion}`
        }]);

      if (saveError) throw saveError;

      setHasUnsavedChanges(false);
      fetchBudgetVersions(); // Refresh the versions list
    } catch (error) {
      console.error('Error saving budget version:', error);
      throw error;
    }
  };

  const handlePrintWorkOrder = (workOrder: WorkOrder) => {
    if (!workOrder.generated_content) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Work Order ${workOrder.work_order_number}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
              h1, h2, h3 { color: #333; }
              .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
              pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Work Order ${workOrder.work_order_number}</h1>
              <p>Generated on: ${formatDate(workOrder.created_at)}</p>
            </div>
            <pre>${workOrder.generated_content}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (selectedEstimate) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setSelectedEstimate(null);
              setActiveTab('estimates');
            }}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back to Estimates
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Estimate Details</h2>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Estimate Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">File Name:</span>
                  <span className="font-medium">{selectedEstimate.file_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Status:</span>
                  <span className="font-medium capitalize">{selectedEstimate.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Created:</span>
                  <span className="font-medium">{formatDate(selectedEstimate.created_at)}</span>
                </div>
                {selectedEstimate.definitive_total && (
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-slate-600 font-semibold">Total Budget:</span>
                    <span className="font-bold text-indigo-600">
                      {formatCurrency(selectedEstimate.definitive_total)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-3">Project Details</h3>
              <div className="space-y-2 text-sm">
                {selectedEstimate.claim_number && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Claim Number:</span>
                    <span className="font-medium">{selectedEstimate.claim_number}</span>
                  </div>
                )}
                {selectedEstimate.date_of_loss && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Date of Loss:</span>
                    <span className="font-medium">{formatDate(selectedEstimate.date_of_loss)}</span>
                  </div>
                )}
                {selectedEstimate.notes && (
                  <div>
                    <span className="text-slate-600">Notes:</span>
                    <p className="text-slate-800 mt-1">{selectedEstimate.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {selectedEstimate.budget_data && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Budget Breakdown</h3>
              <div className="bg-slate-50 rounded-lg p-4">
                <pre className="text-sm text-slate-700 whitespace-pre-wrap">
                  {JSON.stringify(selectedEstimate.budget_data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show budget view if in budgets tab and budget data is loaded
  if (activeTab === 'budgets' && budgetData && reconciledResult) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              setBudgetData(null);
              setReconciledResult(null);
              setSelectedLineItem(null);
              setActiveTab('info');
            }}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back to Customer
          </button>
          <h2 className="text-2xl font-bold text-slate-900">Budget Editor</h2>
        </div>
        
        <BudgetDisplay 
          budgetData={budgetData}
          reconciledResult={reconciledResult}
          onCategoriesChange={handleCategoriesChange}
          onBudgetUpdate={handleBudgetUpdate}
          onSaveBudgetVersion={handleSaveBudgetVersion}
          hasUnsavedChanges={hasUnsavedChanges}
          onReset={() => {
            setBudgetData(null);
            setReconciledResult(null);
            setSelectedLineItem(null);
            setHasUnsavedChanges(false);
            setActiveTab('info');
          }}
          fileName="Customer Budget"
          selectedLineItem={selectedLineItem}
          onSelectLineItem={setSelectedLineItem}
        />
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading customer data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back to Customers
        </button>
        <h2 className="text-2xl font-bold text-slate-900">Customer Details</h2>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'info'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Customer Info
          </button>
          <button
            onClick={() => setActiveTab('estimates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'estimates'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Estimates ({estimates.length})
          </button>
          <button
            onClick={() => setActiveTab('workorders')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'workorders'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Work Orders ({workOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('budgets')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'budgets'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Budgets
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'info' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-slate-600">Name:</span>
                  <p className="text-slate-900">{customer.name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-600">Email:</span>
                  <p className="text-slate-900">{customer.email || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-600">Phone:</span>
                  <p className="text-slate-900">{customer.phone || 'Not provided'}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-slate-600">Address:</span>
                  <p className="text-slate-900">
                    {customer.address && (
                      <>
                        {customer.address}<br />
                        {customer.city}, {customer.state} {customer.zip_code}
                      </>
                    )}
                    {!customer.address && 'Not provided'}
                  </p>
                </div>
                {customer.notes && (
                  <div>
                    <span className="text-sm font-medium text-slate-600">Notes:</span>
                    <p className="text-slate-900">{customer.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'estimates' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Insurance Estimates</h3>
            {estimates.length === 0 ? (
              <p className="text-slate-500">No estimates found for this customer.</p>
            ) : (
              <div className="space-y-3">
                {estimates.map((estimate) => (
                  <div
                    key={estimate.id}
                    className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileTextIcon className="w-5 h-5 text-slate-400" />
                        <div>
                          <h4 className="font-medium text-slate-900">{estimate.file_name}</h4>
                          <p className="text-sm text-slate-500">
                            Created: {formatDate(estimate.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex gap-2 mb-2">
                          <button
                            onClick={() => handleViewEstimate(estimate)}
                            className="text-sm text-indigo-600 hover:text-indigo-800"
                          >
                            View Details
                          </button>
                          {estimate.budget_data && (
                            <button
                              onClick={() => handleViewBudget(estimate)}
                              className="text-sm text-green-600 hover:text-green-800"
                            >
                              Edit Budget
                            </button>
                          )}
                        </div>
                        <span className="text-sm font-medium text-slate-600 capitalize">
                          {estimate.status}
                        </span>
                        {estimate.definitive_total && (
                          <p className="text-lg font-semibold text-indigo-600">
                            {formatCurrency(estimate.definitive_total)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'workorders' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Work Orders</h3>
            {workOrders.length === 0 ? (
              <p className="text-slate-500">No work orders found for this customer.</p>
            ) : (
              <div className="space-y-3">
                {workOrders.map((workOrder) => (
                  <div
                    key={workOrder.id}
                    className="border border-slate-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-slate-900">
                          {workOrder.work_order_number} - {workOrder.category}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {workOrder.subcontractor?.name} ({workOrder.subcontractor?.company_name})
                        </p>
                        <p className="text-sm text-slate-500">
                          Created: {formatDate(workOrder.created_at)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-indigo-600">
                          {formatCurrency(workOrder.total_amount)}
                        </p>
                        <button
                          onClick={() => handlePrintWorkOrder(workOrder)}
                          className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                        >
                          Print Work Order
                        </button>
                      </div>
                    </div>
                    {workOrder.scope_of_work && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-sm text-slate-600">
                          <strong>Scope:</strong> {workOrder.scope_of_work}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'budgets' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Available Budgets</h3>
            
            {/* Budget Versions */}
            {budgetVersions.length > 0 && (
              <div className="mb-6">
                <h4 className="text-md font-medium text-slate-700 mb-3">Budget History</h4>
                <div className="space-y-2">
                  {budgetVersions.map((version) => (
                    <div
                      key={version.id}
                      className="border border-slate-200 rounded-lg p-3 hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-slate-900">
                            {version.version_number === 1 ? 'Original Budget' : `Revision ${version.version_number - 1}`}
                          </span>
                          <p className="text-sm text-slate-500">
                            {formatDate(version.created_at)}
                          </p>
                          {version.notes && (
                            <p className="text-sm text-slate-600 mt-1">{version.notes}</p>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            // Load this version into the budget editor
                            const versionBudgetData: BudgetData = {
                              json: version.budget_data,
                              markdown: ''
                            };
                            setBudgetData(versionBudgetData);
                            setReconciledResult(version.reconciled_data);
                            setHasUnsavedChanges(false);
                            setSelectedVersion(version.version_number);
                          }}
                          className="text-sm text-indigo-600 hover:text-indigo-800"
                        >
                          {version.version_number === 1 ? 'View Original' : 'Load Revision'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {estimates.filter(e => e.budget_data).length === 0 ? (
              <p className="text-slate-500">No budgets available for this customer.</p>
            ) : (
              <div className="space-y-3">
                {estimates.filter(e => e.budget_data).map((estimate) => (
                  <div
                    key={estimate.id}
                    className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 cursor-pointer"
                    onClick={() => handleViewBudget(estimate)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileTextIcon className="w-5 h-5 text-slate-400" />
                        <div>
                          <h4 className="font-medium text-slate-900">{estimate.file_name}</h4>
                          <p className="text-sm text-slate-500">
                            Budget created: {formatDate(estimate.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-green-600 font-medium">
                          Click to Edit Budget
                        </span>
                        {estimate.definitive_total && (
                          <p className="text-lg font-semibold text-indigo-600">
                            {formatCurrency(estimate.definitive_total)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};