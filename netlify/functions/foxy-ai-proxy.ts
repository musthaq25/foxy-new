
export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server configuration error: GROQ_API_KEY is missing." }),
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { query, history, mode, user_name, is_first_message } = body;
    
    const identityInfo = `
    Identity:
    - You are Foxy, a premium AI assistant created by NOMIX.
    - Creator: Mohammed Musthaq (founder of NOMIX).
    - Tone: Educational, tutoring, helpful, and sophisticated.
    `;

    const messages = history.map((msg: any) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    const systemPrompt = `You are Foxy, a premium conversational tutor.
    User: ${user_name || 'User'}.
    ${identityInfo}
    
    STRICT RESPONSE RULES:
    1. CONVERSATIONAL OPENING: Always begin with a short conversational acknowledgment (e.g., "Alright", "Sure", "Certainly", "Great question").
    2. BREVITY: Limit your introductory paragraph to 1–2 lines maximum.
    3. STRUCTURE: Use bullet points for explanations and step-by-step reasoning.
    4. MATHEMATICS: Always display mathematical formulas on separate lines using LaTeX ($$ ... $$) for clarity.
    5. STYLE: Educational but conversational tone. Avoid large essay-style blocks.
    6. CODE: Output code ONLY inside a SINGLE proper block using triple backticks (\`\`\`).
    7. NO HEADINGS: Do NOT auto-generate headings for every response.
    8. EMOJIS: Use minimal emojis, and only at the end of the response.
    `;

    // Fetch AI response
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
          { role: "user", content: query }
        ],
        temperature: 0.7
      })
    });

    const data = await response.json();
    const aiText = data.choices[0].message.content;

    let generatedTitle = null;
    if (is_first_message) {
      const titleRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: `Summarize this query into a meaningful 2-3 word chat title: ${query}` }],
          max_tokens: 15
        })
      });
      const titleData = await titleRes.json();
      generatedTitle = titleData.choices[0].message.content.replace(/["']/g, '').trim();
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: aiText,
        is_command: false,
        generated_title: generatedTitle
      })
    };
  } catch (error: any) {
    console.error("Groq Proxy Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        text: "I'm having trouble connecting to my neural net right now. Please check your connection. 🦊", 
        is_command: false 
      })
    };
  }
};
