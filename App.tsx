
import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { BudgetDisplay } from './components/BudgetDisplay';
import { Loader } from './components/Loader';
import { ErrorMessage } from './components/ErrorMessage';
import { generateBudgetFromPdf } from './services/geminiService';
import { reconcileBudget } from './utils/reconcile';
import { fileToBase64 } from './utils/fileUtils';
import type { ReconcileResult, BudgetData, ReconcileInput, CategoryScaled } from './types';

const r2 = (n: number) => Math.round(n * 100) / 100;

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [reconciledResult, setReconciledResult] = useState<ReconcileResult | null>(null);

  const handleFileProcess = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setIsLoading(true);
    setError(null);
    setBudgetData(null);
    setReconciledResult(null);

    try {
      const { base64, mimeType } = await fileToBase64(selectedFile);
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
  }, []);

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
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col items-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900">Insurance Budget Reconciler</h1>
          <p className="text-lg text-slate-600 mt-2">Upload an insurance estimate PDF to generate a scaled budget.</p>
        </header>
        <main className="bg-white rounded-xl shadow-lg p-6 sm:p-8">
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
            />
          ) : (
            <FileUpload onFileSelect={handleFileProcess} />
          )}
        </main>
        <footer className="text-center mt-8 text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Budget Reconciler Inc. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
