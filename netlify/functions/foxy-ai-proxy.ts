
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
    const { query, history, mode, user_name, is_first_message, study_mode } = body;
    
    const messages = history.map((msg: any) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    let systemPrompt = "";
    let responseFormat = undefined;

    if (mode === 'jarvis') {
      responseFormat = { type: "json_object" };
      systemPrompt = `You are Foxy in Jarvis Mode. Respond ONLY in a valid JSON object.
      Schema:
      {
        "text": "Detailed educational explanation with LaTeX formulas on separate lines",
        "greeting": "Short conversational acknowledgment (e.g., 'Alright', 'Sure')",
        "is_command": boolean,
        "command": "OPEN_APP" | null,
        "app_name": string | null
      }
      
      STRICT FORMATTING for "text":
      1. Intro paragraph must be 1-2 lines max.
      2. Use bullet points for all explanations.
      3. Mathematical formulas MUST be on separate lines using $$...$$.
      4. Maintain a tutor-like, conversational tone.`;
    } else {
      const modeInstruction = study_mode 
        ? "You are a focused, premium AI tutor. Explain things step-by-step, encourage deep understanding, and be very educational. Use LaTeX for formulas on new lines."
        : "You are a smart, friendly, and casual assistant. Be helpful, clear, and professional. Keep things conversational and concise.";

      systemPrompt = `${modeInstruction}
      Identity: Foxy AI Assistant by NOMIX.
      User: ${user_name || 'User'}.
      
      STRICT RESPONSE RULES:
      1. CONVERSATIONAL OPENING: Always start with a short acknowledgment (e.g., "Alright", "Sure", "Certainly").
      2. BREVITY: Introductory paragraphs MUST be 1–2 lines maximum.
      3. STRUCTURE: Use bullet points for steps, explanations, or conceptual breakdowns.
      4. MATHEMATICS: Formulas MUST be on their own separate lines using LaTeX ($$ ... $$).
      5. STYLE: Clean, premium feel. Avoid large blocks of text.
      6. NO HEADINGS: Do not auto-generate headers unless requested.
      7. EMOJIS: Minimal, only at the very end. 🦊`;
    }

    const callGroq = async (model: string) => {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            { role: "user", content: query }
          ],
          temperature: study_mode ? 0.2 : 0.4, // Lower temperature for logic in study mode
          response_format: responseFormat
        })
      });
      if (!res.ok) throw new Error(`Groq ${model} failed`);
      return res.json();
    };

    let data;
    try {
      // Primary model qwen-2.5-32b
      data = await callGroq("qwen-2.5-32b");
    } catch (e) {
      console.warn("Primary model failed, falling back to Llama 8B...");
      data = await callGroq("llama-3.1-8b-instant");
    }

    const rawContent = data.choices[0].message.content;
    let finalResponse: any = { text: rawContent, is_command: false, generated_title: null };

    if (mode === 'jarvis') {
      try {
        const parsed = JSON.parse(rawContent);
        finalResponse = { 
          text: parsed.text, 
          is_command: parsed.is_command || false,
          command: parsed.command,
          app_name: parsed.app_name,
          greeting: parsed.greeting
        };
      } catch (e) {
        console.error("Jarvis parse error:", e);
      }
    }

    if (is_first_message && mode !== 'jarvis') {
      try {
        const titleRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: `2-3 word chat title for: ${query}` }],
            max_tokens: 10
          })
        });
        const titleData = await titleRes.json();
        finalResponse.generated_title = titleData.choices[0].message.content.replace(/["']/g, '').trim();
      } catch (e) {}
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalResponse)
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ text: "The neural network link timed out. Attempting reconnect. 🦊" })
    };
  }
};
