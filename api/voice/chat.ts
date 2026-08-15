import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { messages, context } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Messages array required' });

  const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
  if (!NVIDIA_API_KEY) return res.status(500).json({ error: 'AI config missing on server.' });

  const systemPrompt = `You are Study Bunny, a friendly, intelligent, and highly capable study productivity assistant. 

CURRENT USER CONTEXT:
- Local Date/Time: ${context?.currentDateTime || new Date().toISOString()}
- Stats: Today ${context?.stats?.todayMs}ms, Weekly ${context?.stats?.weeklyMs}ms
- Active Goals: ${JSON.stringify(context?.goals || [])}
- Upcoming Planner: ${JSON.stringify(context?.planner || [])}

RULES:
1. Answer conversational questions based on the user's actual data above. 
2. Be concise, warm, and use simple markdown formatting (bolding, lists).
3. If the user asks you to take an ACTION (like "Create a planner session", "Start a timer", "Delete a goal"), populate the "actions" array using the available deterministic types: [CREATE_PLANNER_SESSION, DELETE_PLANNER_SESSION, CREATE_GOAL, START_TIMER, PAUSE_TIMER, RESUME_TIMER, STOP_TIMER, OPEN_PLANNER].
4. If an action is destructive, set requiresConfirmation to true.
5. If the request is purely conversational (e.g. "How much did I study today?"), leave the "actions" array empty.

CRITICAL: You MUST respond in this exact JSON schema:
{
  "message": "Your conversational response here (markdown supported).",
  "requiresConfirmation": false,
  "actions": [
    { "type": "ACTION_TYPE", "parameters": { ... } }
  ]
}`;

  const formattedMessages = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-6).map((m: any) => ({ role: m.role, content: m.content })) // Keep last 6 messages
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
        temperature: 0.3,
        max_tokens: 600
      })
    });

    const data = await response.json();
    const rawContent = data.choices[0].message.content;
    const jsonStart = rawContent.indexOf('{');
    const jsonEnd = rawContent.lastIndexOf('}') + 1;
    const parsed = JSON.parse(rawContent.slice(jsonStart, jsonEnd));
    
    res.status(200).json(parsed);
  } catch (error) {
    console.error("AI Chat Error:", error);
    res.status(500).json({ 
      message: 'I had trouble connecting to my servers. Please try asking again!', 
      requiresConfirmation: false, 
      actions: [] 
    });
  }
}