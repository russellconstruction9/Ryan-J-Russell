
import React, { useState, useEffect } from 'react';
import type { BudgetData, ReconcileResult } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface TotalsPanelProps {
  budgetData: BudgetData;
  reconciledResult: ReconcileResult;
  onBudgetUpdate: (update: { oAndPPercent: number }) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const TotalsPanel: React.FC<TotalsPanelProps> = ({ budgetData, reconciledResult, onBudgetUpdate }) => {
  const [oAndPPercent, setOAndPPercent] = useState(budgetData.json.definitive.oAndPPercent * 100);
  
  const definitiveTotal = budgetData.json.definitive.totalProjectBudget ?? 0;
  const isReconciled = Math.abs(reconciledResult.grandTotal - definitiveTotal) < 0.015;

  useEffect(() => {
    setOAndPPercent(budgetData.json.definitive.oAndPPercent * 100);
  }, [budgetData.json.definitive.oAndPPercent]);


  const handleOAndPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOAndPPercent(parseFloat(e.target.value) || 0);
  };
  
  const handleOAndPBlur = () => {
    const newOAndP = oAndPPercent / 100;
    if (newOAndP !== budgetData.json.definitive.oAndPPercent) {
      onBudgetUpdate({ oAndPPercent: newOAndP });
    }
  };

  return (
    <div className="bg-slate-50 rounded-lg shadow p-6 space-y-4 sticky top-8">
      <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-3">Budget Summary</h3>
      
       <div className={`p-3 rounded-md flex items-center gap-3 ${isReconciled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {isReconciled ? <CheckCircleIcon className="w-6 h-6" /> : <XCircleIcon className="w-6 h-6" />}
        <span className="font-semibold text-sm">{isReconciled ? 'Budget Reconciled' : 'Not Reconciled'}</span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-600">Subtotal (Line Items)</span>
          <span className="font-medium text-slate-800">{formatCurrency(reconciledResult.subtotalLinesScaled)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Material Sales Tax</span>
          <span className="font-medium text-slate-800">{formatCurrency(reconciledResult.materialTax)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-600">Overhead & Profit</span>
          <div className="flex items-center gap-2">
            <input 
              type="number" 
              value={oAndPPercent}
              onChange={handleOAndPChange}
              onBlur={handleOAndPBlur}
              className="w-16 text-right font-medium bg-white border border-slate-300 rounded-md shadow-sm p-1 text-sm focus:ring-indigo-500 focus:border-indigo-500"
            />
            <span className="text-slate-600">%</span>
          </div>
          <span className="font-medium text-slate-800">{formatCurrency(reconciledResult.oAndP)}</span>
        </div>
      </div>
      
      <div className="!mt-6 border-t border-slate-300 pt-4">
        <div className="flex justify-between text-base font-bold">
          <span className="text-slate-900">TOTAL PROJECT BUDGET</span>
          <span className="text-indigo-600">{formatCurrency(reconciledResult.grandTotal)}</span>
        </div>
         <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Definitive Target</span>
            <span>{formatCurrency(definitiveTotal)}</span>
        </div>
      </div>

      <div className="!mt-6 text-xs text-slate-500 space-y-1 bg-slate-100 p-3 rounded-md">
        <p><strong>Source:</strong> {budgetData.json.definitive.source.toUpperCase()}</p>
        <p><strong>Scaling Factor (S):</strong> {reconciledResult.scalingFactor.toFixed(4)}</p>
        <p><strong>Tax Rate:</strong> {(budgetData.json.definitive.taxRate * 100).toFixed(2)}%</p>
        {reconciledResult.residualAdjustment && (
           <p className="text-orange-600">
             <strong>Adjustment: </strong>
             {formatCurrency(reconciledResult.residualAdjustment.amount)} applied to {reconciledResult.residualAdjustment.appliedToCategory}.
           </p>
        )}
      </div>
    </div>
  );
};
