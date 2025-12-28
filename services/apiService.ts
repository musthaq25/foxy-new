import { Session, AIResponse } from '../types';
import { NETLIFY_AI_PROXY_URL } from '../constants';

export const fetchAIResponse = async (
  session: Session, 
  userQuery: string, 
  userName: string,
  imageData?: string | null
): Promise<AIResponse> => {
  try {
    const isFirstMessage = session.messages.length === 0;
    
    // Convert history for the proxy
    const history = session.messages.filter(m => !m.isLoading).map(m => ({
      sender: m.sender,
      text: m.text
    }));

    const response = await fetch(NETLIFY_AI_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: userQuery,
        history,
        mode: session.mode,
        user_name: userName,
        is_first_message: isFirstMessage,
        // Optional: Include image data if the proxy is updated to handle vision via Groq/others
        image_data: imageData 
      }),
    });

    if (!response.ok) throw new Error('Proxy error');

    const data = await response.json();
    
    return {
      text: data.text || "I'm processing your request.",
      isCommand: !!data.is_command,
      command: data.command,
      appName: data.app_name,
      generatedTitle: data.generated_title,
      greeting: data.greeting
    };
  } catch (error) {
    console.error("API Service Error:", error);
    return { 
      text: "I'm having trouble connecting to my neural net right now. Please check your connection.", 
      isCommand: false 
    };
  }
};