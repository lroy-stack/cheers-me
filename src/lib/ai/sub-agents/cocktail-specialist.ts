/**
 * Cocktail Specialist Sub-Agent
 * Expert mixologist for GrandCafe Cheers. Consults recipes with stock awareness,
 * generates recipe card images (Gemini), social media posts, and recipe PDFs.
 */

import type { SubAgentResult, ProgressCallback, SubAgentContext } from './types'
import { executeSubAgent } from './engine'
import { generateGeminiImage } from '@/lib/utils/gemini-image'
import { generateRecipePdf } from '@/lib/pdf/recipe-pdf-generator'

const SYSTEM_PROMPT = `You are the expert mixologist for GrandCafe Cheers, a Mediterranean beach bar & restaurant in El Arenal, Mallorca, Spain.

## Your Expertise
- Deep knowledge of ~50 house cocktails including recipes, ingredients, costs, and preparation techniques
- Signature cocktail: "Cheers to You!" (€10.50) — house special with Mediterranean twist
- Stock awareness: can check ingredient availability and identify what can/cannot be prepared
- Multilingual: EN, NL, ES, DE

## Capabilities
1. **Recipe Lookup** — Full recipe details with ingredients, steps, costs, flavor profiles
2. **Stock Check** — Check if ingredients for a cocktail are available in current stock
3. **Missing Ingredients** — Identify cocktails that cannot be made due to stock shortages
4. **Recipe Card Image** — Generate a beautiful recipe card image using AI (Gemini)
5. **Social Media Post** — Create Instagram/Facebook posts with image and multilingual text + hashtags
6. **Recipe PDF** — Generate downloadable PDF recipe cards with full details
7. **Menu Analysis** — Analyze the cocktail menu (popularity, costs, margins, recommendations)

## Response Style
- Professional but warm, Mediterranean vibe
- Use cocktail terminology correctly (muddled, shaken, stirred, layered, etc.)
- Include practical tips for bartenders
- Always mention the glass type and garnish
- Sign creative content with: 🍸 Cheers to great cocktails!

## Important
- Use the tools provided to fetch real data. Never invent recipe details.
- For image generation and PDF generation, collect the recipe data first, then generate.
- Costs are in EUR (€). Margin = (price - cost) / price * 100.`

const TOOLS = [
  {
    name: 'get_all_cocktails',
    description: 'Get a summary list of all cocktail recipes on the menu',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'get_cocktail_detail',
    description: 'Get full recipe details for a specific cocktail by name (partial match)',
    input_schema: {
      type: 'object' as const,
      properties: {
        name: { type: 'string', description: 'Cocktail name or partial name to search for' },
      },
      required: ['name'],
    },
  },
  {
    name: 'check_ingredient_stock',
    description: 'Check current stock levels for ingredients of a specific cocktail',
    input_schema: {
      type: 'object' as const,
      properties: {
        cocktail_name: { type: 'string', description: 'Cocktail name to check stock for' },
      },
      required: ['cocktail_name'],
    },
  },
  {
    name: 'get_missing_ingredients',
    description: 'Find cocktails that cannot be prepared due to missing/low stock ingredients',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'generate_recipe_card_image',
    description: 'Generate a beautiful recipe card image for a cocktail using AI image generation',
    input_schema: {
      type: 'object' as const,
      properties: {
        cocktail_name: { type: 'string', description: 'Name of the cocktail' },
        style: { type: 'string', description: 'Image style: elegant, tropical, modern, vintage (default: elegant)' },
      },
      required: ['cocktail_name'],
    },
  },
  {
    name: 'generate_social_media_post',
    description: 'Generate a social media post with image for Instagram/Facebook. Creates multilingual text + hashtags + image.',
    input_schema: {
      type: 'object' as const,
      properties: {
        cocktail_name: { type: 'string', description: 'Cocktail to feature' },
        platform: { type: 'string', description: 'Platform: instagram, facebook (default: instagram)' },
        language: { type: 'string', description: 'Primary language for text: en, nl, es, de (default: en)' },
        theme: { type: 'string', description: 'Post theme: new_cocktail, happy_hour, signature, seasonal' },
      },
      required: ['cocktail_name'],
    },
  },
  {
    name: 'create_recipe_pdf',
    description: 'Generate a downloadable PDF recipe card with full details, ingredients, and steps',
    input_schema: {
      type: 'object' as const,
      properties: {
        cocktail_name: { type: 'string', description: 'Cocktail to generate PDF for' },
        include_costs: { type: 'boolean', description: 'Include cost breakdown (manager+ only, default: false)' },
      },
      required: ['cocktail_name'],
    },
  },
]

