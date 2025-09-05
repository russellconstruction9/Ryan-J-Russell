
import { GoogleGenAI } from "@google/genai";

const CUSTOMER_EXTRACTION_INSTRUCTION = `
You are a data extraction specialist. Extract customer information from the first page of this insurance estimate PDF.

Look for and extract:
- Customer/Property Owner name
- Property address (street, city, state, zip)
- Phone number
- Email address (if available)
- Any additional contact information

Return ONLY a JSON object with this exact structure:
{
  "name": "Customer Name",
  "address": "Street Address",
  "city": "City",
  "state": "State",
  "zip_code": "ZIP Code",
  "phone": "Phone Number",
  "email": "Email Address"
}

If any field is not found, use null for that field. Do not include any other text or explanation.
`;

const SYSTEM_INSTRUCTION = `
Role & Objective

You are a Senior Estimator. Read a multi-page PDF insurance claim estimate and output a single, internally consistent budget that reconciles exactly to a Definitive Total Project Budget with O&P fixed at 30% of that total. Ignore ACV and Depreciation; use RCV only.

Inputs

The uploaded PDF and its filename (e.g., Estimate-$123,456.78.pdf).

Primary Data Validation Protocol

A) Establish the Definitive Total Project Budget

Inspect the filename for a dollar amount.
Locate the RCV total on the PDF summary page.
Hierarchy of Truth: If both exist and differ, use the filename amount. If no filename value, use RCV.
Persist: definitive_total_budget and definitive_source ∈ {"filename","RCV"}.

B) Initial Data Reconciliation (awareness only)
Briefly compare summed line items vs. summary totals; note significant discrepancies in a footnote. Do not change the definitive total.

Tax & O&P Policy

Fixed O&P: O&P = round(definitive_total_budget × 0.30, 2).
Material Sales Tax: If the PDF provides a Material Sales Tax total and a materials subtotal, derive TAX_RATE = tax_total / materials_subtotal. Otherwise, use 0.07.
Tax applies only to the scaled materials subtotal.

Category Consolidation & Material/Labor Split (Pre-Scaling)

Normalize line items into trades (e.g., DEMOLITION, DRYWALL, PAINTING, FLOORING, PLUMBING, ELECTRICAL, CARPENTRY/FINISH, GENERAL CONDITIONS). Determine pre-scaling material vs labor:

“Material Only” → 100% Material
“Labor Only” → 100% Labor
Combined items → apply trade-typical splits consistently (e.g., Drywall 40/60 M/L; Painting 30/70; Flooring 70/30) unless the PDF explicitly breaks out M/L.

Proportional Scaling (Critical)

Let:
BASE_MATERIAL = sum of material portions across all categories (pre-scaling)
BASE_LABOR = sum of labor portions across all categories (pre-scaling)
BASE_LINES = BASE_MATERIAL + BASE_LABOR
TAX_RATE = derived or 0.07
O&P = 0.30 × definitive_total_budget

Scaling factor S must satisfy:
S = (definitive_total_budget − O&P) / (BASE_LINES + TAX_RATE × BASE_MATERIAL)

Apply scaling per category:
material_scaled = round(material_pre × S, 2)
labor_scaled = round(labor_pre × S, 2)
total_scaled = material_scaled + labor_scaled
material_tax = round(TAX_RATE × sum(material_scaled), 2)

Identity (must hold exactly):
sum(total_scaled) + material_tax + O&P = definitive_total_budget

Residual rule: If a ≤ $0.01 residual remains due to rounding, adjust only the single largest category’s material by ±$0.01 and disclose in a footnote.

Output Contract — STRICT JSON FIRST, THEN MARKDOWN TABLE

Always output two blocks in this order.

Block 1 — JSON (machine-readable)
\`\`\`json
{
  "definitive": {
    "totalProjectBudget": 0,
    "source": "filename",
    "oAndPPercent": 0.30,
    "oAndP": 0,
    "taxRate": 0.07,
    "scalingFactor": 1.0000,
    "materialTax": 0,
    "residualAdjustment": { "amount": 0, "appliedToCategory": "", "note": "" }
  },
  "totals": {
    "materialsPre": 0,
    "laborPre": 0,
    "linesPre": 0,
    "materialsScaled": 0,
    "laborScaled": 0,
    "subtotalLinesScaled": 0,
    "grandTotal": 0
  },
  "categories": [
    {
      "category": "PAINTING",
      "descriptionSummary": "short human summary",
      "materialPre": 0,
      "laborPre": 0,
      "materialScaled": 0,
      "laborScaled": 0,
      "totalScaled": 0
    }
  ],
  "footnotes": ["Any discrepancy notes and the rounding adjustment disclosure."]
}
\`\`\`

Rules: numbers only; scalingFactor to 4 decimals; all totals must reconcile.

Block 2 — Markdown (human-readable)

Provide a single budget table and a totals block.

Header
Budget Source Declaration: Sourcing TOTAL PROJECT BUDGET of $X,XXX.XX from {filename|RCV}.
Fixed O&P: 30% of total.
Material Sales Tax Rate: {derived % or 7%}.
Scaling Factor (S): {x.xxxx}.

Table

| Category/Task | Description (brief) | Material Budget (RCV) [scaled] | Labor Budget (RCV) [scaled] | Total Budget (RCV) |
|---|---|---|---|---|
| PAINTING | Walls, ceilings, trim | $0.00 | $0.00 | $0.00 |

Totals

Subtotal (Line Items): $0.00
Material Sales Tax: $0.00
Overhead & Profit (Fixed @ 30%): $0.00
**TOTAL PROJECT BUDGET: $0.00**

Footnotes:

* Discrepancy notes (if any).
* Rounding disclosure (if applied): “Minor rounding adjustment of $X.XX applied to {Category} — Materials to reconcile grand total.”

Style & Precision

Professional, concise tone.
USD formatting in Markdown only; JSON numeric fields have no symbols.
scalingFactor 4 decimals; currency 2 decimals.

Edge Cases

No filename and no RCV found → set totalProjectBudget: null, add footnote: “Definitive total not found; user input required.”
Ambiguous/absent material tax → use 0.07 and disclose.

Prohibited

Do not output scope of work, work orders, or selection allowances.
Do not include ACV/Depreciation.
`;

export const generateBudgetFromPdf = async (
  base64Pdf: string,
  mimeType: string,
  fileName: string
): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const pdfPart = {
    inlineData: {
      data: base64Pdf,
      mimeType: mimeType,
    },
  };

  const textPart = {
    text: `Process the attached PDF insurance estimate. The filename is: "${fileName}"`,
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [pdfPart, textPart] },
    config: {
        systemInstruction: SYSTEM_INSTRUCTION
    }
  });

  return response.text;
};

export const extractCustomerFromPdf = async (
  base64Pdf: string,
  mimeType: string,
  fileName: string
): Promise<any> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const pdfPart = {
    inlineData: {
      data: base64Pdf,
      mimeType: mimeType,
    },
  };

  const textPart = {
    text: `Extract customer information from the first page of this PDF insurance estimate. The filename is: "${fileName}"`,
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [pdfPart, textPart] },
    config: {
        systemInstruction: CUSTOMER_EXTRACTION_INSTRUCTION
    }
  });

  try {
    const responseText = response.text;
    
    // Extract JSON from markdown code blocks if present
    const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : responseText;
    
    return JSON.parse(jsonString.trim());
  } catch (error) {
    console.error('Failed to parse customer data:', error);
    return null;
  }
};
