
import { Session, AIResponse } from '../types';
import { NETLIFY_AI_PROXY_URL } from '../constants';

export const fetchAIResponse = async (
  session: Session, 
  userQuery: string, 
  userName: string,
  imageData?: string | null,
  studyMode: boolean = false
): Promise<AIResponse> => {
  try {
    const isFirstMessage = session.messages.length === 0;

    const response = await fetch(NETLIFY_AI_PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: userQuery,
        history: session.messages.map(m => ({ sender: m.sender, text: m.text })),
        mode: session.mode,
        user_name: userName,
        is_first_message: isFirstMessage,
        image_data: imageData,
        study_mode: studyMode
      }),
    });

    if (!response.ok) {
      throw new Error('Neural network link failed.');
    }

    const data = await response.json();
    
    return {
      text: data.text,
      isCommand: data.is_command || false,
      generatedTitle: data.generated_title,
      command: data.command,
      appName: data.app_name,
      greeting: data.greeting
    };
  } catch (error) {
    console.error("API Error:", error);
    return { 
      text: "I'm having trouble connecting to my neural net right now. Please check your connection. 🦊", 
      isCommand: false 
    };
  }
};
