
import { GoogleGenAI, Type } from "@google/genai";

export const handler = async (event: any) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  // The API key must be obtained exclusively from the environment variable process.env.API_KEY.
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server configuration error: API_KEY is missing." }),
    };
  }

  try {
    // Initializing the @google/genai client instance.
    const ai = new GoogleGenAI({ apiKey });
    const body = JSON.parse(event.body);
    const { query, history, mode, user_name, is_first_message, image_data } = body;
    
    const identityInfo = `
    Identity:
    - You are Foxy, a premium AI tutor by NOMIX (founded by Mohammed Musthaq).
    - Tone: Helpful, professional tutor.
    User: ${user_name || 'User'}.
    `;

    // Map history to Gemini content format (user/model)
    const contents = history.map((msg: any) => ({
      role: msg.sender === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // Add current query with optional image part for vision processing
    const currentParts: any[] = [{ text: query }];
    if (image_data) {
      try {
        const mimeType = image_data.split(';')[0].split(':')[1] || 'image/png';
        const base64Data = image_data.split(',')[1] || image_data;
        currentParts.push({
          inlineData: {
            mimeType: mimeType,
            data: base64Data
          }
        });
      } catch (e) {
        console.error("Image processing error", e);
      }
    }
    contents.push({ role: 'user', parts: currentParts });

    let systemInstruction = "";
    let responseMimeType: string | undefined = undefined;
    let responseSchema: any = undefined;

    if (mode === 'jarvis') {
      systemInstruction = `You are Foxy in Jarvis Mode. Respond ONLY in a JSON object.
      - "text": A natural, short conversational tutoring response.
      - "is_command": boolean.
      - "command": "OPEN_APP" (if user asks to open something).
      - "app_name": string.
      - "greeting": A very short warm acknowledgment.
      
      STRICT FORMATTING for "text":
      1. Start with an acknowledgment (e.g., "Alright", "Sure").
      2. Max 2 lines intro.
      3. Use bullets for steps.
      4. LaTeX formulas on SEPARATE lines using $$...$$.`;

      // Configure JSON response and schema for Jarvis mode
      responseMimeType = "application/json";
      responseSchema = {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING },
          is_command: { type: Type.BOOLEAN },
          command: { type: Type.STRING },
          app_name: { type: Type.STRING },
          greeting: { type: Type.STRING }
        },
        required: ["text", "is_command"]
      };
    } else {
      systemInstruction = `You are Foxy, a premium conversational AI tutor.
      ${identityInfo}
      STRICT RESPONSE RULES:
      1. CONVERSATIONAL OPENING: Begin with a short acknowledgment (e.g., "Alright", "Sure", "For this level...").
      2. BREVITY: Intro paragraph MUST be 1-2 lines maximum.
      3. STRUCTURE: Use bullet points for all explanations or steps.
      4. MATH: Display mathematical formulas on separate lines using $$ for LaTeX.
      5. STYLE: Tutoring tone, centered around being helpful but concise.
      6. NO HEADINGS: Do not use automatic # headings.
      7. EMOJIS: Minimal, at the very end only. 🦊`;
    }

    // Call generateContent using gemini-3-pro-preview for complex reasoning tasks
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents,
      config: {
        systemInstruction,
        responseMimeType,
        responseSchema,
        temperature: 0.6,
      },
    });

    const rawText = response.text || "";
    let finalResponse: any = { text: rawText, is_command: false, generated_title: null };

    if (mode === 'jarvis') {
      try {
        const parsed = JSON.parse(rawText);
        finalResponse = { 
          text: parsed.text, 
          is_command: parsed.is_command || false,
          command: parsed.command,
          app_name: parsed.app_name,
          greeting: parsed.greeting,
          generated_title: null
        };
      } catch (e) {
        console.error("Jarvis JSON Parse Error", e);
      }
    }

    // Handle session title generation for the first message using gemini-3-flash-preview
    if (is_first_message) {
      try {
        const titleRes = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: `Generate a short 2-3 word title for this conversation based on this query: ${query}`,
        });
        finalResponse.generated_title = titleRes.text?.replace(/["']/g, '').trim() || "New Chat";
      } catch (e) {
        finalResponse.generated_title = "New Chat";
      }
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(finalResponse)
    };
  } catch (error: any) {
    console.error("AI Proxy Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ text: "I'm having trouble connecting to my neural net right now. 🦊" })
    };
  }
};
