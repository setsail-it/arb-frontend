export interface Client {
  id: number
  name: string
  slug?: string | null
  notes?: string | null
  owner_id?: number | null
  owner_username?: string | null
  created_at?: string
}

export interface User {
  id: number
  username: string
  is_admin: boolean
}

export interface ClientContext {
  id?: number
  client_id?: number
  edit_token?: string | null
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
  staff_bios?: Array<{
    full_name: string
    title: string
    blog_bio: string
    profile_photo: string
  }>
  questionnaire?: Array<{ question: string; answer: string }>
  ready?: boolean
  discovery_call_url?: string | null
  deep_dive_url?: string | null
}

// Alias for clarity
export type GeneralContext = ClientContext

export interface DiscoveryDocument {
  id?: number
  client_id?: number
  edit_token?: string | null
  created_at?: string
  updated_at?: string

  // Domain (entered when creating client or manually)
  domain?: string | null

  // Section 0: Meta/Header
  client_name?: string | null
  discovery_date?: string | null
  contact_name?: string | null
  contact_title?: string | null
  contact_email?: string | null
  contact_phone?: string | null
  industry?: string | null

  // Section 1: Company Overview & Business Objectives
  // 1.1 Company Background
  primary_business?: string | null
  years_in_business?: string | null
  annual_revenue?: string | null
  num_employees?: number | null
  geographic_market?: string | null

  // 1.2 Lead Generation Goals
  primary_goal_12_months?: string | null
  target_leads_per_month?: number | null
  target_leads_timeframe?: string | null
  target_cpl_amount?: string | null
  target_cpl_reasoning?: string | null
  qualified_lead_definition?: string | null
  customer_ltv?: string | null
  customer_ltv_calculation?: string | null
  sales_cycle_length?: string | null
  close_rate_percent?: string | null
  close_rate_not_tracked?: boolean | null

  // 1.3 Current Marketing Performance
  current_monthly_leads?: number | null
  current_lead_generation_method?: string | null
  current_sql_percent?: string | null
  previous_marketing_efforts?: Array<{
    channel_name?: string
    timeframe?: string
    result?: string
    why_worked?: string
  }> | null
  what_is_working?: string | null

  // 1.4 Budget
  budget_monthly?: string | null
  budget_quarterly?: string | null
  budget_annual?: string | null
  leadgen_budget_monthly?: string | null
  leadgen_budget_quarterly?: string | null
  leadgen_budget_annual?: string | null
  seasonal_peak_months?: string | null
  seasonal_slow_months?: string | null
  seasonal_details?: string | null

  // Section 2: Target Audience
  // 2.1 Primary Target Audience
  ideal_customer_description?: string | null
  decision_maker_titles?: string | null
  decision_authority_level?: string | null
  target_company_size?: string | null
  target_industries?: string | null
  geographic_focus?: string | null
  customer_age_range?: string | null
  customer_gender?: string | null
  customer_education?: string | null
  customer_income_range?: string | null
  pain_point_1?: string | null
  pain_point_2?: string | null
  pain_point_3?: string | null
  goal_motivation_1?: string | null
  goal_motivation_2?: string | null
  goal_motivation_3?: string | null
  buying_process?: string | null

  // 2.2 Secondary Target Audiences
  secondary_audiences?: Array<{
    description?: string
    job_titles?: string
    why_target?: string
  }> | null

  // Section 3: Value Proposition & Messaging
  // 3.1 Differentiation
  differentiation?: string | null
  value_prop_1?: string | null
  value_prop_2?: string | null
  value_prop_3?: string | null
  why_choose_us?: string | null

  // 3.2 Brand Messaging
  market_perception?: string | null
  brand_voice_tones?: string[] | null
  brand_voice_other?: string | null
  messaging_theme_1?: string | null
  messaging_theme_2?: string | null
  messaging_theme_3?: string | null
  testimonials_available?: string | null
  testimonials_count?: number | null
  testimonials_examples?: string | null
  proof_customer_stories?: string | null
  proof_statistics?: string | null
  proof_awards?: string | null
  proof_notable_customers?: string | null

  // Section 4: Competitive Landscape
  competitor_1?: string | null
  competitor_2?: string | null
  competitor_3?: string | null
  competitor_channels?: Array<{
    name?: string
    google_ads?: boolean
    meta_ads?: boolean
    social_media?: boolean
    seo_content?: boolean
    website_quality?: string
    other_channels?: string
  }> | null
  competitor_strengths?: string | null
  competitive_advantages?: string | null

