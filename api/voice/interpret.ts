// api/voice/interpret.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  const { transcript } = req.body;
  if (!transcript) return res.status(400).json({ error: 'Transcript required' });

  const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
  if (!NVIDIA_API_KEY) return res.status(500).json({ error: 'AI config missing on server.' });

  try {
    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-8b-instruct",
        messages: [{
          role: "system",
          content: `You are an AI command parser for a productivity app named Study Bunny. 
Map the user's input to ONE of these intents: START_TIMER, PAUSE_TIMER, RESUME_TIMER, STOP_TIMER, OPEN_PLANNER.
Extract parameters (like duration in minutes, or subject).
Return strictly valid JSON matching this schema: {"intent": "...", "confidence": "high|medium|low", "parameters": {"duration": number, "subject": "string"}}`
        }, {
          role: "user",
          content: transcript
        }],
        temperature: 0.1,
        max_tokens: 150
      })
    });

    const data = await response.json();
    const rawContent = data.choices[0].message.content;
    const jsonStart = rawContent.indexOf('{');
    const jsonEnd = rawContent.lastIndexOf('}') + 1;
    const parsed = JSON.parse(rawContent.slice(jsonStart, jsonEnd));
    
    res.status(200).json(parsed);
  } catch (error) {
    console.error("AI Parse Error:", error);
    res.status(500).json({ error: 'Interpretation failed', intent: 'UNKNOWN', confidence: 'low' });
  }
}