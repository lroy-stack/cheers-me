# Marketing Post Creator - Architecture & Component Flow

## Component Hierarchy

```
/marketing/create (Page Route)
│
└── PostCreatorForm
    ├── React Hook Form (state management)
    ├── Zod Schema (validation)
    │
    ├── Form Fields
    │   ├── Title Input
    │   ├── Platform Select (instagram | facebook | multi)
    │   ├── Language Select (nl | en | es)
    │   ├── Caption Textarea (max 2200 chars)
    │   ├── Image Upload Component
    │   └── Schedule Date Picker
    │
    ├── AI Generate Button
    │   └── Opens → AIGenerateDialog
    │       ├── Topic Input
    │       ├── Language Select
    │       ├── Tone Select
    │       ├── Hashtags Toggle
    │       ├── Context Textarea
    │       └── API Call → /api/marketing/ai-generate
    │
    ├── Action Buttons
    │   ├── Save as Draft
    │   └── Schedule/Publish
    │
    └── Live Preview (PostPreview Component)
        ├── Instagram Mockup
        ├── Facebook Mockup
        └── Multi-Platform Tabs
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                         User Input                           │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│                    React Hook Form                           │
│  ┌────────────────────────────────────────────────────┐    │
│  │  Form State (title, caption, platform, etc.)       │    │
│  └────────────┬───────────────────────────────────────┘    │
│               │                                              │
│               ▼                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │         Zod Validation Schema                      │    │
│  │  • Min/max lengths                                 │    │
│  │  • Required fields                                 │    │
│  │  • URL format for images                           │    │
│  └────────────┬───────────────────────────────────────┘    │
└───────────────┼──────────────────────────────────────────────┘
                │
                ├─────────────────────────────┐
                │                             │
                ▼                             ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│    Live Preview Component  │   │  Form Submit Handler     │
│    (Real-time updates)     │   └──────────┬────────────────┘
└───────────────────────────┘              │
                                            ▼
                              ┌───────────────────────────────┐
                              │   POST /api/marketing/        │
                              │   content-calendar            │
                              └──────────┬────────────────────┘
                                         │
                                         ▼
                              ┌───────────────────────────────┐
                              │  If scheduled/published:       │
                              │  POST /api/marketing/          │
                              │  social-posts (per platform)   │
                              └──────────┬────────────────────┘
                                         │
                                         ▼
                              ┌───────────────────────────────┐
                              │   Success Toast                │
                              │   Navigate to /marketing       │
                              └───────────────────────────────┘
```

---

## AI Generation Flow

```
User clicks "Generate with AI"
        │
        ▼
AIGenerateDialog opens
        │
        ├─ User enters topic
        ├─ Selects language
        ├─ Selects tone
        └─ Toggles hashtags
        │
        ▼
User clicks "Generate"
        │
        ▼
Frontend sends POST to /api/marketing/ai-generate
        │
        ▼
┌────────────────────────────────────────────────┐
│  Backend (Next.js API Route)                   │
│  ┌──────────────────────────────────────────┐ │
│  │  1. Validate request (Zod schema)        │ │
│  │  2. Build system prompt with business    │ │
│  │     context (beachfront, craft beers,    │ │
│  │     DJ nights, clientele, etc.)          │ │
│  │  3. Call Anthropic API (Claude Haiku)    │ │
│  └──────────────┬───────────────────────────┘ │
└─────────────────┼──────────────────────────────┘
                  │
                  ▼
┌────────────────────────────────────────────────┐
│         Claude API Response                     │
│  {                                              │
│    "caption": "Generated caption text...",      │
│    "hashtags": "#Mallorca #BeachBar ...",       │
│    "image_suggestion": "Beach sunset photo"     │
│  }                                              │
└─────────────────┬──────────────────────────────┘
                  │
                  ▼
Frontend receives response
        │
        ├─ Auto-fill caption field
        ├─ Append hashtags (if enabled)
        └─ Generate title from first line
        │
        ▼
Dialog closes, form is populated
User can edit before publishing
```

---

## State Management Strategy

### Form State (React Hook Form)
```typescript
const form = useForm<PostFormValues>({
  resolver: zodResolver(postSchema),
  defaultValues: {
    title: '',
    content_text: '',
    platform: 'instagram',
    language: 'en',
    scheduled_date: undefined,
    image_url: '',
  },
})

// Watched values for live preview
const watchedValues = form.watch()
```

### Local Component State
```typescript
const [isSubmitting, setIsSubmitting] = useState(false)
const [showAIDialog, setShowAIDialog] = useState(false)
const [imageFile, setImageFile] = useState<File | null>(null)
```

### Global State (via Props/Context)
- **User authentication**: From layout/middleware
- **Toast notifications**: Shared toast context
- **Router navigation**: Next.js router

---

## Image Upload Architecture

