
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
const ALLOWED_DEPARTMENTS = ['Technical', 'Infrastructure', 'Academic', 'Administrative', 'Mess', 'Hostel', 'Transport', 'Other'] as const;
const ALLOWED_SEVERITIES = ['Low', 'Medium', 'High', 'Critical'] as const;
const ALLOWED_SENTIMENTS = ['Positive', 'Neutral', 'Frustrated', 'Angry', 'Urgent'] as const;
const ALLOWED_STATUSES = ['pending', 'in-progress', 'resolved', 'closed'] as const;

const getUserConversationText = (history: ChatMessage[], complaintText: string) => {
  const trimmedComplaintText = complaintText.trim();
  const userMessages = (history || [])
    .filter((m) => m.role === 'user')
    .map((m) => m.content.trim())
    .filter(Boolean);

  const dedupedUserMessages =
    userMessages.length > 0 && userMessages[userMessages.length - 1] === trimmedComplaintText
      ? userMessages.slice(0, -1)
      : userMessages;

  const priorUserText = dedupedUserMessages.join('\n');
  return [priorUserText, trimmedComplaintText].filter(Boolean).join('\n').trim();
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

const hasIssueDescription = (text: string) => {
  const normalized = text.toLowerCase();
  return /(issue|problem|water|power|wifi|food|clean|dirty|leak|broken|delay|harass|complaint|not working|stopped)/.test(normalized);
};

const buildFollowUpQuestion = (text: string) => {
  const missing: string[] = [];
  if (!hasIssueDescription(text)) missing.push('what exactly happened');
  const needsDepartment = !/(department|hostel|mess|transport|academic|technical|administrative|infrastructure|cse|ece|it|mech)/i.test(text);
  if (needsDepartment) missing.push('related department');

  if (missing.length === 0) {
    return 'Please add when this started and how it is affecting you.';
  }

  const departmentOptions =
    'Which department is related?\n' +
    '1. Hostel\n' +
    '2. Mess\n' +
    '3. Academic\n' +
    '4. Technical\n' +
    '5. Infrastructure\n' +
    '6. Administrative\n' +
    '7. Transport\n' +
    '8. Other';

  const question = `Please provide the ${missing.join(', ')}.`;
  return needsDepartment ? `${departmentOptions}\n\n${question}` : question;
};

const buildSummary = (text: string) => {
  const condensed = text.replace(/\s+/g, ' ').trim();
  return condensed.length > 140 ? `${condensed.slice(0, 137)}...` : condensed;
};

const buildFallbackAnalysis = (complaintText: string, history: ChatMessage[]) => {
  const fullText = getUserConversationText(history, complaintText);
  const detailedEnough = hasIssueDescription(fullText) && fullText.length >= 25;

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

const pickAllowedValue = <T extends readonly string[]>(
  value: unknown,
  allowedValues: T,
  fallbackValue: T[number]
): T[number] => {
  const normalizedValue = String(value || '').trim().toLowerCase();
  const matchedValue = allowedValues.find((allowedValue) => allowedValue.toLowerCase() === normalizedValue);
  return matchedValue || fallbackValue;
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
      department: pickAllowedValue(parsed.department, ALLOWED_DEPARTMENTS, fallback.department as (typeof ALLOWED_DEPARTMENTS)[number]),
      severity: pickAllowedValue(parsed.severity, ALLOWED_SEVERITIES, fallback.severity as (typeof ALLOWED_SEVERITIES)[number]),
      sentiment: pickAllowedValue(parsed.sentiment, ALLOWED_SENTIMENTS, fallback.sentiment as (typeof ALLOWED_SENTIMENTS)[number]),
      initialStatus: pickAllowedValue(parsed.initialStatus, ALLOWED_STATUSES, fallback.initialStatus as (typeof ALLOWED_STATUSES)[number]),
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

const buildFallbackGrievanceSummary = (grievanceData?: any) => {
  const title = String(grievanceData?.title || 'General grievance').trim();
  const description = String(grievanceData?.description || '').trim();
  const department = String(grievanceData?.department || 'General').trim();
  const status = String(grievanceData?.status || 'pending').trim();
  const summaryText = [title, description].filter(Boolean).join('. ').trim();

  const actionPoints: string[] = [];
  if (department) actionPoints.push(`Coordinate with the ${department} team for verification and action.`);
  if (description) actionPoints.push('Review the complaint details and validate the issue location/scope.');
  if (status && status !== 'resolved' && status !== 'closed') {
    actionPoints.push('Provide a status update to the student after the next concrete action.');
  }

  return {
    summary: summaryText || 'No grievance details are available for AI summarization.',
    actionPoints: actionPoints.length > 0 ? actionPoints : ['Review this grievance manually and update the student with the next action.'],
    toneRecommendation: 'Use a clear, professional, and empathetic tone while explaining next steps.'
  };
};

export const getGrievanceSummary = async (id: string, grievanceData?: any) => {
  const fallback = buildFallbackGrievanceSummary(grievanceData);
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

    const rawText = String(result.text || '').trim();
    if (!rawText) {
      return fallback;
    }

    const parsed = JSON.parse(rawText);
    return {
      summary: String(parsed.summary || fallback.summary),
      actionPoints: Array.isArray(parsed.actionPoints) && parsed.actionPoints.length > 0
        ? parsed.actionPoints.map((point: unknown) => String(point))
        : fallback.actionPoints,
      toneRecommendation: String(parsed.toneRecommendation || fallback.toneRecommendation)
    };
  } catch (error) {
    console.error('AI Summary Error:', error);
    return fallback;
  }
};