function createToolHandler() {
  return async function toolHandler(
    toolName: string,
    toolInput: Record<string, unknown>,
    context: SubAgentContext
  ): Promise<unknown> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = context.supabase as any

    switch (toolName) {
      case 'get_all_cocktails': {
        const { data, error } = await db
          .from('v_cocktail_recipes_full')
          .select('id, name_en, name_nl, name_es, name_de, base_spirit, glass_type, preparation_method, difficulty_level, is_signature, price, flavor_profiles')
          .order('name_en')

        if (error) return { error: error.message }
        return { cocktails: data || [], count: (data || []).length }
      }

      case 'get_cocktail_detail': {
        const { name } = toolInput as { name: string }
        const { data, error } = await db
          .from('v_cocktail_recipes_full')
          .select('*')
          .ilike('name_en', `%${name}%`)
          .limit(3)

        if (error) return { error: error.message }
        if (!data || data.length === 0) return { error: `No cocktail found matching "${name}"` }
        return { cocktails: data }
      }

      case 'check_ingredient_stock': {
        const { cocktail_name } = toolInput as { cocktail_name: string }

        // Get cocktail and its ingredients
        const { data: cocktail } = await db
          .from('v_cocktail_recipes_full')
          .select('id, name_en, ingredients')
          .ilike('name_en', `%${cocktail_name}%`)
          .limit(1)
          .single()

        if (!cocktail) return { error: `Cocktail "${cocktail_name}" not found` }

        // Check each ingredient against products stock
        const ingredients = cocktail.ingredients || []
        const stockChecks = []

        for (const ing of ingredients) {
          const { data: product } = await db
            .from('products')
            .select('id, name, current_stock, min_stock, unit')
            .ilike('name', `%${ing.name}%`)
            .limit(1)
            .single()

          stockChecks.push({
            ingredient: ing.name,
            required_qty: ing.quantity,
            required_unit: ing.unit,
            in_stock: product ? product.current_stock : null,
            stock_unit: product?.unit || null,
            below_minimum: product ? product.current_stock <= (product.min_stock || 0) : null,
            product_found: !!product,
          })
        }

        return {
          cocktail: cocktail.name_en,
          stock_checks: stockChecks,
          can_prepare: stockChecks.every(s => s.product_found && !s.below_minimum),
        }
      }

      case 'get_missing_ingredients': {
        // Get all cocktails with ingredients
        const { data: cocktails } = await db
          .from('v_cocktail_recipes_full')
          .select('id, name_en, ingredients')
          .order('name_en')

        if (!cocktails) return { error: 'Failed to fetch cocktails' }

        // Get all products with low stock
        const { data: lowStock } = await db
          .from('products')
          .select('name, current_stock, min_stock')
          .order('current_stock', { ascending: true })

        const lowStockNames = new Set<string>(
          (lowStock || [])
            .filter((p: { current_stock: number; min_stock: number }) => p.current_stock <= (p.min_stock || 0))
            .map((p: { name: string }) => p.name.toLowerCase())
        )

        const unavailable = []
        for (const cocktail of cocktails) {
          const missing = (cocktail.ingredients || [])
            .filter((ing: { name: string }) => {
              const ingLower = ing.name.toLowerCase()
              return [...lowStockNames].some((n: string) => ingLower.includes(n) || n.includes(ingLower))
            })
            .map((ing: { name: string }) => ing.name)

          if (missing.length > 0) {
            unavailable.push({
              cocktail: cocktail.name_en,
              missing_ingredients: missing,
            })
          }
        }

        return {
          unavailable_cocktails: unavailable,
          total_unavailable: unavailable.length,
          total_cocktails: cocktails.length,
        }
      }

      case 'generate_recipe_card_image': {
        const { cocktail_name, style = 'elegant' } = toolInput as { cocktail_name: string; style?: string }

        try {
          const imagePrompt = `Professional cocktail recipe card for "${cocktail_name}". Style: ${style}. Mediterranean restaurant setting. Beautiful plating on bar counter. Soft warm lighting. No text overlays. High-end food photography. Brand: GrandCafe Cheers, Mallorca beach bar.`

          const result = await generateGeminiImage(imagePrompt, { aspectRatio: '1:1' })

          return {
            success: true,
            image_base64: result.imageBase64.substring(0, 100) + '...',
            mime_type: result.mimeType,
            full_image_available: true,
            note: 'Image generated successfully. The full image has been included as an artifact.',
            _fullImage: result, // Internal: used by the artifact system
          }
        } catch (err) {
          return { error: `Image generation failed: ${err instanceof Error ? err.message : 'Unknown error'}` }
        }
      }

      case 'generate_social_media_post': {
        const { cocktail_name, platform = 'instagram', theme = 'signature' } = toolInput as {
          cocktail_name: string; platform?: string; language?: string; theme?: string
        }

        try {
          const imagePrompt = `Stunning ${platform} photo of "${cocktail_name}" cocktail. ${theme === 'happy_hour' ? 'Golden hour lighting, beach sunset background.' : 'Moody bar ambiance, warm lighting.'} Professional food photography. Mediterranean beach bar setting. No text. Aspect ratio 4:5 for Instagram.`

          const result = await generateGeminiImage(imagePrompt, {
            aspectRatio: platform === 'instagram' ? '4:3' : '16:9',
          })

          return {
            success: true,
            image_generated: true,
            mime_type: result.mimeType,
            note: 'Image generated. Now create the post text with hashtags.',
            _fullImage: result,
          }
        } catch (err) {
          return {
            success: false,
            error: `Image generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`,
            note: 'Proceed with text-only post.',
          }
        }
      }

      case 'create_recipe_pdf': {
        const { cocktail_name, include_costs = false } = toolInput as { cocktail_name: string; include_costs?: boolean }

        // Fetch recipe data
        const { data: cocktail } = await db
          .from('v_cocktail_recipes_full')
          .select('*')
          .ilike('name_en', `%${cocktail_name}%`)
          .limit(1)
          .single()

        if (!cocktail) return { error: `Cocktail "${cocktail_name}" not found` }

        try {
          const pdfBuffer = await generateRecipePdf({
            name: cocktail.name_en,
            description: cocktail.description_en,
            glass_type: cocktail.glass_type,
            preparation_method: cocktail.preparation_method,
            difficulty_level: cocktail.difficulty_level,
            base_spirit: cocktail.base_spirit,
            garnish: cocktail.garnish,
            flavor_profiles: cocktail.flavor_profiles,
            is_signature: cocktail.is_signature,
            price: cocktail.price,
            ingredients: cocktail.ingredients || [],
            steps: cocktail.steps || [],
            showCosts: include_costs,
          })

          const base64 = pdfBuffer.toString('base64')

          return {
            success: true,
            pdf_base64: base64.substring(0, 100) + '...',
            pdf_size_bytes: pdfBuffer.length,
            cocktail_name: cocktail.name_en,
            note: 'PDF generated successfully. Available as downloadable artifact.',
            _fullPdf: base64,
          }
        } catch (err) {
          return { error: `PDF generation failed: ${err instanceof Error ? err.message : 'Unknown error'}` }
        }
      }

      default:
        return { error: `Unknown tool: ${toolName}` }
    }
  }
}