```
User selects/drops image file
        │
        ▼
ImageUpload Component
        │
        ├─ Validate file type
        ├─ Validate file size
        └─ Create local preview URL
        │
        ▼
┌────────────────────────────────────────────────┐
│  Current Implementation:                        │
│  • Store as local blob URL (temporary)         │
│  • For preview only                            │
└────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────┐
│  Future Implementation (Supabase Storage):     │
│                                                 │
│  1. Upload to bucket: 'social-media-images'    │
│  2. Get public URL                             │
│  3. Store URL in form state                    │
│  4. Include URL in API request                 │
└────────────────────────────────────────────────┘
```

### Planned Supabase Storage Integration

```typescript
const handleImageUpload = async (file: File) => {
  const supabase = createClient()

  // 1. Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}_${Math.random()}.${fileExt}`

  // 2. Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('social-media-images')
    .upload(`posts/${fileName}`, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw error

  // 3. Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('social-media-images')
    .getPublicUrl(`posts/${fileName}`)

  // 4. Update form state
  form.setValue('image_url', publicUrl)
}
```

---

## API Integration Points

### 1. Content Calendar API
```
POST /api/marketing/content-calendar
Body: {
  title: string
  content_text: string
  image_url: string | null
  platform: 'instagram' | 'facebook' | 'multi'
  language: 'nl' | 'en' | 'es'
  scheduled_date: string (ISO) | null
  status: 'draft' | 'scheduled' | 'published'
}
Response: ContentCalendarEntry
```

### 2. Social Posts API
```
POST /api/marketing/social-posts
Body: {
  content_calendar_id: string (UUID)
  platform: 'instagram' | 'facebook'
  caption: string
  image_url: string | null
  published_at: string (ISO)
  status: 'pending' | 'published' | 'failed'
}
Response: SocialPost
```

### 3. AI Generation API
```
POST /api/marketing/ai-generate
Body: {
  type: 'post'
  topic: string
  language: 'nl' | 'en' | 'es'
  platform: 'instagram' | 'facebook' | 'multi'
  tone: 'casual' | 'professional' | 'playful' | 'elegant'
  include_hashtags: boolean
  context?: string
}
Response: {
  success: true
  type: 'post'
  language: string
  content: {
    caption: string
    hashtags: string
    image_suggestion: string
  }
  usage: {
    input_tokens: number
    output_tokens: number
  }
}
```

---

## Validation Schema

```typescript
import { z } from 'zod'

const postSchema = z.object({
  // Internal reference title
  title: z.string()
    .min(1, 'Title is required')
    .max(100, 'Title too long'),

  // Post caption/content
  content_text: z.string()
    .min(1, 'Caption is required')
    .max(2200, 'Caption too long (max 2200 chars)'),

  // Platform selection
  platform: z.enum(['instagram', 'facebook', 'multi'], {
    required_error: 'Please select a platform',
  }),

  // Content language
  language: z.enum(['nl', 'en', 'es'], {
    required_error: 'Please select a language',
  }),

  // Optional scheduling
  scheduled_date: z.date().optional(),

  // Image URL (optional)
  image_url: z.string()
    .url('Invalid image URL')
    .optional()
    .or(z.literal('')), // Allow empty string
})

type PostFormValues = z.infer<typeof postSchema>
```

---

## Error Handling Strategy

### Form Validation Errors
```typescript
// Shown inline under each field via FormMessage component
<FormField
  control={form.control}
  name="content_text"
  render={({ field }) => (
    <FormItem>
      <FormControl>
        <Textarea {...field} />
      </FormControl>
      <FormMessage /> {/* Auto-displays validation errors */}
    </FormItem>
  )}
