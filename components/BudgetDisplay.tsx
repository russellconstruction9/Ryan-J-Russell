
import React, { useState } from 'react';
import { BudgetTable } from './BudgetTable';
import { TotalsPanel } from './TotalsPanel';
import { WorkOrderForm } from './WorkOrderForm';
import type { BudgetData, ReconcileResult, CategoryScaled } from '../types';

interface BudgetDisplayProps {
  budgetData: BudgetData;
  reconciledResult: ReconcileResult;
  onCategoriesChange: (updatedCategories: CategoryScaled[]) => void;
  onBudgetUpdate: (update: { oAndPPercent: number }) => void;
  onSaveBudgetVersion?: (notes?: string) => Promise<void>;
  onReset: () => void;
  fileName: string;
  selectedLineItem?: CategoryScaled | null;
  onSelectLineItem: (lineItem: CategoryScaled | null) => void;
  hasUnsavedChanges?: boolean;
}

export const BudgetDisplay: React.FC<BudgetDisplayProps> = ({
  budgetData, 
  reconciledResult,
  onCategoriesChange,
  onBudgetUpdate,
  onSaveBudgetVersion,
  onReset,
  fileName,
  selectedLineItem,
  onSelectLineItem,
  hasUnsavedChanges = false
}) => {
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveNotes, setSaveNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveVersion = async () => {
    if (!onSaveBudgetVersion) return;
    
    setIsSaving(true);
    try {
      await onSaveBudgetVersion(saveNotes);
      setShowSaveModal(false);
      setSaveNotes('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to save budget version:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (selectedLineItem) {
    return (
      <WorkOrderForm 
        lineItem={selectedLineItem}
        onBack={() => onSelectLineItem(null)}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reconciled Budget</h2>
          <p className="text-slate-500">File: <span className="font-medium">{fileName}</span></p>
          {hasUnsavedChanges && (
            <p className="text-orange-600 text-sm font-medium">● Unsaved changes</p>
          )}
          {saveSuccess && (
            <p className="text-green-600 text-sm font-medium">✓ Budget version saved successfully</p>
          )}
        </div>
        <div className="flex gap-3">
          {onSaveBudgetVersion && (
            <button
              onClick={() => setShowSaveModal(true)}
              disabled={!hasUnsavedChanges || isSaving}
              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {isSaving ? 'Saving...' : 'Save Budget Changes'}
            </button>
          )}
          <button
            onClick={onReset}
            className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md text-sm font-medium hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Start Over
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <BudgetTable 
            categories={reconciledResult.categories} 
            onCategoriesChange={onCategoriesChange}
            onCreateWorkOrder={onSelectLineItem}
          />
        </div>
        <div className="lg:col-span-1">
          <TotalsPanel 
            budgetData={budgetData} 
            reconciledResult={reconciledResult} 
            onBudgetUpdate={onBudgetUpdate}
          />
        </div>
      </div>

      {/* Save Version Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Save Revised Budget</h3>
            <p className="text-slate-600 mb-4">
              This will save your changes as a new budget version in the customer's folder while preserving the original budget.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Revision Notes (Optional)
              </label>
              <textarea
                value={saveNotes}
                onChange={(e) => setSaveNotes(e.target.value)}
                rows={3}
                className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Describe what changes were made to this budget..."
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  setSaveNotes('');
                }}
                disabled={isSaving}
                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVersion}
                disabled={isSaving}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Revised Budget'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
