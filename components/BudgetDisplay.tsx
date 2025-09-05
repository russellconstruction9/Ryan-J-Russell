
import React from 'react';
import { BudgetTable } from './BudgetTable';
import { TotalsPanel } from './TotalsPanel';
import { WorkOrderForm } from './WorkOrderForm';
import type { BudgetData, ReconcileResult, CategoryScaled } from '../types';

interface BudgetDisplayProps {
  budgetData: BudgetData;
  reconciledResult: ReconcileResult;
  onCategoriesChange: (updatedCategories: CategoryScaled[]) => void;
  onBudgetUpdate: (update: { oAndPPercent: number }) => void;
  onReset: () => void;
  fileName: string;
  selectedLineItem?: CategoryScaled | null;
  onSelectLineItem: (lineItem: CategoryScaled | null) => void;
}

export const BudgetDisplay: React.FC<BudgetDisplayProps> = ({
  budgetData, 
  reconciledResult,
  onCategoriesChange,
  onBudgetUpdate,
  onReset,
  fileName,
  selectedLineItem,
  onSelectLineItem
}) => {
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
        </div>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md text-sm font-medium hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Start Over
        </button>
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
    </div>
  );
};
