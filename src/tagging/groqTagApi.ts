
import OpenAI from "openai";

export async function getTags(input: string){
    const promt = "analyze document and "
    
    const client = new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
    });

    const response = await client.responses.create({
        model: "openai/gpt-oss-20b",
        input: input
    });

    return response
}
