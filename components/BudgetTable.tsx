
import React, { useState, useEffect } from 'react';
import type { CategoryScaled } from '../types';
import { TrashIcon } from './icons/TrashIcon';
import { FileTextIcon } from './icons/FileTextIcon';

interface BudgetTableProps {
  categories: CategoryScaled[];
  onCategoriesChange: (categories: CategoryScaled[]) => void;
  onCreateWorkOrder: (lineItem: CategoryScaled) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export const BudgetTable: React.FC<BudgetTableProps> = ({ categories, onCategoriesChange, onCreateWorkOrder }) => {
  const [localCategories, setLocalCategories] = useState<CategoryScaled[]>(categories);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const handleInputChange = (id: string | number, field: keyof CategoryScaled, value: string | number) => {
    const updatedCategories = localCategories.map(cat => {
      if (cat.id === id) {
        const newCat = { ...cat, [field]: value };
        if (field === 'materialScaled' || field === 'laborScaled') {
          const mat = typeof newCat.materialScaled === 'string' ? parseFloat(newCat.materialScaled) : newCat.materialScaled;
          const lab = typeof newCat.laborScaled === 'string' ? parseFloat(newCat.laborScaled) : newCat.laborScaled;
          newCat.totalScaled = r2((mat || 0) + (lab || 0));
          if(field === 'materialScaled') newCat.materialScaled = mat || 0;
          if(field === 'laborScaled') newCat.laborScaled = lab || 0;
        }
        return newCat;
      }
      return cat;
    });
    setLocalCategories(updatedCategories);
  };
  
  const handleBlur = () => {
    onCategoriesChange(localCategories);
  };

  const handleAddItem = () => {
    const newItem: CategoryScaled = {
      id: `new-${Date.now()}`,
      category: 'New Item',
      descriptionSummary: '',
      materialPre: 0,
      laborPre: 0,
      materialScaled: 0,
      laborScaled: 0,
      totalScaled: 0,
    };
    const updatedCategories = [...localCategories, newItem];
    setLocalCategories(updatedCategories);
    onCategoriesChange(updatedCategories);
  };

  const handleDeleteItem = (id: string | number) => {
    const updatedCategories = localCategories.filter(cat => cat.id !== id);
    setLocalCategories(updatedCategories);
    onCategoriesChange(updatedCategories);
  };

  const inputClass = "w-full bg-transparent p-1 -m-1 rounded-md focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:outline-none";

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <h3 className="text-lg font-semibold text-slate-900 p-4 border-b border-slate-200">Budget Line Items</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/4">Category</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider w-1/3">Description</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Material</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Labor</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
              <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-slate-200">
            {localCategories.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 group">
                <td className="px-6 py-2 whitespace-nowrap text-sm font-medium text-slate-900">
                  <input type="text" value={item.category} onChange={e => handleInputChange(item.id, 'category', e.target.value)} onBlur={handleBlur} className={inputClass} />
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-slate-500">
                   <input type="text" value={item.descriptionSummary} onChange={e => handleInputChange(item.id, 'descriptionSummary', e.target.value)} onBlur={handleBlur} className={inputClass} />
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-slate-600 text-right">
                   <input type="number" value={item.materialScaled} onChange={e => handleInputChange(item.id, 'materialScaled', e.target.value)} onBlur={handleBlur} className={`${inputClass} text-right`} />
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm text-slate-600 text-right">
                   <input type="number" value={item.laborScaled} onChange={e => handleInputChange(item.id, 'laborScaled', e.target.value)} onBlur={handleBlur} className={`${inputClass} text-right`} />
                </td>
                <td className="px-6 py-2 whitespace-nowrap text-sm font-semibold text-slate-900 text-right">{formatCurrency(item.totalScaled)}</td>
                <td className="px-6 py-2 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onCreateWorkOrder(item)}
                      className="text-slate-400 hover:text-indigo-600"
                      title="Create Work Order"
                    >
                      <FileTextIcon className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteItem(item.id)} 
                      className="text-slate-400 hover:text-red-600"
                      title="Delete Item"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-slate-50 border-t border-slate-200">
        <button onClick={handleAddItem} className="text-sm font-medium text-indigo-600 hover:text-indigo-800">
          + Add Line Item
        </button>
      </div>
    </div>
  );
};
