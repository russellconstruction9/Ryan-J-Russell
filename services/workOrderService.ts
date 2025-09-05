import { GoogleGenAI } from "@google/genai";
import type { WorkOrderData, GeneratedWorkOrder } from '../types';

const WORK_ORDER_SYSTEM_INSTRUCTION = `
You are a professional construction project manager creating clear, concise work orders for subcontractors. 

Your task is to convert the provided project details into a simple, professional work order document that includes:

1. **Header Information**
   - Work Order Number (generate a unique number like WO-2025-001)
   - Date
   - Project details
   - Subcontractor information

2. **Scope of Work**
   - Clear description of work to be performed
   - Basic materials specifications
   - Timeline and milestones

3. **Financial Details**
   - Material costs
   - Labor costs
   - Total contract amount
   - Simple payment terms

4. **Basic Requirements**
   - Safety requirements
   - Completion criteria
   - Any special requirements

Keep the work order concise and easy to read. Focus on the essential information needed to complete the work. Use simple, clear language and avoid overly complex legal terminology. The work order should be practical and actionable for subcontractors.
`;

export const generateWorkOrder = async (workOrderData: WorkOrderData): Promise<GeneratedWorkOrder> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const prompt = `
Create a professional work order for the following project:

**Project Details:**
- Category: ${workOrderData.category}
- Material Budget: $${workOrderData.materialAmount.toFixed(2)}
- Labor Budget: $${workOrderData.laborAmount.toFixed(2)}
- Total Contract Amount: $${workOrderData.totalAmount.toFixed(2)}

**Subcontractor:** ${workOrderData.subcontractor}

**Scope of Work:**
${workOrderData.scopeOfWork}

**Additional Details:**
${workOrderData.additionalDetails}

**Timeline:** ${workOrderData.timeline}

**Special Requirements:**
${workOrderData.specialRequirements}

Please generate a complete, professional work order document that can be used for contracting purposes.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: prompt }] },
    config: {
      systemInstruction: WORK_ORDER_SYSTEM_INSTRUCTION
    }
  });

  const workOrderNumber = `WO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
  
  return {
    workOrderNumber,
    content: response.text
  };
};