
import type { CategoryPre, CategoryScaled, ReconcileInput, ReconcileResult } from '../types';

const r2 = (n: number) => Math.round(n * 100) / 100;
const r4 = (n: number) => Math.round(n * 10000) / 10000;

export function reconcileBudget(input: ReconcileInput): ReconcileResult {
  const p = input.oAndPPercent ?? 0.30;
  const tax = input.taxRate ?? 0.07;
  const B = input.definitiveTotal;

  const BASE_MATERIAL = input.categoriesPre.reduce((s, c) => s + (c.materialPre || 0), 0);
  const BASE_LABOR    = input.categoriesPre.reduce((s, c) => s + (c.laborPre || 0), 0);
  const BASE_LINES    = BASE_MATERIAL + BASE_LABOR;

  if (B <= 0 || BASE_LINES <= 0) {
    throw new Error("Invalid totals: definitive total and pre-scale lines must be > 0");
  }

  const O = r2(B * p);
  const S = (B - O) / (BASE_LINES + tax * BASE_MATERIAL);

  const categoriesScaled = input.categoriesPre.map((c): CategoryScaled => {
    const m = r2((c.materialPre || 0) * S);
    const l = r2((c.laborPre || 0) * S);
    return {
      id: c.id,
      category: c.category,
      descriptionSummary: c.descriptionSummary,
      materialPre: c.materialPre || 0,
      laborPre: c.laborPre || 0,
      materialScaled: m,
      laborScaled: l,
      totalScaled: r2(m + l),
    };
  });

  let subtotal = categoriesScaled.reduce((s, c) => s + c.totalScaled, 0);
  let matScaled = categoriesScaled.reduce((s, c) => s + c.materialScaled, 0);
  let materialTax = r2(tax * matScaled);
  let grand = r2(subtotal + materialTax + O);

  let residual: ReconcileResult["residualAdjustment"] = null;

  if (grand !== r2(B)) {
    const delta = r2(B - grand);
    const idx = categoriesScaled
      .map((c, i) => ({ i, m: c.materialScaled }))
      .sort((a, b) => b.m - a.m)[0]?.i ?? 0;

    if (categoriesScaled[idx]) {
        categoriesScaled[idx].materialScaled = r2(categoriesScaled[idx].materialScaled + delta);
        categoriesScaled[idx].totalScaled = r2(categoriesScaled[idx].materialScaled + categoriesScaled[idx].laborScaled);

        // recompute totals
        subtotal = r2(categoriesScaled.reduce((s, c) => s + c.totalScaled, 0));
        matScaled = r2(categoriesScaled.reduce((s, c) => s + c.materialScaled, 0));
        materialTax = r2(tax * matScaled);
        grand = r2(subtotal + materialTax + O);

        residual = {
          amount: delta,
          appliedToCategory: categoriesScaled[idx].category,
          note: "Minor rounding adjustment applied to Materials to reconcile grand total."
        };
    }
  }

  return {
    scalingFactor: r4(S),
    oAndP: O,
    categories: categoriesScaled,
    subtotalLinesScaled: subtotal,
    materialTax,
    grandTotal: grand,
    residualAdjustment: residual
  };
}
