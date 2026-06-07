import { GoogleGenAI, Type } from "@google/genai";
import { GraphData } from "../types";

// Step 1: Gather Context using Search Grounding (Gemini 2.5 Flash)
export const fetchContextWithSearch = async (topic: string): Promise<string> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Find detailed, structured information about the topic: "${topic}". 
      Focus on identifying its parent domains (broader categories), child concepts (components/sub-types), and specific examples (leaf nodes). 
      Identify clear relationships (e.g., "is a type of", "is part of", "leads to").
      Provide a comprehensive summary that covers taxonomy and ontology aspects.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No context returned from search.");
    }
    
    return text;
  } catch (error) {
    console.error("Search Step Failed:", error);
    // Fallback: Return the topic itself to let the thinking model handle it without grounded info if search fails
    return `Analysis of ${topic}`;
  }
};

// Step 2: Generate Graph Structure using Deep Reasoning (Gemini 3 Pro Thinking)
export const generateHierarchyGraph = async (topic: string, context: string): Promise<GraphData> => {
  if (!process.env.API_KEY) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const systemInstruction = `
    You are a Semantic Hierarchy Graph Builder.
    Your job is to take an input topic and context to produce a multi-level hierarchical concept map.
    
    Output Requirements:
    1. Analyze the provided Context and Topic deeply.
    2. Structure the data into Levels:
       - Level 0: Core topic (The input topic itself)
       - Level 1: Parent domains / broader categories
       - Level 2: Child concepts / components
       - Level 3: Leaf examples / applications
    3. Define Relationships (Edges) using types: "is a type of", "is part of", "includes", "leads to", "example of".
    4. Identify a list of 5-10 directly related concepts that share commonalities or are frequently discussed together but aren't necessarily hierarchical.
    5. Provide a concise but informative description (1-2 sentences) for each node.
    6. Return ONLY valid JSON matching the schema.
  `;

  const prompt = `
    Topic: ${topic}
    Context from Live Search:
    ${context}

    Generate the JSON graph and related concepts now.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        thinkingConfig: {
            thinkingBudget: 32768, // Max budget for deep reasoning
        },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  level: { type: Type.INTEGER, description: "0 for Core, 1 for Parent, 2 for Child, 3 for Leaf" },
                  label: { type: Type.STRING },
                  description: { type: Type.STRING, description: "A concise, informative description of the node." }
                },
                required: ["id", "level", "label", "description"]
              }
            },
            edges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  source: { type: Type.STRING },
                  target: { type: Type.STRING },
                  type: { type: Type.STRING }
                },
                required: ["source", "target", "type"]
              }
            },
            relatedConcepts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A list of directly related concepts."
            }
          },
          required: ["nodes", "edges", "relatedConcepts"]
        }
      },
    });

    const text = response.text;
    if (!text) {
        throw new Error("No data generated from thinking model.");
    }

    let data = JSON.parse(text) as GraphData;
    
    // Ensure nodes, edges, and relatedConcepts are arrays even if missing from response
    if (!data.nodes) data.nodes = [];
    if (!data.edges) data.edges = [];
    if (!data.relatedConcepts) data.relatedConcepts = [];
    
    return data;

  } catch (error) {
    console.error("Thinking Step Failed:", error);
    throw error;
  }
};