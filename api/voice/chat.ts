import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    console.error("SERVER_405: Method not allowed");
    return res.status(405).json({ success: false, errorCode: 'SERVER_405', message: 'Method not allowed' });
  }
  
  const { messages, context } = req.body;
  if (!messages || !Array.isArray(messages)) {
    console.error("SERVER_400: Messages array required");
    return res.status(400).json({ success: false, errorCode: 'SERVER_400', message: 'Messages array required' });
  }

  const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
  if (!NVIDIA_API_KEY) {
    console.error("MISSING_API_KEY: Environment variable NVIDIA_API_KEY is not set.");
    return res.status(500).json({ success: false, errorCode: 'MISSING_API_KEY', message: 'AI config missing on server.' });
  }

  const systemPrompt = `You are Bunny Assistant, a friendly, intelligent, and highly capable study productivity assistant for the Study Bunny app. 

CURRENT USER CONTEXT:
- User: ${context?.user?.name || 'Student'}
- Local Date/Time: ${context?.currentDateTime || new Date().toISOString()}
- Active Timer: ${context?.timer?.status} (Phase: ${context?.timer?.phase}) - Subject: ${context?.timer?.subject || 'None'}
- Stats: Today ${context?.stats?.today}, Weekly ${context?.stats?.weekly}, Streak: ${context?.stats?.streak} days
- Active Goals: ${JSON.stringify(context?.goals || [])}
- Upcoming Planner: ${JSON.stringify(context?.planner || [])}

GROUNDING RULES:
1. Answer questions based STRICTLY on the actual user data provided above.
2. If data is missing, explicitly say "I don't have that information." DO NOT invent or fabricate statistics.
3. If the user asks you to take an ACTION (e.g. "Create a planner session"), populate the "actions" array using deterministic types: [CREATE_PLANNER_SESSION, DELETE_PLANNER_SESSION, CREATE_GOAL, START_TIMER, PAUSE_TIMER, RESUME_TIMER, STOP_TIMER, OPEN_PLANNER].
4. Destructive actions MUST set requiresConfirmation to true.
5. Purely conversational requests MUST leave the "actions" array empty.

CRITICAL: You MUST respond in this exact JSON schema:
{
  "message": "Your conversational response here (markdown supported).",
  "requiresConfirmation": false,
  "actions": []
}`;

  const formattedMessages = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-6).map((m: any) => ({ role: m.role, content: m.content }))
  ];

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-8b-instruct",
        messages: formattedMessages,
        temperature: 0.2,
        max_tokens: 600
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`NVIDIA API HTTP ${response.status}:`, errorText);
      
      let errorCode = 'NVIDIA_BAD_REQUEST';
      if (response.status === 401 || response.status === 403) errorCode = 'NVIDIA_AUTH_ERROR';
      else if (response.status === 429) errorCode = 'NVIDIA_RATE_LIMIT';
      else if (response.status === 504) errorCode = 'NVIDIA_TIMEOUT';
      
      return res.status(502).json({ success: false, errorCode, message: 'I had trouble reaching my AI provider. Please try again in a moment.' });
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error("INVALID_SERVER_RESPONSE: Missing choices array in NVIDIA response:", data);
      return res.status(502).json({ success: false, errorCode: 'INVALID_SERVER_RESPONSE', message: 'I received an invalid response from my AI provider.' });
    }

    const rawContent = data.choices[0].message.content;
    let parsed;
    
    const jsonStart = rawContent.indexOf('{');
    const jsonEnd = rawContent.lastIndexOf('}') + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      try {
        parsed = JSON.parse(rawContent.slice(jsonStart, jsonEnd));
      } catch (parseError) {
        console.warn("JSON_PARSE_ERROR: Failed to parse NVIDIA output as JSON. Treating as raw text.", parseError);
        parsed = { message: rawContent, requiresConfirmation: false, actions: [] };
      }
    } else {
      console.warn("JSON_NOT_FOUND: Output lacked brackets. Treating as raw text.");
      parsed = { message: rawContent, requiresConfirmation: false, actions: [] };
    }
    
    return res.status(200).json({ success: true, ...parsed });
    
  } catch (error: any) {
    console.error("SERVER_500: Uncaught exception in API endpoint:", error.message, error.stack);
    return res.status(500).json({ success: false, errorCode: 'SERVER_500', message: 'I encountered an unexpected server error. Please try again.' });
  }
}