export interface ClientContext {
  domain?: string
  about?: string
  call_to_action?: string
  competitors?: string | string[]
  brand_pov?: string
  ideal_target_market?: string
  author_tone?: string
  author_rules?: string | string[]
  social_links?: {
    twitter?: string | null
    linkedin?: string | null
    facebook?: string | null
    instagram?: string | null
    youtube?: string | null
    tiktok?: string | null
  }
  company_details?: {
    industry?: string
    location?: string
    employees?: string
    founded?: string
  }
  brand_safety?: {
    disallowed_tones?: string[]
    disallowed_claims?: string[]
    sensitive_topics?: string[]
  }
  logos?: string[]
  colors?: string[]
  fonts?: string[]
  images_used?: string[]
  existing_blog_titles?: string[]
  questionnaire?: Array<{ question: string; answer: string }>
  ready?: boolean
}
