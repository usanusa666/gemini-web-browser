import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

export class AIService {
  private static client: GoogleGenerativeAI;

  static initialize(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  static async generateText(prompt: string, model: string = 'gemini-2.0-flash'): Promise<string> {
    const genAI = this.client;
    const model_ = genAI.getGenerativeModel({ model });
    const result = await model_.generateContent(prompt);
    return result.response.text();
  }

  static async generateImage(prompt: string, aspectRatio: string = '1:1'): Promise<string> {
    const genAI = this.client;
    const model = genAI.getGenerativeModel({ model: 'imagen-3.0-generate-001' });
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    });
    return result.response.text();
  }

  static async generateVideo(prompt: string, imageBase64?: string, aspectRatio: string = '16:9'): Promise<string> {
    const genAI = this.client;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Generate a video with the following specifications:\nPrompt: ${prompt}\nAspect Ratio: ${aspectRatio}${imageBase64 ? '\nBase Image provided' : ''}`
            }
          ]
        }
      ]
    });
    return result.response.text();
  }

  static async analyzeContent(content: Blob, prompt?: string, model: string = 'gemini-2.0-flash'): Promise<string> {
    const base64Data = await this.fileToBase64(content);
    const mimeType = content.type;
    const genAI = this.client;
    const model_ = genAI.getGenerativeModel({ model });

    const result = await model_.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            },
            {
              text: prompt || `What is in this ${content.type.split('/')[0]}?`
            }
          ]
        }
      ]
    });

    return result.response.text();
  }

  static async chat(
    messages: Array<{ role: string; text: string }>,
    userLocation?: { latitude: number; longitude: number }
  ): Promise<string> {
    const genAI = this.client;
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const contents = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    const result = await model.generateContent({
      contents
    });

    return result.response.text();
  }

  private static fileToBase64(file: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  }
}