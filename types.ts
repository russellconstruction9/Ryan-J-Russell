
export type CategoryPre = {
  id: string | number;
  category: string;
  descriptionSummary?: string;
  materialPre: number;
  laborPre: number;
};

export type ReconcileInput = {
  definitiveTotal: number;
  oAndPPercent?: number;
  taxRate?: number;
  categoriesPre: (CategoryPre | CategoryScaled)[];
};

export type CategoryScaled = {
  id: string | number;
  category: string;
  descriptionSummary?: string;
  materialPre: number;
  laborPre: number;
  materialScaled: number;
  laborScaled: number;
  totalScaled: number;
};

export type ResidualAdjustment = {
    amount: number;
    appliedToCategory: string;
    note: string;
} | null;

export type ReconcileResult = {
  scalingFactor: number;
  oAndP: number;
  categories: CategoryScaled[];
  subtotalLinesScaled: number;
  materialTax: number;
  grandTotal: number;
  residualAdjustment: ResidualAdjustment;
};

export interface BudgetJson {
  definitive: {
    totalProjectBudget: number | null;
    source: "filename" | "RCV";
    oAndPPercent: number;
    oAndP: number;
    taxRate: number;
    scalingFactor: number;
    materialTax: number;
    residualAdjustment: {
      amount: number;
      appliedToCategory: string;
      note: string;
    } | null;
  };
  totals: {
    materialsPre: number;
    laborPre: number;
    linesPre: number;
    materialsScaled: number;
    laborScaled: number;
    subtotalLinesScaled: number;
    grandTotal: number;
  };
  categories: Array<{
    id: string | number;
    category: string;
    descriptionSummary: string;
    materialPre: number;
    laborPre: number;
    materialScaled: number;
    laborScaled: number;
    totalScaled: number;
  }>;
  footnotes: string[];
}

export interface BudgetData {
  json: BudgetJson;
  markdown: string;
}

export interface WorkOrderData {
  lineItemId: string | number;
  category: string;
  materialAmount: number;
  laborAmount: number;
  totalAmount: number;
  subcontractor: string;
  scopeOfWork: string;
  additionalDetails: string;
  timeline: string;
  specialRequirements: string;
}

export interface GeneratedWorkOrder {
  workOrderNumber: string;
  content: string;
}
