import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { messages, context } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Messages array required' });

  const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
  if (!NVIDIA_API_KEY) return res.status(500).json({ error: 'AI config missing on server.' });

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
2. If data is missing or you do not know the answer, explicitly say "I don't have that information." DO NOT invent or fabricate statistics, schedules, or goals.
3. Distinguish between observed facts ("You have a Physics session scheduled") and recommendations ("I recommend starting with Physics").
4. If the user asks you to take an ACTION (e.g. "Create a planner session", "Start a timer"), populate the "actions" array using deterministic types: [CREATE_PLANNER_SESSION, DELETE_PLANNER_SESSION, CREATE_GOAL, START_TIMER, PAUSE_TIMER, RESUME_TIMER, STOP_TIMER, OPEN_PLANNER].
5. Destructive actions (DELETE) MUST set requiresConfirmation to true.
6. Purely conversational requests MUST leave the "actions" array empty.

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
        temperature: 0.2, // Lowered temperature for stricter factual grounding
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