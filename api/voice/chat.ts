import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, errorCode: 'SERVER_405', message: 'Method not allowed' });
  
  const { messages, context } = req.body;
  if (!messages) return res.status(400).json({ success: false, errorCode: 'SERVER_400', message: 'Messages array required' });

  const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
  if (!NVIDIA_API_KEY) return res.status(500).json({ success: false, errorCode: 'MISSING_API_KEY', message: 'AI config missing on server.' });

  const systemPrompt = `You are Bunny Assistant.

CURRENT USER CONTEXT:
- Local Date/Time: ${context?.currentDateTime}
- Active Timer: ${context?.timer?.status}
- Active Goals: ${JSON.stringify(context?.goals || [])}
- Upcoming Planner: ${JSON.stringify(context?.planner || [])}

GROUNDING & WORKFLOW RULES:
1. Answer queries using the real user data. Do not invent stats.
2. If the user asks for a schedule/plan (e.g. "Create 10 chemistry sessions"), you must INTERPRET the request, calculate the exact dates if possible using the Current Date/Time, and package them into a single PROPOSAL.
3. DO NOT say "I have created the sessions". Say "I have prepared a plan for you. Would you like me to add it to your Bunny Planner?"
4. Ambiguity: If you don't know exactly what days or durations the user wants, ask a clarifying question and leave the proposal null.

CRITICAL JSON SCHEMA:
{
  "message": "Your conversational response. Always end with a single confirmation question if proposing an action.",
  "proposal": {
    "summary": "Brief summary of the changes (e.g., '10 Chemistry sessions over 5 weeks')",
    "actions": [
       { "type": "CREATE_PLANNER_SESSION", "parameters": { "title": "...", "date": "YYYY-MM-DD", "startTime": "HH:MM", "plannedDurationMs": 7200000 } }
    ]
  } // OR null if no actions are needed
}`;

  const formattedMessages = [
    { role: "system", content: systemPrompt },
    ...messages.slice(-6).map((m: any) => ({ role: m.role, content: m.content }))
  ];

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${NVIDIA_API_KEY}` },
      body: JSON.stringify({ model: "meta/llama-3.1-8b-instruct", messages: formattedMessages, temperature: 0.2, max_tokens: 800 })
    });

    if (!response.ok) return res.status(502).json({ success: false, message: 'I had trouble connecting to my servers. Please try again.' });
    const data = await response.json();
    const rawContent = data.choices[0].message.content;
    
    let parsed;
    const jsonStart = rawContent.indexOf('{');
    const jsonEnd = rawContent.lastIndexOf('}') + 1;
    
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      try { parsed = JSON.parse(rawContent.slice(jsonStart, jsonEnd)); } 
      catch (e) { parsed = { message: rawContent, proposal: null }; }
    } else {
      parsed = { message: rawContent, proposal: null };
    }
    
    return res.status(200).json({ success: true, ...parsed });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Unexpected server error.' });
  }
}