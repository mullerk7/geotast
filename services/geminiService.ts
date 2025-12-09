import { GoogleGenAI } from "@google/genai";
import { CountryData, Language } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found. AI features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const getFunFact = async (country: CountryData, language: Language): Promise<string> => {
  const ai = getClient();
  if (!ai) return "";

  const countryName = language === 'en' ? country.name_en : country.name;
  const langPrompt = language === 'en' ? 'in English' : 'em Português';

  const prompt = `
    Tell me an ultra interesting and little known fun fact about ${countryName} in one sentence ${langPrompt}.
    Focus on surprising statistics or culture.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text || "";
  } catch (error) {
    return "";
  }
};