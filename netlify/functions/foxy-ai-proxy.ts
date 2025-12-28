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
    - Tone: Human-like, premium, and sophisticated.
    `;

    const messages = history.map((msg: any) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    if (mode === 'jarvis') {
      const systemPrompt = `You are Jarvis, a high-performance system interface for ${user_name || 'User'}.
      ${identityInfo}
      
      COMMAND PROTOCOLS:
      - Respond ONLY in valid JSON. No conversational fluff outside JSON.
      - Evaluate commands like "Open Notepad", "Launch Chrome".
      - "text": Spoken feedback.
      - "is_command": Boolean.
      - "command": "OPEN_APP".
      - "app_name": Target app name.
      - "greeting": A short, warm 1-sentence greeting.
      - "generated_title": A short (max 3 words) meaningful title for the chat session based on the query.

      FORMATTING RULES:
      - Use premium emojis in the "text" field.
      - If code is requested, output it inside a SINGLE code block with a language tag.
      - No explanations inside the code block.`;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3-70b-8192",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            { role: "user", content: query }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3
        })
      });

      const data = await response.json();
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: data.choices[0].message.content
      };
    } else {
      const systemPrompt = `You are Foxy, a premium and intelligent AI assistant.
      User: ${user_name || 'User'}.
      ${identityInfo}
      
      STRICT RESPONSE RULES:
      1. CODE GENERATION: 
         - When generating code, output code ONLY inside a SINGLE proper block using triple backticks (\`\`\`).
         - Always include the correct language tag (python, js, html, etc.).
         - Code must be complete, clean, and copy-ready.
         - NEVER mix explanations or comments inside the code block.
         - Any explanation MUST be placed outside the code block.
      2. NORMAL QUESTIONS:
         - Respond in plain, natural paragraphs by default.
         - Do NOT add automatic headings, titles, or bold labels in your responses.
         - Use headings, steps, or lists ONLY if the user explicitly asks for them.
      3. TONE & STYLE:
         - Premium formatting with sophisticated emoji usage (e.g. 🧠, ✨, 🚀, 🦊).
         - Friendly and helpful.
      4. MATH: 
         - Use LaTeX ($...$ inline, $$...$$ blocks).`;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3-70b-8192",
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
            model: "llama3-8b-8192",
            messages: [{ role: "user", content: `Summarize this query into a meaningful 2-3 word chat title. Be specific to the query: ${query}` }],
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
    }
  } catch (error: any) {
    console.error("Groq Proxy Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        text: "I encountered a neural link error. 🦊", 
        is_command: false 
      })
    };
  }
};