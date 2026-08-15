import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, errorCode: 'SERVER_405', message: 'Method not allowed' });
  const { messages, context} = req.body;
  if (!messages) return res.status(400).json({ success: false, errorCode: 'SERVER_400', message: 'Messages required' });

  const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
  if (!NVIDIA_API_KEY) return res.status(500).json({ success: false, message: 'AI config missing on server.' });

  const systemPrompt = `You are Bunny Assistant, a highly intelligent study assistant.

CURRENT USER CONTEXT:
- Local Date/Time: ${context?.currentDateTime}
- Active Timer: ${context?.timer?.status}
- Stats: Today ${context?.stats?.today}, Weekly ${context?.stats?.weekly}
- Active Goals: ${JSON.stringify(context?.goals || [])}
- Upcoming Planner: ${JSON.stringify(context?.planner || [])}

GROUNDING & WORKFLOW RULES:
1. Answer queries using the real user data. Do not invent stats.
2. Conflict Detection: When scheduling, check "Upcoming Planner". Add warnings to the "conflicts" array.
3. Entity Resolution: When editing/deleting existing sessions, you MUST use the exact "id" from the context.
4. Bulk Operations: Accurately count them in "affectedRecords".
5. Follow-ups: Modify previous proposals contextually.
6. Title Generation: If generateTitle is true, provide a concise 3-5 word title for the conversation. If false, leave it null.

CRITICAL JSON SCHEMA:
{
  "message": "Conversational response. End with confirmation question if proposing an action.",
  "title": "Concise Chat Title or null",
  "proposal": {
    "summary": "Clear summary of the changes",
    "affectedRecords": 1,
    "conflicts": ["Optional array of overlapping session warnings"],
    "actions": [
       { "type": "CREATE_PLANNER_SESSION", "parameters": { "title": "...", "date": "YYYY-MM-DD", "startTime": "HH:MM", "plannedDurationMs": 7200000 } }
    ]
  } // OR null
}`;

  const formattedMessages = [{ role: "system", content: systemPrompt }, ...messages.slice(-8).map((m: any) => ({ role: m.role, content: m.content }))];

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${NVIDIA_API_KEY}` },
      body: JSON.stringify({ model: "meta/llama-3.1-8b-instruct", messages: formattedMessages, temperature: 0.2, max_tokens: 2000 })
    });

    if (!response.ok) return res.status(502).json({ success: false, message: 'I had trouble connecting to my servers.' });
    const data = await response.json();
    const rawContent = data.choices[0].message.content;
    
    let parsed;
    const jsonStart = rawContent.indexOf('{');
    const jsonEnd = rawContent.lastIndexOf('}') + 1;
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      try { parsed = JSON.parse(rawContent.slice(jsonStart, jsonEnd)); } catch (e) { parsed = { message: rawContent, proposal: null, title: null }; }
    } else parsed = { message: rawContent, proposal: null, title: null };
    
    return res.status(200).json({ success: true, ...parsed });
  } catch (error) { return res.status(500).json({ success: false, message: 'Unexpected server error.' }); }
}