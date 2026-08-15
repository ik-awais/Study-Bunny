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

Convert natural language into structured actions. DO NOT invent information. If a request is too ambiguous, return empty actions and ask for clarification in the message. If the action is destructive (delete), set requiresConfirmation to true.

Valid Action Types: CREATE_PLANNER_SESSION, EDIT_PLANNER_SESSION, DELETE_PLANNER_SESSION, CREATE_GOAL, START_TIMER.

RESPOND ONLY IN THIS STRICT JSON SCHEMA:
{
  "message": "Friendly confirmation or clarification request.",
  "requiresConfirmation": false,
  "actions": [
    {
      "type": "CREATE_PLANNER_SESSION",
      "parameters": {
        "title": "String",
        "subject": "String",
        "date": "YYYY-MM-DD",
        "startTime": "HH:MM",
        "plannedDurationMs": Number (milliseconds)
      }
    }
  ]
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
        max_tokens: 500
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
        parsed = { message: 'I misunderstood the command. Please try again.', requiresConfirmation: false, actions: [] };
      }
    } else {
      parsed = { message: 'I did not understand the requested action.', requiresConfirmation: false, actions: [] };
    }
    
    return res.status(200).json({ success: true, ...parsed });
  } catch (error: any) {
    return res.status(500).json({ success: false, errorCode: 'SERVER_500', message: 'I encountered an unexpected server error.' });
  }
}