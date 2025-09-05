import React, { useState } from 'react';
import { ArrowLeftIcon } from './icons/ArrowLeftIcon';
import { Loader } from './Loader';
import { ErrorMessage } from './ErrorMessage';
import { generateWorkOrder } from '../services/workOrderService';
import type { CategoryScaled, WorkOrderData, GeneratedWorkOrder } from '../types';

interface WorkOrderFormProps {
  lineItem: CategoryScaled;
  onBack: () => void;
}

const SUBCONTRACTORS = [
  'General Contractor',
  'Demolition Contractor',
  'Drywall Contractor', 
  'Painting Contractor',
  'Flooring Contractor',
  'Plumbing Contractor',
  'Electrical Contractor',
  'HVAC Contractor',
  'Roofing Contractor',
  'Carpentry/Finish Contractor',
  'Tile Contractor',
  'Insulation Contractor',
  'Windows & Doors Contractor',
  'Landscaping Contractor',
  'Other'
];

export const WorkOrderForm: React.FC<WorkOrderFormProps> = ({ lineItem, onBack }) => {
  const [formData, setFormData] = useState<Omit<WorkOrderData, 'lineItemId'>>({
    category: lineItem.category,
    materialAmount: lineItem.materialScaled,
    laborAmount: lineItem.laborScaled,
    totalAmount: lineItem.totalScaled,
    subcontractor: '',
    scopeOfWork: lineItem.descriptionSummary || '',
    additionalDetails: '',
    timeline: '',
    specialRequirements: ''
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedWorkOrder, setGeneratedWorkOrder] = useState<GeneratedWorkOrder | null>(null);

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateWorkOrder = async () => {
    if (!formData.subcontractor || !formData.scopeOfWork) {
      setError('Please select a subcontractor and provide scope of work details.');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const workOrderData: WorkOrderData = {
        lineItemId: lineItem.id,
        ...formData
      };
      
      const result = await generateWorkOrder(workOrderData);
      setGeneratedWorkOrder(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate work order';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintWorkOrder = () => {
    if (!generatedWorkOrder) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Work Order ${generatedWorkOrder.workOrderNumber}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
              h1, h2, h3 { color: #333; }
              .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
              pre { white-space: pre-wrap; font-family: Arial, sans-serif; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Work Order ${generatedWorkOrder.workOrderNumber}</h1>
              <p>Generated on: ${new Date().toLocaleDateString()}</p>
            </div>
            <pre>${generatedWorkOrder.content}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (generatedWorkOrder) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            Back to Budget
          </button>
          <div className="flex gap-3">
            <button
              onClick={handlePrintWorkOrder}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Print Work Order
            </button>
            <button
              onClick={() => setGeneratedWorkOrder(null)}
              className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300"
            >
              Create Another
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4 pb-4 border-b">
            <h2 className="text-2xl font-bold text-slate-900">Work Order Generated</h2>
            <span className="text-lg font-semibold text-indigo-600">{generatedWorkOrder.workOrderNumber}</span>
          </div>
          
          <div className="prose max-w-none">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-700 bg-slate-50 p-4 rounded-md">
              {generatedWorkOrder.content}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Back to Budget
        </button>
        <h2 className="text-2xl font-bold text-slate-900">Create Work Order</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {isGenerating ? (
        <Loader />
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Project Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Category:</span>
                  <span className="font-medium">{lineItem.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Material Budget:</span>
                  <span className="font-medium">${lineItem.materialScaled.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Labor Budget:</span>
                  <span className="font-medium">${lineItem.laborScaled.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-slate-600 font-semibold">Total Budget:</span>
                  <span className="font-bold text-indigo-600">${lineItem.totalScaled.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Subcontractor *
              </label>
              <select
                value={formData.subcontractor}
                onChange={(e) => handleInputChange('subcontractor', e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              >
                <option value="">Choose a subcontractor...</option>
                {SUBCONTRACTORS.map(contractor => (
                  <option key={contractor} value={contractor}>{contractor}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Scope of Work *
            </label>
            <textarea
              value={formData.scopeOfWork}
              onChange={(e) => handleInputChange('scopeOfWork', e.target.value)}
              rows={4}
              className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Describe the work to be performed..."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Additional Details
            </label>
            <textarea
              value={formData.additionalDetails}
              onChange={(e) => handleInputChange('additionalDetails', e.target.value)}
              rows={3}
              className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Any additional specifications, materials, or requirements..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Timeline
              </label>
              <input
                type="text"
                value={formData.timeline}
                onChange={(e) => handleInputChange('timeline', e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., 5 business days, 2 weeks..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Special Requirements
              </label>
              <input
                type="text"
                value={formData.specialRequirements}
                onChange={(e) => handleInputChange('specialRequirements', e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Safety, permits, coordination, etc..."
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              onClick={handleGenerateWorkOrder}
              disabled={!formData.subcontractor || !formData.scopeOfWork}
              className="px-6 py-3 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              Generate Professional Work Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
};