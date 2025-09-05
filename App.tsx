
import React, { useState, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import { AuthForm } from './components/auth/AuthForm';
import { Navigation } from './components/layout/Navigation';
import { CustomerList } from './components/customers/CustomerList';
import { SubcontractorList } from './components/subcontractors/SubcontractorList';
import { FileUpload } from './components/FileUpload';
import { BudgetDisplay } from './components/BudgetDisplay';
import { Loader } from './components/Loader';
import { ErrorMessage } from './components/ErrorMessage';
import { generateBudgetFromPdf, extractCustomerFromPdf } from './services/geminiService';
import { reconcileBudget } from './utils/reconcile';
import { fileToBase64 } from './utils/fileUtils';
import { supabase } from './lib/supabase';
import type { ReconcileResult, BudgetData, ReconcileInput, CategoryScaled } from './types';

const r2 = (n: number) => Math.round(n * 100) / 100;

const App: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [reconciledResult, setReconciledResult] = useState<ReconcileResult | null>(null);
  const [selectedLineItem, setSelectedLineItem] = useState<CategoryScaled | null>(null);

  const handleFileProcess = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setIsLoading(true);
    setError(null);
    setBudgetData(null);
    setReconciledResult(null);
    setSelectedLineItem(null);

    try {
      const { base64, mimeType } = await fileToBase64(selectedFile);
      
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
              await supabase
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
                }]);
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

      const reconcileInput: ReconcileInput = {
        definitiveTotal: newBudgetData.json.definitive.totalProjectBudget,
        oAndPPercent: newBudgetData.json.definitive.oAndPPercent,
        taxRate: newBudgetData.json.definitive.taxRate,
        categoriesPre: newBudgetData.json.categories,
      };

      const result = reconcileBudget(reconcileInput);
      setReconciledResult(result);
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

  }, [budgetData]);

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
      } catch (err) {
        console.error("Reconciliation failed on budget update:", err);
      }
  }, [budgetData, reconciledResult]);
  
  const handleReset = () => {
    setFile(null);
    setIsLoading(false);
    setError(null);
    setBudgetData(null);
    setReconciledResult(null);
    setSelectedLineItem(null);
  };

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
      case 'customers':
        return <CustomerList />;
      case 'subcontractors':
        return <SubcontractorList />;
      case 'estimates':
        return <div className="text-center p-8">Estimates page coming soon...</div>;
      case 'work-orders':
        return <div className="text-center p-8">Work Orders page coming soon...</div>;
      default:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900">Upload Insurance Estimate</h2>
              <p className="text-slate-600 mt-2">Upload a PDF estimate to generate a scaled budget</p>
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
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          {renderCurrentPage()}
        </div>
        </main>
    </div>
  );
};

export default App;