  // Section 5: SetSail Services Assessment
  services_interested?: string[] | null
  services_interest_reasons?: Record<string, string> | null
  google_ads_used?: boolean | null
  google_ads_experience?: string | null
  meta_ads_used?: boolean | null
  meta_ads_experience?: string | null
  social_media_used?: boolean | null
  social_media_experience?: string | null
  seo_used?: boolean | null
  seo_experience?: string | null
  website_dev_used?: boolean | null
  website_dev_experience?: string | null
  services_not_wanted?: boolean | null
  services_not_wanted_details?: string | null

  // Section 6: Current Digital Presence
  // 6.1 Website
  has_website?: boolean | null
  website_url?: string | null
  website_status?: string[] | null
  website_status_other?: string | null
  website_monthly_visitors?: number | null
  website_conversion_rate?: string | null
  website_main_issues?: string | null

  // 6.2 Social Media Presence
  social_platforms?: Array<{
    platform?: string
    followers?: number
    activity_level?: string
    primary_goal?: string
  }> | null
  social_strategy?: string | null

  // Section 7: Analytics & Tracking
  analytics_tools?: string[] | null
  analytics_other?: string | null
  crm_name?: string | null
  crm_features_used?: string | null
  lead_data_tracked?: string | null
  conversion_tracking_status?: string | null
  conversion_tracking_details?: string | null
  crm_integration_possible?: string | null
  crm_integration_details?: string | null

  // Section 8: Current Tech Stack
  tools_used?: string[] | null
  tools_other?: string | null

  // Section 9: Team & Support
  // 9.1 Team Structure
  poc_name?: string | null
  poc_title?: string | null
  poc_email?: string | null
  poc_phone?: string | null
  poc_availability?: string | null
  other_stakeholders?: Array<{
    name?: string
    title?: string
    role?: string
    email?: string
  }> | null
  final_decision_name?: string | null
  final_decision_title?: string | null
  decision_timeline?: string | null

  // 9.2 Resources
  resources_available?: string[] | null
  resources_other?: string | null
  has_dev_support?: boolean | null
  has_marketing_support?: boolean | null
  has_sales_support?: boolean | null
  internal_resources_other?: string | null

  // Section 10: Timeline & Expectations
  target_launch_date?: string | null
  urgency_level?: string | null
  first_leads_timeframe?: string | null
  ramp_up_timeframe?: string | null
  full_results_timeframe?: string | null
  success_indicator_1?: string | null
  success_indicator_2?: string | null
  success_indicator_3?: string | null
  exceed_expectations?: string | null
  concern_1?: string | null
  concern_2?: string | null
  concern_3?: string | null

  // Section 11: Additional Information
  regulatory_considerations?: string[] | null
  regulatory_other?: string | null
  industry_keywords?: string | null
  is_seasonal?: boolean | null
  seasonality_peak?: string | null
  seasonality_slow?: string | null
  seasonality_strategy?: string | null
  anything_else?: string | null
  success_definition?: string | null

  // Final Consent
  case_study_consent?: string | null
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
  id: number
  state: string
  created_at: string
  updated_at: string
  error_message?: string | null
  brief?: {
    primary_keyword: string
    secondary_keywords: string[]
    author_tone?: string
    domain?: string
    about?: string
    target_market?: string
    b1_title?: string
  } | null
  latest_sq_report?: any | null
  draft_html?: string | null
  final_post?: {
    title: string
    slug: string
    seo_score?: number | null
  } | null
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

export interface StrategyDocument {
  id?: number
  client_id?: number
  content?: string | null
  perplexity_citations?: string[] | null
  created_at?: string
  updated_at?: string
}

export interface DiscoveryCallAnswer {
  question_number: number | string
  question: string
  answer: string
  certainty: string
}

export interface DiscoveryCallResult {
  id?: number
  client_id?: number
  fathom_url?: string | null
  recording_id?: string | null
  raw_analysis?: string | null
  json_output?: string | null
  answers_data?: DiscoveryCallAnswer[] | null
  factoids_summary?: string | null
  created_at?: string
  updated_at?: string
}

export interface DeepDiveResult {
  id?: number
  client_id?: number
  fathom_url?: string | null
  recording_id?: string | null
  raw_analysis?: string | null
  json_output?: string | null
  answers_data?: DiscoveryCallAnswer[] | null
  factoids_summary?: string | null
  created_at?: string
  updated_at?: string
}

// Versioned Strategy types
export interface StrategySection {
  name: string
  content: string
}

export interface VersionedStrategy {
  client_id: number
  version_number: number
  created_at: string
  updated_at: string
  full_document: string
  sections: Record<string, StrategySection>
}

export interface StrategyVersion {
  version_number: number
  created_at: string | null
  updated_at: string | null
}

export interface StrategyVersionList {
  client_id: number
  total_versions: number
  versions: StrategyVersion[]
}

export interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
  toolCalls?: Array<{
    name: string
    arguments: Record<string, unknown>
    result?: string
  }>
}
