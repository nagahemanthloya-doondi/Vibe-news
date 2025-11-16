import { GoogleGenAI, Modality } from "@google/genai";
import type { NewsArticle, GroundingChunk } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function generateImageForArticle(headline: string): Promise<string> {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [{ text: `A vibrant, high-quality, photorealistic image for a news article with the headline: "${headline}". The image should be visually compelling and directly relevant to the headline's topic. Aspect ratio 16:9.` }],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return `data:image/png;base64,${part.inlineData.data}`;
            }
        }
        throw new Error('No image data found in response.');
    } catch (error) {
        console.error(`Error generating image for headline "${headline}":`, error);
        // Return a placeholder image on failure
        return `https://picsum.photos/seed/${headline.replace(/\s/g, '')}/800/400`;
    }
}

export async function getArticleDetails(article: NewsArticle): Promise<string> {
    try {
        const prompt = `
            You are an expert journalist and editor. Your task is to expand a news summary into a full, detailed article.
            The article should be well-structured, comprehensive, and provide a thorough explanation of the topic.
            Use simple Markdown for formatting: use '###' for subheadings and separate paragraphs with a single newline. Do not use any other Markdown syntax.

            Based on the following information:
            Headline: "${article.headline}"
            Summary: "${article.summary}"
            Key Details: ${article.keyDetails.join(', ')}

            Please generate the full article content now.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Error fetching article details:", error);
        throw new Error("Could not load the full article. Please try again later.");
    }
}


async function fetchAndProcessNews(prompt: string): Promise<{ articles: NewsArticle[], sources: GroundingChunk[] }> {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }, { googleMaps: {} }],
        },
    });

    let rawText = response.text.trim();

    const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
        rawText = jsonMatch[1];
    }

    const parsedArticles: Omit<NewsArticle, 'imageUrl'>[] = JSON.parse(rawText);

    const imagePromises = parsedArticles.map(article => generateImageForArticle(article.headline));
    const imageUrls = await Promise.all(imagePromises);

    const articles: NewsArticle[] = parsedArticles.map((article, index) => ({
        ...article,
        imageUrl: imageUrls[index],
    }));

    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const sources: GroundingChunk[] = groundingMetadata?.groundingChunks || [];

    return { articles, sources };
}

export async function getNews(topic: string, location: string): Promise<{ articles: NewsArticle[], sources: GroundingChunk[] }> {
    try {
        const currentDate = new Date().toDateString();
        const prompt = `
            You are 'Vibe News Cards', an expert news curator AI. Your task is to find the most relevant and recent news stories based on a given topic and location. The news must be from today, ${currentDate}.

            Topic: "${topic}"
            Location: "${location}"
            Date: "${currentDate}"

            Your response MUST be a valid JSON array of objects. Do not include any introductory text, closing text, or any other content outside of the JSON array itself. The array should contain 5 to 7 news articles. Each object in the array represents a single news flashcard and must have the following structure:
            {
              "headline": "A concise and catchy headline for the news story. Should be impactful and short.",
              "summary": "A brief summary of the news story, written in an engaging and easy-to-understand tone. Maximum 3-4 sentences.",
              "keyDetails": [
                "A list of 3-4 bullet points highlighting the most important facts or figures.",
                "Each point should be a short, direct string."
              ]
            }

            Ensure the news is current, from today, and highly relevant to the provided geographical location.
        `;

        return await fetchAndProcessNews(prompt);
    } catch (error) {
        console.error("Error fetching news from Gemini:", error);
        if (error instanceof SyntaxError) {
             throw new Error("Failed to parse the news data. The AI might have returned an unexpected format.");
        }
        throw new Error("Could not fetch news. Please try again with a different topic.");
    }
}

export async function getNewsFromUrls(urls: string[]): Promise<{ articles: NewsArticle[], sources: GroundingChunk[] }> {
    try {
        const currentDate = new Date().toDateString();
        const sourcePrompt = urls.length === 1
            ? `News Source URL: "${urls[0]}"`
            : `News Source URLs:\n${urls.map(u => `- ${u}`).join('\n')}`;
        
        const prompt = `
            You are 'Vibe News Cards', an expert news curator AI. Your task is to find the most relevant and recent news stories based on the provided web source(s). The news must be from today, ${currentDate}.

            ${sourcePrompt}

            Your response MUST be a valid JSON array of objects. Do not include any introductory text, closing text, or any other content outside of the JSON array itself. The array should contain 5 to 7 news articles. Each object in the array represents a single news flashcard and must have the following structure:
            {
              "headline": "A concise and catchy headline for the news story. Should be impactful and short.",
              "summary": "A brief summary of the news story, written in an engaging and easy-to-understand tone. Maximum 3-4 sentences.",
              "keyDetails": [
                "A list of 3-4 bullet points highlighting the most important facts or figures.",
                "Each point should be a short, direct string."
              ]
            }

            Use your web search capabilities to find the latest content from the provided source(s). If multiple sources are provided, create a unified list of the most important stories from all of them.
        `;
        
        return await fetchAndProcessNews(prompt);
    } catch (error) {
        console.error("Error fetching news from custom source:", error);
        if (error instanceof SyntaxError) {
             throw new Error("Failed to parse the news data from the source. The AI might have returned an unexpected format.");
        }
        throw new Error("Could not fetch news from the provided source. Please check the URL/file and try again.");
    }
}
