import React, { useState, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { FileUpload } from '../FileUpload';
import { BudgetDisplay } from '../BudgetDisplay';
import { Loader } from '../Loader';
import { ErrorMessage } from '../ErrorMessage';
import { generateBudgetFromPdf, extractCustomerFromPdf } from '../../services/geminiService';
import { reconcileBudget } from '../../utils/reconcile';
import { fileToBase64 } from '../../utils/fileUtils';
import { supabase } from '../../lib/supabase';
import type { ReconcileResult, BudgetData, ReconcileInput, CategoryScaled } from '../../types';

const r2 = (n: number) => Math.round(n * 100) / 100;

export const UploadPage: React.FC = () => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [reconciledResult, setReconciledResult] = useState<ReconcileResult | null>(null);
  const [selectedLineItem, setSelectedLineItem] = useState<CategoryScaled | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const handleFileProcess = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setIsLoading(true);
    setError(null);
    setBudgetData(null);
    setReconciledResult(null);
    setSelectedLineItem(null);

    try {
      const { base64, mimeType } = await fileToBase64(selectedFile);
      
      let savedCustomerId: string | null = null;
      
      // Extract customer information from PDF
      if (user) {
        try {
          const customerData = await extractCustomerFromPdf(base64, mimeType, selectedFile.name);
          if (customerData && customerData.name) {
            // Check if customer already exists
            const { data: existingCustomer } = await supabase
              .from('customers')
              .select('id')
              .eq('user_id', user.id)
              .eq('name', customerData.name)
              .maybeSingle();

            if (!existingCustomer) {
              // Save new customer to database
              const { data: newCustomer, error: customerError } = await supabase
                .from('customers')
                .insert([{
                  user_id: user.id,
                  name: customerData.name,
                  email: customerData.email,
                  phone: customerData.phone,
                  address: customerData.address,
                  city: customerData.city,
                  state: customerData.state,
                  zip_code: customerData.zip_code
                }])
                .select()
                .single();
              
              if (!customerError && newCustomer) {
                savedCustomerId = newCustomer.id;
              }
            } else {
              savedCustomerId = existingCustomer.id;
            }
          }
        } catch (customerError) {
          console.log('Customer extraction failed, continuing with budget processing:', customerError);
        }
      }
      
      const geminiResponse = await generateBudgetFromPdf(base64, mimeType, selectedFile.name);

      const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
      const match = geminiResponse.match(jsonRegex);

      if (!match || !match[1]) {
        throw new Error("Could not find a valid JSON block in the AI's response.");
      }
      
      const parsedJson = JSON.parse(match[1]);
      const markdown = geminiResponse.replace(jsonRegex, '').trim();

      const categoriesWithIds = parsedJson.categories.map((c: any, i: number) => ({...c, id: `cat-${Date.now()}-${i}`}));
      const newBudgetData: BudgetData = { json: {...parsedJson, categories: categoriesWithIds }, markdown };
      setBudgetData(newBudgetData);

      if (newBudgetData.json.definitive.totalProjectBudget === null) {
          throw new Error(newBudgetData.json.footnotes.join(' '));
      }

      // Save the initial budget to database if we have a customer
      if (user && savedCustomerId && newBudgetData.json.definitive.totalProjectBudget) {
        try {
          const { data: savedEstimate, error: estimateError } = await supabase
            .from('insurance_estimates')
            .insert([{
              user_id: user.id,
              customer_id: savedCustomerId,
              file_name: selectedFile.name,
              definitive_total: newBudgetData.json.definitive.totalProjectBudget,
              budget_data: newBudgetData.json,
              reconciled_data: null, // Will be updated when reconciled
              status: 'processed'
            }])
            .select()
            .single();
          
          if (!estimateError && savedEstimate) {
            // Add estimate ID to categories for work order creation
            const categoriesWithEstimate = newBudgetData.json.categories.map(c => ({
              ...c,
              estimateId: savedEstimate.id,
              customerId: savedCustomerId
            }));
            setBudgetData(prev => prev ? {
              ...prev,
              json: { ...prev.json, categories: categoriesWithEstimate }
            } : null);
          }
        } catch (estimateError) {
          console.log('Failed to save estimate, continuing:', estimateError);
        }
      }

      const reconcileInput: ReconcileInput = {
        definitiveTotal: newBudgetData.json.definitive.totalProjectBudget,
        oAndPPercent: newBudgetData.json.definitive.oAndPPercent,
        taxRate: newBudgetData.json.definitive.taxRate,
        categoriesPre: newBudgetData.json.categories,
      };

      const result = reconcileBudget(reconcileInput);
      setReconciledResult(result);
      setHasUnsavedChanges(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to process the estimate. Reason: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleCategoriesChange = useCallback((updatedCategories: CategoryScaled[]) => {
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
        
        // Save updated categories to database
        if (user && budgetData.json.categories[0] && (budgetData.json.categories[0] as any).estimateId) {
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
        // Handle cases where reconciliation isn't possible (e.g., all items deleted)
        const definitiveTotal = budgetData.json.definitive.totalProjectBudget ?? 0;
        const oAndPPercent = budgetData.json.definitive.oAndPPercent;
        const oAndP = r2(definitiveTotal * oAndPPercent);

        const emptyResult: ReconcileResult = {
          scalingFactor: 0,
          oAndP: oAndP,
          categories: updatedCategories,
          subtotalLinesScaled: 0,
          materialTax: 0,
          grandTotal: oAndP,
          residualAdjustment: null,
        };
        setReconciledResult(emptyResult);
      }

  }, [budgetData, user]);

  const handleBudgetUpdate = useCallback((update: { oAndPPercent: number }) => {
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
        if (user && budgetData.json.categories[0] && (budgetData.json.categories[0] as any).estimateId) {
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
  }, [budgetData, reconciledResult, user]);
  
  const handleReset = () => {
    setFile(null);
    setIsLoading(false);
    setError(null);
    setBudgetData(null);
    setReconciledResult(null);
    setSelectedLineItem(null);
    setHasUnsavedChanges(false);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Upload Insurance Estimate</h2>
        <p className="text-slate-600 mt-2">Upload a PDF estimate to generate a scaled budget with AI</p>
      </div>
      
      {isLoading ? (
        <Loader />
      ) : error ? (
        <ErrorMessage message={error} onReset={handleReset} />
      ) : reconciledResult && budgetData ? (
        <BudgetDisplay 
          budgetData={budgetData}
          reconciledResult={reconciledResult}
          onCategoriesChange={handleCategoriesChange}
          onBudgetUpdate={handleBudgetUpdate}
          hasUnsavedChanges={hasUnsavedChanges}
          onReset={handleReset}
          fileName={file?.name || 'estimate.pdf'}
          selectedLineItem={selectedLineItem}
          onSelectLineItem={setSelectedLineItem}
        />
      ) : (
        <FileUpload onFileSelect={handleFileProcess} />
      )}
    </div>
  );
};