/**
 * Gemini Image Generation Utility
 * Uses Google Gemini gemini-2.5-flash-image model for image generation.
 */

import { GoogleGenAI } from '@google/genai'

const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image'

interface GeminiImageOptions {
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
}

interface GeminiImageResult {
  imageBase64: string
  mimeType: string
}

let _client: GoogleGenAI | null = null

function getClient(): GoogleGenAI {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY or GOOGLE_AI_API_KEY must be set')
    }
    _client = new GoogleGenAI({ apiKey })
  }
  return _client
}

export async function generateGeminiImage(
  prompt: string,
  options: GeminiImageOptions = {}
): Promise<GeminiImageResult> {
  const ai = getClient()
  const { aspectRatio = '1:1' } = options

  const enhancedPrompt = `${prompt}\n\nAspect ratio: ${aspectRatio}. High quality, professional photography style.`

  let response
  try {
    response = await ai.models.generateContent({
      model: GEMINI_IMAGE_MODEL,
      contents: enhancedPrompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    })
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string }
    if (err.status === 429) {
      throw new Error('Gemini API quota exceeded. Please check your billing at https://ai.google.dev/pricing or wait for quota reset.')
    }
    if (err.status === 403) {
      throw new Error('Gemini API key does not have permission for image generation. Enable the Generative Language API in Google Cloud Console.')
    }
    if (err.status === 404) {
      throw new Error(`Gemini model ${GEMINI_IMAGE_MODEL} not available. Check https://ai.google.dev/gemini-api/docs/models for current models.`)
    }
    throw new Error(`Gemini API error (${err.status || 'unknown'}): ${err.message || 'Unknown error'}`)
  }

  // Extract image from response parts
  const parts = response.candidates?.[0]?.content?.parts
  if (!parts) {
    throw new Error('No response parts from Gemini')
  }

  for (const part of parts) {
    if (part.inlineData?.data && part.inlineData.mimeType?.startsWith('image/')) {
      return {
        imageBase64: part.inlineData.data,
        mimeType: part.inlineData.mimeType,
      }
    }
  }

  throw new Error('No image found in Gemini response')
}
