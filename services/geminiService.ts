
import { GoogleGenAI, Type } from "@google/genai";
import { ChatMessage } from "../types";

const getAI = () => {
  const apiKey = (process.env as any).GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not found. Please ensure it is set in the environment.');
  }
  return new GoogleGenAI({ apiKey });
};

const MODEL_NAME = "gemini-2.5-flash";

export const analyzeGrievanceState = async (complaintText: string, history: ChatMessage[]) => {
  try {
    const ai = getAI();

    const historyText = (history || []).map((m: any) => `${m.role}: ${m.content}`).join("\n");

    const prompt = `
      HISTORY:
      ${historyText}
      
      NEW USER INPUT:
      "${complaintText}"
      
      Analyze this institutional grievance.
      Map departments to: Technical, Infrastructure, Academic, Administrative, Mess, Hostel, Transport.
    `;

    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isDetailedEnough: { type: Type.BOOLEAN },
            followUpQuestion: { type: Type.STRING },
            summary: { type: Type.STRING },
            department: { type: Type.STRING },
            severity: { type: Type.STRING },
            sentiment: { type: Type.STRING },
            initialStatus: { type: Type.STRING },
            fingerprint: { type: Type.STRING }
          },
          required: ["isDetailedEnough", "summary", "department", "severity", "sentiment", "initialStatus", "fingerprint"],
        },
        systemInstruction: "You are the DAIT Redressal Analyst. Provide a structured analysis of the grievance.",
      }
    });

    return JSON.parse(result.text || "{}");
  } catch (error) {
    console.error('AI Error:', error);
    // Fallback logic if AI fails
    return {
      isDetailedEnough: false,
      followUpQuestion: 'Please describe the issue with the location, department, and what exactly happened.',
      summary: complaintText.slice(0, 50),
      department: 'Other',
      severity: 'Medium',
      sentiment: 'Neutral',
      initialStatus: 'pending',
      fingerprint: 'GEN-' + Date.now()
    };
  }
};

export const getStaffAssistance = async (grievance: any) => {
  try {
    const ai = getAI();

    const prompt = `
      Case Details:
      Title: ${grievance.title}
      Description: ${grievance.description}
      Department: ${grievance.department}
      Status: ${grievance.status}
      
      History:
      ${JSON.stringify(grievance.history, null, 2)}
      
      Conversation:
      ${JSON.stringify(grievance.conversation, null, 2)}
      
      Task:
      1. Summarize the case details and the flow of actions based on the history and conversation.
      2. Give professional, actionable suggestions for solving this issue practically.
    `;

    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: "You are a professional Staff Problem Solver. Provide concise summaries and effective resolution strategies.",
      }
    });

    return result.text;
  } catch (error) {
    console.error('AI Error:', error);
    return 'Staff mediator currently unavailable.';
  }
};

export const getGrievanceSummary = async (id: string, grievanceData?: any) => {
  try {
    const ai = getAI();

    const prompt = `
      Analyze and summarize the following institutional grievance:
      Title: ${grievanceData?.title || 'N/A'}
      Description: ${grievanceData?.description || 'N/A'}
      Department: ${grievanceData?.department || 'N/A'}
      Status: ${grievanceData?.status || 'N/A'}
      
      Please provide:
      1. A concise 2-sentence summary.
      2. Key action points or root causes identified.
      3. A professional tone recommendation for the response.
      
      Format as JSON with keys: "summary", "actionPoints", "toneRecommendation".
    `;

    const result = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            actionPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
            toneRecommendation: { type: Type.STRING }
          },
          required: ["summary", "actionPoints", "toneRecommendation"]
        }
      }
    });

    return JSON.parse(result.text || "{}");
  } catch (error) {
    console.error('AI Summary Error:', error);
  }
  return null;
};
