import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, errorCode: 'SERVER_405', message: 'Method not allowed' });
  
  const { messages, context } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ success: false, errorCode: 'SERVER_400', message: 'Messages array required' });

  const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
  if (!NVIDIA_API_KEY) return res.status(500).json({ success: false, errorCode: 'MISSING_API_KEY', message: 'AI config missing on server.' });

  const systemPrompt = `You are Bunny Voice, the hands-free audio assistant for Study Bunny.
Current Date/Time: ${context?.currentDateTime || new Date().toISOString()}
Active Timer: ${context?.timer?.status}
Active Goals: ${JSON.stringify(context?.goals || [])}
Upcoming Planner: ${JSON.stringify(context?.planner || [])}

GROUNDING & WORKFLOW RULES:
1. KEEP RESPONSES CONCISE AND SPOKEN-WORD FRIENDLY. DO NOT USE MARKDOWN (NO asterisks, bolding, or lists). Provide natural conversational sentences.
2. Convert natural language into structured actions. DO NOT invent information. Use the user's real data.
3. RECURRING PLANS: If generating multiple sessions, calculate the exact YYYY-MM-DD dates and return an array of individual CREATE_PLANNER_SESSION actions.
4. GOAL LINKING: If creating a goal AND sessions in the same plan, set "goalId": "NEW_GOAL" in the planner session parameters to link them.
5. Conflict Detection: Check "Upcoming Planner" for overlaps. If there is a conflict, mention it in your spoken message and add it to the conflicts array.
6. Follow-ups: If the user says "actually make it 3 hours", modify the previous proposal contextually.
7. Confirmations: ALWAYS end a proposal with a direct spoken question like "Would you like me to schedule this?"

Valid Action Types: CREATE_PLANNER_SESSION, EDIT_PLANNER_SESSION, DELETE_PLANNER_SESSION, CREATE_GOAL, START_TIMER.

RESPOND ONLY IN THIS STRICT JSON SCHEMA:
{
  "message": "Friendly confirmation, spoken-word answer, or clarification request. NO MARKDOWN.",
  "proposal": {
    "summary": "String summary of the changes",
    "affectedRecords": 1,
    "conflicts": ["Optional array of overlapping session warnings"],
    "actions": [
      {
        "type": "CREATE_PLANNER_SESSION",
        "parameters": {
          "title": "String",
          "subject": "String",
          "date": "YYYY-MM-DD",
          "startTime": "HH:MM",
          "plannedDurationMs": Number,
          "goalId": "NEW_GOAL"
        }
      },
      {
        "type": "CREATE_GOAL",
        "parameters": {
          "title": "String",
          "targetMs": Number,
          "type": "custom"
        }
      }
    ]
  } // OR null if no actions are needed
}`;

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-8b-instruct",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.slice(-8).map((m: any) => ({ role: m.role, content: m.content }))
        ],
        temperature: 0.1,
        max_tokens: 800
      })
    });

    if (!response.ok) return res.status(502).json({ success: false, message: 'I had trouble connecting to my AI provider.' });
    
    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return res.status(502).json({ success: false, message: 'I received an invalid response.' });
    }

    const rawContent = data.choices[0].message.content;
    let parsed;
    const jsonStart = rawContent.indexOf('{');
    const jsonEnd = rawContent.lastIndexOf('}') + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      try { parsed = JSON.parse(rawContent.slice(jsonStart, jsonEnd)); } 
      catch (e) { parsed = { message: 'I misunderstood the command. Please try again.', proposal: null }; }
    } else {
      parsed = { message: 'I did not understand the requested action.', proposal: null };
    }
    
    return res.status(200).json({ success: true, ...parsed });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'I encountered an unexpected server error.' });
  }
}