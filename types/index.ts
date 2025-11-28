export interface Client {
  id: string
  name: string
  created_at?: string
}

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

export interface KeywordIdea {
  id: number
  client_id: number
  keyword: string
  source: string | null
  search_volume: number | null
  keyword_difficulty: number | null
  created_at?: string
}

export interface KeywordClusterKeyword {
  keyword: string
  search_volume: number | null
  keyword_difficulty: number | null
  intent?: number | null
  quality?: number | null
}

export interface KeywordCluster {
  id: number
  client_id: number
  label: string
  keywords: KeywordClusterKeyword[]
  created_at?: string
}

export interface KeywordSet {
  id: number
  client_id: number
  primary_keyword: string
  primary_search_volume: number | null
  primary_keyword_difficulty: number | null
  primary_intent?: number | null
  primary_quality?: number | null
  secondaries: Array<{
    keyword: string
    search_volume: number | null
    keyword_difficulty?: number | null
  }> | null
  created_at?: string
}

export interface BlogIdea {
  id: number
  client_id: number
  topic: string
  keyword_set_id: number | null
  state: "unqueued" | "queued" | "in_progress" | "complete" | "failed"
  error_message: string | null
  brief_json: {
    primary_keyword: string
    secondary_keywords: string[]
    author_tone: string
    domain: string
    about: string
    target_market: string
    b1_title: string
  } | null
  latest_sq_report: any | null
  iteration_count: number | null
  draft_html: string | null
  created_at: string
  updated_at: string
}

export interface BlogIdeaDebug {
  idea_id: string
  client_id: string
  debug_info?: any
}

export interface BestAlternateResult {
  id: number
  client_id: number
  original_keyword_id: number
  keyword: string
  search_volume: number | null
  keyword_difficulty: number | null
  is_original: boolean
  created_at: string
  updated_at: string
}
