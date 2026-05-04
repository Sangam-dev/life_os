import { GoogleGenAI } from "@google/genai";
import { Workout, SkincareLog, SleepLog, Habit, BodyMetrics, TimelineEvent, DeepWorkTarget } from '../types';
import { dbService } from './db';

const rawGeminiApiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY || '';
const geminiApiKey = String(rawGeminiApiKey).replace(/^['\"]|['\"]$/g, '').trim();
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-1.5-flash'];

const generateWithFallbackModels = async (contents: { parts: { text: string }[] }, config?: { responseMimeType?: string }) => {
  if (!ai) {
    return null;
  }

  let lastError: unknown = null;
  for (const model of GEMINI_MODELS) {
    try {
      return await ai.models.generateContent({ model, contents: [contents], config });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

const buildLocalInsights = (data: {
  workouts: Workout[];
  skincare: SkincareLog[];
  sleep: SleepLog[];
  habits: Habit[];
  bodyMetrics: BodyMetrics[];
  deepWork: DeepWorkTarget | null;
}) => {
  const habitDone = data.habits.filter(h => h.completedToday).length;
  const habitTotal = data.habits.length;
  const latestSleep = data.sleep[0];
  const latestWorkout = data.workouts[0];
  const deepWorkRatio = data.deepWork && data.deepWork.targetHours > 0
    ? Math.round((data.deepWork.actualHours / data.deepWork.targetHours) * 100)
    : null;

  return [
    {
      title: 'Execution Baseline',
      description: `Habits completed today: ${habitDone}/${habitTotal || 0}. ${latestWorkout ? `Latest workout: ${latestWorkout.name}.` : 'No recent workout logged.'}`,
      action: habitTotal > 0 ? 'Push completion above 70% by finishing one pending habit before sleep.' : 'Create 3 daily habits to establish a measurable baseline.',
      impact: 'High',
      type: 'plan'
    },
    {
      title: 'Recovery Signal',
      description: latestSleep
        ? `Latest sleep: ${latestSleep.hours}h with quality ${latestSleep.quality}/100.`
        : 'No sleep logs found for trend analysis.',
      action: latestSleep && latestSleep.hours < 7
        ? 'Shift bedtime 30 minutes earlier for the next 3 days and re-check quality score.'
        : 'Maintain current sleep window and continue logging quality nightly.',
      impact: 'Medium',
      type: 'health'
    },
    {
      title: 'Focus Throughput',
      description: deepWorkRatio !== null
        ? `Deep work completion is ${deepWorkRatio}% of target today.`
        : 'No deep work target recorded for today.',
      action: deepWorkRatio !== null && deepWorkRatio < 100
        ? 'Schedule a 45-minute uninterrupted block to close the remaining deep-work gap.'
        : 'Set a daily deep-work target and log actual hours to unlock trend guidance.',
      impact: deepWorkRatio !== null && deepWorkRatio < 60 ? 'Critical' : 'Medium',
      type: 'growth'
    }
  ];
};

const buildLocalCoachReply = (message: string, data?: {
  workouts: Workout[];
  skincare: SkincareLog[];
  sleep: SleepLog[];
  habits: Habit[];
  bodyMetrics: BodyMetrics[];
  deepWork: DeepWorkTarget | null;
  memory?: { content: string }[];
}) => {
  if (!data) {
    return `## Local Coach\n\nNetwork AI is unavailable right now.\n\n1. Start by logging sleep, one workout, and your daily habits.\n2. Ask again and I will generate data-driven recommendations from your logs.`;
  }

  const habitDone = data.habits.filter(h => h.completedToday).length;
  const habitTotal = data.habits.length;
  const latestSleep = data.sleep[0];
  const latestWorkout = data.workouts[0];
  const deepWork = data.deepWork;
  const memoryLine = data.memory?.length ? `\n- Recent memory: ${data.memory.slice(0, 3).map((entry) => entry.content).join(' | ')}` : '';

  return `## Local Coach\n\nQuery: **${message}**\n\n### Metrics Snapshot\n- Habits today: **${habitDone}/${habitTotal || 0}**\n- Latest sleep: **${latestSleep ? `${latestSleep.hours}h (quality ${latestSleep.quality}/100)` : 'No data'}**\n- Latest workout: **${latestWorkout ? latestWorkout.name : 'No data'}**\n- Deep work today: **${deepWork ? `${deepWork.actualHours}/${deepWork.targetHours}h` : 'No data'}**${memoryLine}\n\n### Protocol\n1. Finish one incomplete habit before end of day.\n2. Add one focused work block (45 minutes).\n3. Keep logging so personalized AI coaching can be re-enabled once API access is available.`;
};

export const aiService = {
  async generateInsights(data: {
    workouts: Workout[];
    skincare: SkincareLog[];
    sleep: SleepLog[];
    habits: Habit[];
    bodyMetrics: BodyMetrics[];
    timelineEvents: TimelineEvent[];
    deepWork: DeepWorkTarget | null;
  }) {
    if (!ai) {
      return buildLocalInsights(data);
    }

    try {
      const prompt = `
        You are the LifeOS Optimization Engine. Analyze the EXACT user data provided below and generate 3 highly specific, technical, and actionable insights.
        
        CRITICAL RULES:
        1. DO NOT give generic advice. Your insights MUST directly reference the actual numbers, activities, logs, or trends in the provided data.
        2. For example, if they logged a "Push" workout, mention it. If they slept 5 hours, explicitly state "5 hours". If their deep work target was 4 hours and they did 2, reference those exact numbers.
        3. If the data is sparse or empty, acknowledge the lack of data and suggest logging specific metrics to calibrate the system.
        4. Base your analysis ONLY on the provided data. Do not hallucinate activities they haven't logged.
        
        Data:
        - Recent Workouts: ${JSON.stringify(data.workouts.slice(0, 3))}
        - Recent Skincare/Mood: ${JSON.stringify(data.skincare.slice(0, 3))}
        - Recent Sleep: ${JSON.stringify(data.sleep.slice(0, 3))}
        - Body Metrics: ${JSON.stringify(data.bodyMetrics.slice(0, 3))}
        - Deep Work Today: ${JSON.stringify(data.deepWork)}
        - Habit Completion: ${data.habits.filter(h => h.completedToday).length}/${data.habits.length} habits completed today. Details: ${JSON.stringify(data.habits.map(h => ({name: h.name, completed: h.completedToday, streak: h.streak})))}
        
        Response Format: JSON array of 3 objects with:
        - title: Short, punchy, technical title (e.g., "Circadian Realignment", "Hypertrophy Plateau")
        - description: 1-2 sentences of data-driven analysis referencing exact logged values.
        - action: A specific, actionable protocol based on their actual data.
        - impact: "High", "Medium", or "Critical".
        - type: "health" | "growth" | "plan"
      `;

      const response = await generateWithFallbackModels({ parts: [{ text: prompt }] }, {
        responseMimeType: "application/json"
      });

      if (!response) {
        return buildLocalInsights(data);
      }

      const text = response.text || "[]";
      
      const extractFirstJSON = (str: string) => {
        const firstBracket = str.indexOf('[');
        const firstBrace = str.indexOf('{');
        let startIdx = -1;
        let startChar = '';
        let endChar = '';

        if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
          startIdx = firstBracket;
          startChar = '[';
          endChar = ']';
        } else if (firstBrace !== -1) {
          startIdx = firstBrace;
          startChar = '{';
          endChar = '}';
        }

        if (startIdx === -1) return str;

        let stack = 0;
        let inString = false;
        let escaped = false;

        for (let i = startIdx; i < str.length; i++) {
          const char = str[i];
          
          if (escaped) {
            escaped = false;
            continue;
          }

          if (char === '\\') {
            escaped = true;
            continue;
          }

          if (char === '"') {
            inString = !inString;
            continue;
          }

          if (!inString) {
            if (char === startChar) {
              stack++;
            } else if (char === endChar) {
              stack--;
              if (stack === 0) {
                return str.substring(startIdx, i + 1);
              }
            }
          }
        }
        return str;
      };

      const jsonStr = extractFirstJSON(text);

      try {
        return JSON.parse(jsonStr);
      } catch (e) {
        console.error("AI Insight Parse Error:", e, "Extracted text:", jsonStr, "Raw text:", text);
        return [];
      }
    } catch (error) {
      console.error("AI Insight Error:", error);
      return buildLocalInsights(data);
    }
  },

  async chatWithCoach(message: string, data?: {
    workouts: Workout[];
    skincare: SkincareLog[];
    sleep: SleepLog[];
    habits: Habit[];
    bodyMetrics: BodyMetrics[];
    deepWork: DeepWorkTarget | null;
  }, userId?: string) {
    const memory = userId ? await dbService.getAiMemory(userId, 'coach') : [];

    if (!ai) {
      const reply = buildLocalCoachReply(message, {
        ...(data || { workouts: [], skincare: [], sleep: [], habits: [], bodyMetrics: [], deepWork: null }),
        memory,
      });

      if (userId) {
        await dbService.upsertAiMemory(userId, 'coach', `offline-${Date.now()}`, `User: ${message}\nReply: ${reply.slice(0, 600)}`, 1);
      }

      return reply;
    }

    try {
      let dataContext = "";
      if (data) {
        const memoryContext = memory.length
          ? `\n        RECENT MEMORY:\n        ${memory.slice(0, 5).map((entry) => `- ${entry.content}`).join('\n        ')}`
          : '';

        dataContext = `
        CURRENT USER DATA CONTEXT:
        - Recent Workouts: ${JSON.stringify(data.workouts.slice(0, 3))}
        - Recent Skincare/Mood: ${JSON.stringify(data.skincare.slice(0, 3))}
        - Recent Sleep: ${JSON.stringify(data.sleep.slice(0, 3))}
        - Body Metrics: ${JSON.stringify(data.bodyMetrics.slice(0, 3))}
        - Deep Work Today: ${JSON.stringify(data.deepWork)}
        - Habit Completion: ${data.habits.filter(h => h.completedToday).length}/${data.habits.length} habits completed today. Details: ${JSON.stringify(data.habits.map(h => ({name: h.name, completed: h.completedToday, streak: h.streak})))}
        ${memoryContext}
        
        CRITICAL RULE: Base your answers on the CURRENT USER DATA CONTEXT above whenever relevant to the user's query. Do not invent or hallucinate data. If they ask about their sleep, look at the Recent Sleep data. If they ask about gym progress, look at Recent Workouts and Body Metrics.
        `;
      }

      const response = await generateWithFallbackModels({ parts: [{ text: `You are the LifeOS Optimization AI Coach. Respond to the user's query: "${message}". 
        
        ${dataContext}
        
        Guidelines:
        - Use structured Markdown (bolding, bullet points, numbered lists).
        - Keep it concise but high-impact.
        - Use technical, data-driven language.
        - Provide actionable protocols or steps based on their actual data.
        - If relevant, use a "PROTOCOL" or "METRIC" header.
        - Maintain a futuristic, OS-like tone.` }] });

      if (!response) {
        const reply = buildLocalCoachReply(message, {
          ...(data || { workouts: [], skincare: [], sleep: [], habits: [], bodyMetrics: [], deepWork: null }),
          memory,
        });

        if (userId) {
          await dbService.upsertAiMemory(userId, 'coach', `fallback-${Date.now()}`, `User: ${message}\nReply: ${reply.slice(0, 600)}`, 1);
        }

        return reply;
      }

      const text = response.text || "I'm processing your request.";

      if (userId) {
        await dbService.upsertAiMemory(userId, 'coach', `response-${Date.now()}`, `User: ${message}\nResponse: ${text.slice(0, 800)}`, 2);
      }

      return text;
    } catch (error) {
      console.error("AI Chat Error:", error);
      const reply = buildLocalCoachReply(message, {
        ...(data || { workouts: [], skincare: [], sleep: [], habits: [], bodyMetrics: [], deepWork: null }),
        memory,
      });

      if (userId) {
        await dbService.upsertAiMemory(userId, 'coach', `error-${Date.now()}`, `User: ${message}\nReply: ${reply.slice(0, 600)}`, 1);
      }

      return reply;
    }
  }
};

export const chatWithCoach = aiService.chatWithCoach;
export const generateInsights = aiService.generateInsights;