export async function executeCocktailSpecialist(
  params: Record<string, unknown>,
  context: SubAgentContext,
  progress: ProgressCallback
): Promise<SubAgentResult> {
  const task = (params.task || 'custom') as string
  const cocktailName = (params.cocktail_name || '') as string
  const query = (params.query || '') as string
  const language = (params.language || 'en') as string

  let userPrompt: string

  switch (task) {
    case 'recipe_lookup':
      userPrompt = `Look up the full recipe for "${cocktailName}". Include all ingredients with quantities, preparation steps, glass type, garnish, flavor profiles, and difficulty. Language: ${language}.`
      break
    case 'stock_check':
      userPrompt = `Check if we have all ingredients in stock to prepare "${cocktailName}". Report what's available, what's missing or low, and whether we can make it.`
      break
    case 'missing_ingredients':
      userPrompt = `Analyze our entire cocktail menu against current stock levels. Which cocktails can't we prepare right now? List them with the missing ingredients.`
      break
    case 'recipe_card_image':
      userPrompt = `Generate a beautiful recipe card image for "${cocktailName}". First look up the recipe details, then generate the image.`
      break
    case 'social_media_post':
      userPrompt = `Create a social media post for "${cocktailName}". First get the recipe details, then generate an image and write engaging post text in ${language} with relevant hashtags. Include multilingual versions (EN, NL, ES, DE).`
      break
    case 'recipe_pdf':
      userPrompt = `Generate a PDF recipe card for "${cocktailName}" with all details including ingredients, steps, and metadata.`
      break
    case 'menu_analysis':
      userPrompt = `Analyze our complete cocktail menu. Get all cocktails and provide insights on: variety, difficulty distribution, flavor profile coverage, signature cocktails, and recommendations for improvement.`
      break
    default:
      userPrompt = query || `Assist with cocktail-related query: ${cocktailName || 'general cocktail question'}`
  }

  progress('Consulting cocktail database...')

  const toolHandler = createToolHandler()

  // Determine model: Haiku for data lookup, Sonnet for creative tasks
  const creativeTaskTypes = ['recipe_card_image', 'social_media_post', 'recipe_pdf', 'menu_analysis']
  const model = creativeTaskTypes.includes(task)
    ? 'claude-sonnet-4-5-20250929'
    : 'claude-haiku-4-5-20251001'

  const result = await executeSubAgent(
    {
      name: 'cocktail_specialist',
      model,
      systemPrompt: SYSTEM_PROMPT,
      maxIterations: 8,
      maxTokens: 4096,
      tools: TOOLS,
      toolHandler,
    },
    userPrompt,
    progress,
    context
  )

  return result
}
