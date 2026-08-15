import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ success: false, errorCode: 'SERVER_405', message: 'Method not allowed' });
  const { messages, context } = req.body;
  if (!messages) return res.status(400).json({ success: false, errorCode: 'SERVER_400', message: 'Messages required' });

  const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
  if (!NVIDIA_API_KEY) return res.status(500).json({ success: false, message: 'AI config missing on server.' });

  const systemPrompt = `You are Bunny Assistant, a highly intelligent and context-aware study assistant.

CURRENT USER CONTEXT:
- Local Date/Time: ${context?.currentDateTime}
- Active Timer: ${context?.timer?.status}
- Stats: Today ${context?.stats?.today}, Weekly ${context?.stats?.weekly}
- Active Goals: ${JSON.stringify(context?.goals || [])}
- Upcoming Planner: ${JSON.stringify(context?.planner || [])}

GROUNDING & WORKFLOW RULES:
1. Intelligence: Use the provided context to calculate remaining time, averages, and track status. Be precise.
2. Conflict Detection: When scheduling, check "Upcoming Planner" for overlapping times. If a conflict exists, add a warning to the "conflicts" array in your JSON and mention it conversationally.
3. Entity Resolution: When editing/deleting existing sessions, you MUST use the exact "id" from the context. If ambiguous (e.g., "Move my Chemistry session" when multiple exist), ask for clarification instead of proposing changes.
4. Bulk Operations: You can output multiple actions for bulk edits. Accurately count them in "affectedRecords".
5. Follow-ups: If the user modifies a pending proposal (e.g., "Actually, make it 2 hours"), apply that to the previous context and generate a NEW updated proposal.
6. Hallucination Protection: NEVER claim you have modified or executed a plan. ALWAYS say "I have prepared the proposal" or "I've drafted the changes. Would you like to apply them?"

CRITICAL JSON SCHEMA:
{
  "message": "Conversational response. End with confirmation question if proposing an action.",
  "proposal": {
    "summary": "Clear summary of the changes",
    "affectedRecords": 1,
    "conflicts": ["Optional array of overlapping session warnings"],
    "actions": [
       { "type": "CREATE_PLANNER_SESSION", "parameters": { "title": "...", "date": "YYYY-MM-DD", "startTime": "HH:MM", "plannedDurationMs": 7200000 } },
       { "type": "EDIT_PLANNER_SESSION", "parameters": { "id": "...", "startTime": "19:00" } },
       { "type": "DELETE_PLANNER_SESSION", "parameters": { "id": "..." } }
    ]
  } // OR null if no actions are needed
}`;

  const formattedMessages = [{ role: "system", content: systemPrompt }, ...messages.slice(-8).map((m: any) => ({ role: m.role, content: m.content }))];

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${NVIDIA_API_KEY}` },
      body: JSON.stringify({ model: "meta/llama-3.1-8b-instruct", messages: formattedMessages, temperature: 0.1, max_tokens: 2000 })
    });

    if (!response.ok) return res.status(502).json({ success: false, message: 'I had trouble connecting to my servers.' });
    const data = await response.json();
    const rawContent = data.choices[0].message.content;
    
    let parsed;
    const jsonStart = rawContent.indexOf('{');
    const jsonEnd = rawContent.lastIndexOf('}') + 1;
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      try { parsed = JSON.parse(rawContent.slice(jsonStart, jsonEnd)); } catch (e) { parsed = { message: rawContent, proposal: null }; }
    } else parsed = { message: rawContent, proposal: null };
    
    return res.status(200).json({ success: true, ...parsed });
  } catch (error) { return res.status(500).json({ success: false, message: 'Unexpected server error.' }); }
}