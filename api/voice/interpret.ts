import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, errorCode: 'SERVER_405', message: 'Method not allowed' });
  
  const { transcript, context } = req.body;
  if (!transcript) return res.status(400).json({ success: false, errorCode: 'SERVER_400', message: 'Transcript required' });

  const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
  if (!NVIDIA_API_KEY) return res.status(500).json({ success: false, errorCode: 'MISSING_API_KEY', message: 'AI config missing on server.' });

  const systemPrompt = `You are Bunny Assistant.
Current Date/Time: ${context?.currentDateTime || new Date().toISOString()}
Active Goals: ${JSON.stringify(context?.goals || [])}
Upcoming Planner: ${JSON.stringify(context?.planner || [])}

GROUNDING & WORKFLOW RULES:
1. Convert natural language into structured actions. DO NOT invent information.
2. RECURRING PLANS: If generating multiple sessions, calculate the exact YYYY-MM-DD dates and return an array of individual CREATE_PLANNER_SESSION actions.
3. GOAL LINKING: If creating a goal AND sessions in the same plan, set "goalId": "NEW_GOAL" in the planner session parameters to link them.
4. Conflict Detection: Check "Upcoming Planner" for overlaps. Add warnings to the "conflicts" array.
5. Ambiguity: If a request is too ambiguous, return a null proposal and ask for clarification in the message.

Valid Action Types: CREATE_PLANNER_SESSION, EDIT_PLANNER_SESSION, DELETE_PLANNER_SESSION, CREATE_GOAL, START_TIMER.

RESPOND ONLY IN THIS STRICT JSON SCHEMA:
{
  "message": "Friendly confirmation or clarification request.",
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
          { role: "user", content: transcript }
        ],
        temperature: 0.1,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      let errorCode = 'NVIDIA_BAD_REQUEST';
      if (response.status === 401 || response.status === 403) errorCode = 'NVIDIA_AUTH_ERROR';
      else if (response.status === 429) errorCode = 'NVIDIA_RATE_LIMIT';
      else if (response.status === 504) errorCode = 'NVIDIA_TIMEOUT';
      return res.status(502).json({ success: false, errorCode, message: 'I had trouble connecting to my AI provider.' });
    }

    const data = await response.json();
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return res.status(502).json({ success: false, errorCode: 'INVALID_SERVER_RESPONSE', message: 'I received an invalid response.' });
    }

    const rawContent = data.choices[0].message.content;
    let parsed;
    const jsonStart = rawContent.indexOf('{');
    const jsonEnd = rawContent.lastIndexOf('}') + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      try {
        parsed = JSON.parse(rawContent.slice(jsonStart, jsonEnd));
      } catch (parseError) {
        parsed = { message: 'I misunderstood the command. Please try again.', proposal: null };
      }
    } else {
      parsed = { message: 'I did not understand the requested action.', proposal: null };
    }
    
    return res.status(200).json({ success: true, ...parsed });
  } catch (error: any) {
    return res.status(500).json({ success: false, errorCode: 'SERVER_500', message: 'I encountered an unexpected server error.' });
  }
}