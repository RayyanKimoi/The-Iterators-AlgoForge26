const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

export type ChatAnalysis = {
  summary: string
  riskLevel: 'Low' | 'Medium' | 'High'
  redFlags: string[]
  actionableInsights: {
    location?: string
    meetingTime?: string
    rewardDiscussed?: string
    contactInfo?: string
  }
  recommendation: string
}

export type Message = {
  sender_role: string
  content: string
  sent_at: string
}

export async function analyzeChat(messages: Message[]): Promise<ChatAnalysis> {
  if (!GROQ_API_KEY) {
    throw new Error('Groq API Key is missing. Please add VITE_GROQ_API_KEY to your .env file.')
  }

  const conversation = messages
    .map(m => `${m.sender_role.toUpperCase()}: ${m.content}`)
    .join('\n')

  const systemPrompt = `You are an expert Police Intelligence Analyzer for the SPORS (Secure Phone Ownership & Recovery System) app.
Your goal is to analyze the chat between a device OWNER and a FINDER.
Look for:
1. Summarization of the interaction.
2. Risk assessment (Low/Medium/High).
3. Red flags (Extortion, Scams, Threats, Suspicious behavior).
4. Actionable insights (Extracted meeting points, times, reward amounts).
5. Recommendations for the owner and police.

IMPORTANT: Respond ONLY in the following JSON format:
{
  "summary": "Brief summary of the chat",
  "riskLevel": "Low | Medium | High",
  "redFlags": ["Flag 1", "Flag 2"],
  "actionableInsights": {
    "location": "Extracted location if any",
    "meetingTime": "Extracted time if any",
    "rewardDiscussed": "Reward details if any",
    "contactInfo": "Any shared phone/email"
  },
  "recommendation": "Advice for the officer"
}`

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this conversation:\n\n${conversation}` },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      try {
        const errorData = JSON.parse(errorText)
        console.error('Groq API Error Response:', errorData)
        throw new Error(`Groq API error: ${errorData.error?.message || response.statusText}`)
      } catch (e) {
        console.error('Groq API Raw Error:', errorText)
        throw new Error(`Groq API error: ${response.statusText}`)
      }
    }

    const data = await response.json()
    const result = JSON.parse(data.choices[0].message.content)
    return result as ChatAnalysis
  } catch (error) {
    console.error('Error in analyzeChat:', error)
    throw error
  }
}