/>
```

### API Errors
```typescript
try {
  const response = await fetch('/api/marketing/content-calendar', {
    method: 'POST',
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to create post')
  }

  // Success handling...
} catch (error) {
  console.error('Error creating post:', error)
  toast({
    title: 'Error',
    description: error.message,
    variant: 'destructive',
  })
}
```

### Image Upload Errors
```typescript
const validateFile = (file: File): string | null => {
  if (!acceptedTypes.includes(file.type)) {
    return `File type not supported. Please upload: ${acceptedTypes.join(', ')}`
  }

  if (file.size > maxSizeBytes) {
    return `File too large. Maximum size: ${maxSizeMB}MB`
  }

  return null // No error
}
```

---

## Performance Optimizations

### 1. Live Preview Debouncing
```typescript
// Form values are watched via form.watch()
// React automatically batches updates
const watchedValues = form.watch()

// Preview component re-renders only when watched values change
<PostPreview
  caption={watchedValues.content_text || ''}
  imageUrl={watchedValues.image_url || ''}
  platform={watchedValues.platform || 'instagram'}
  language={watchedValues.language || 'en'}
/>
```

### 2. Lazy Loading Dialog
```typescript
// AIGenerateDialog only rendered when showAIDialog is true
{showAIDialog && (
  <AIGenerateDialog
    open={showAIDialog}
    onOpenChange={setShowAIDialog}
    onGenerate={handleAIGenerate}
  />
)}
```

### 3. Image Optimization
```typescript
// Future: Resize images on upload
const resizeImage = async (file: File, maxWidth: number) => {
  // Use canvas API to resize
  // Or use sharp library on server-side
  // Reduces storage costs and load times
}
```

---

## Accessibility Features

### Keyboard Navigation
- All form fields are keyboard accessible
- Tab order is logical (top to bottom)
- Dialog can be closed with Escape key
- Date picker supports arrow key navigation

### Screen Reader Support
- All form labels are properly associated
- Error messages are announced
- Loading states have aria-labels
- Images have alt text

### Focus Management
```typescript
// Dialog auto-focuses first input on open
<DialogContent>
  <Input autoFocus /> {/* First field gets focus */}
</DialogContent>

// Form submission focuses first error field
form.handleSubmit(
  onSubmit,
  (errors) => {
    // Focus first error field
    const firstError = Object.keys(errors)[0]
    form.setFocus(firstError)
  }
)
```

---

## Responsive Design Breakpoints

```css
/* Mobile First (Default) */
/* < 1024px */
.layout {
  display: flex;
  flex-direction: column; /* Stack vertically */
}

/* Desktop */
/* ≥ 1024px (lg:) */
@media (min-width: 1024px) {
  .layout {
    display: grid;
    grid-template-columns: 1fr 1fr; /* Side by side */
  }

  .preview {
    position: sticky;
    top: 1.5rem; /* Sticky preview */
  }
}
```

---

## Testing Strategy

### Unit Tests (Vitest)
```typescript
// Test form validation
describe('PostCreatorForm Validation', () => {
  it('requires title', () => {
    const result = postSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
  })

  it('limits caption to 2200 chars', () => {
    const longCaption = 'a'.repeat(2201)
    const result = postSchema.safeParse({
      title: 'Test',
      content_text: longCaption,
    })
    expect(result.success).toBe(false)
  })
})
```

### Integration Tests (Vitest + MSW)
```typescript
// Test AI generation flow
describe('AI Generation', () => {
  it('generates caption from topic', async () => {
    // Mock API response
    server.use(
      http.post('/api/marketing/ai-generate', () => {
        return HttpResponse.json({
          success: true,
          content: {
            caption: 'Generated caption',
            hashtags: '#test',
          },
        })
      })
    )

    // Trigger AI generation
    // Verify caption field is populated
  })
})
```

### E2E Tests (Playwright)
```typescript
test('Create and schedule post', async ({ page }) => {
  await page.goto('/marketing/create')

  // Fill form
  await page.fill('input[name="title"]', 'Test Post')
  await page.fill('textarea[name="content_text"]', 'Test caption')

  // Upload image
  await page.setInputFiles('input[type="file"]', 'test-image.jpg')

  // Schedule
  await page.click('button:has-text("Schedule Post")')

  // Verify success
  await expect(page.locator('text=Post scheduled successfully')).toBeVisible()
})
```

---

## Security Considerations

### Input Sanitization
- All user input validated on backend (Zod schema)
- SQL injection prevented by Supabase RLS
- XSS prevented by React's automatic escaping

### Authentication
- `/api/marketing/*` routes require auth
- Role-based access (admin/manager only)
- Token validation on every request

### File Upload Security
```typescript
// Validate file types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

// Validate file size
const MAX_SIZE_MB = 10

// Scan for malware (future)
// Use ClamAV or similar service
```

---

## Future Enhancements

### 1. Post Templates
```typescript
interface PostTemplate {
  id: string
  name: string
  content_text: string
  platform: string
  language: string
  tags: string[]
}

// Save frequently used post structures
// Quick-load templates when creating new posts
```

### 2. Scheduled Post Queue
```
/marketing/queue
├─ View all scheduled posts
├─ Drag-and-drop reordering
├─ Bulk actions (delete, reschedule)
└─ Calendar grid view
```

### 3. Post Analytics
```typescript
interface PostAnalytics {
  post_id: string
  impressions: number
  reach: number
  engagement_rate: number
  best_performing_hashtags: string[]
  optimal_post_time: string
}

// Track performance metrics
// Suggest optimal posting times
// Identify top-performing content
```

### 4. Carousel Posts
```typescript
interface CarouselPost {
  images: string[] // Multiple images
  captions: string[] // Per-image captions
  order: number[] // Display order
}

// Support Instagram carousel format
// 2-10 images per post
```

---

## Conclusion

The Marketing Post Creator follows Next.js App Router best practices with:
- ✅ Server-side rendering where possible
- ✅ Client-side interactivity where needed
- ✅ Type-safe API integration
- ✅ Comprehensive form validation
- ✅ Responsive mobile-first design
- ✅ Accessibility standards compliance
- ✅ Error handling and user feedback
- ✅ Performance optimizations

The architecture is modular, maintainable, and ready for future enhancements.
