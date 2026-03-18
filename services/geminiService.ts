
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

const getUserConversationText = (history: ChatMessage[], complaintText: string) => {
  const priorUserText = (history || [])
    .filter((m) => m.role === 'user')
    .map((m) => m.content.trim())
    .filter(Boolean)
    .join('\n');

  return [priorUserText, complaintText.trim()].filter(Boolean).join('\n').trim();
};

const detectDepartment = (text: string) => {
  const normalized = text.toLowerCase();
  if (/(hostel|warden|room|bathroom|water|toilet|washroom)/.test(normalized)) return 'Hostel';
  if (/(mess|food|canteen|meal|kitchen)/.test(normalized)) return 'Mess';
  if (/(bus|transport|van|driver|route)/.test(normalized)) return 'Transport';
  if (/(class|faculty|professor|lecture|exam|marks|attendance|academic|department|cse|ece|it|mech)/.test(normalized)) return 'Academic';
  if (/(wifi|internet|projector|computer|system|software|portal|technical|website|lab)/.test(normalized)) return 'Technical';
  if (/(building|bench|fan|light|electrical|infrastructure|ceiling|floor|lift)/.test(normalized)) return 'Infrastructure';
  if (/(office|certificate|fees|administration|administrative|clerk)/.test(normalized)) return 'Administrative';
  return 'Other';
};

const detectSeverity = (text: string) => {
  const normalized = text.toLowerCase();
  if (/(emergency|urgent|critical|unsafe|danger|shock|fire|injury)/.test(normalized)) return 'Critical';
  if (/(immediately|since yesterday|not working|no water|no power|serious|major)/.test(normalized)) return 'High';
  if (/(issue|problem|delay|complaint)/.test(normalized)) return 'Medium';
  return 'Low';
};

const detectSentiment = (text: string) => {
  const normalized = text.toLowerCase();
  if (/(urgent|immediately|critical|emergency)/.test(normalized)) return 'Urgent';
  if (/(angry|worst|terrible|unacceptable)/.test(normalized)) return 'Angry';
  if (/(frustrated|problem|issue|complaint|not working|no water)/.test(normalized)) return 'Frustrated';
  return 'Neutral';
};

const hasLocation = (text: string) => {
  const normalized = text.toLowerCase();
  return /(room|hostel|block|floor|lab|building|classroom|canteen|library|office|bus|gate|department)/.test(normalized);
};

const hasIssueDescription = (text: string) => {
  const normalized = text.toLowerCase();
  return /(issue|problem|water|power|wifi|food|clean|dirty|leak|broken|delay|harass|complaint|not working|stopped)/.test(normalized);
};

const buildFollowUpQuestion = (text: string) => {
  const missing: string[] = [];
  if (!hasLocation(text)) missing.push('exact location');
  if (!hasIssueDescription(text)) missing.push('what exactly happened');
  if (!/(department|hostel|mess|transport|academic|technical|administrative|infrastructure|cse|ece|it|mech)/i.test(text)) {
    missing.push('related department');
  }

  if (missing.length === 0) {
    return 'Please add when this started and how it is affecting you.';
  }

  return `Please provide the ${missing.join(', ')}.`;
};

const buildSummary = (text: string) => {
  const condensed = text.replace(/\s+/g, ' ').trim();
  return condensed.length > 140 ? `${condensed.slice(0, 137)}...` : condensed;
};

const buildFallbackAnalysis = (complaintText: string, history: ChatMessage[]) => {
  const fullText = getUserConversationText(history, complaintText);
  const detailedEnough = hasLocation(fullText) && hasIssueDescription(fullText) && fullText.length >= 25;

  return {
    isDetailedEnough: detailedEnough,
    followUpQuestion: detailedEnough ? 'Type Confirm to finalize filing.' : buildFollowUpQuestion(fullText),
    summary: buildSummary(fullText || complaintText),
    department: detectDepartment(fullText),
    severity: detectSeverity(fullText),
    sentiment: detectSentiment(fullText),
    initialStatus: 'pending',
    fingerprint: 'GEN-' + Date.now()
  };
};

const normalizeAIResult = (resultText: string | undefined, complaintText: string, history: ChatMessage[]) => {
  const fallback = buildFallbackAnalysis(complaintText, history);
  if (!resultText) return fallback;

  try {
    const parsed = JSON.parse(resultText);
    return {
      isDetailedEnough: typeof parsed.isDetailedEnough === 'boolean' ? parsed.isDetailedEnough : fallback.isDetailedEnough,
      followUpQuestion: parsed.followUpQuestion || fallback.followUpQuestion,
      summary: parsed.summary || fallback.summary,
      department: parsed.department || fallback.department,
      severity: parsed.severity || fallback.severity,
      sentiment: parsed.sentiment || fallback.sentiment,
      initialStatus: parsed.initialStatus || fallback.initialStatus,
      fingerprint: parsed.fingerprint || fallback.fingerprint,
    };
  } catch {
    return fallback;
  }
};

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

    return normalizeAIResult(result.text, complaintText, history);
  } catch (error) {
    console.error('AI Error:', error);
    return buildFallbackAnalysis(complaintText, history);
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
