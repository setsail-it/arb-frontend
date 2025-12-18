"use client"

import { useState, useEffect } from "react"
import type { Client, DiscoveryDocument } from "@/types"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Plus, Trash2, Copy, Check, Link2, Wand2, Globe } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface Props {
  client: Client
  isPublicMode?: boolean
  editToken?: string
}

// Checkbox options
const BRAND_VOICE_OPTIONS = [
  "Professional / Corporate",
  "Casual / Conversational",
  "Educational / Thought Leadership",
  "Results-Driven / ROI-Focused",
  "Innovative / Forward-Thinking",
  "Supportive / Customer-Centric",
]

const SERVICES_OPTIONS = [
  { value: "google_ads", label: "Google Ads - Search engine paid advertising" },
  { value: "meta_ads", label: "Meta Ads - Facebook & Instagram advertising" },
  { value: "social_media", label: "Social Media Management - Content, engagement, community" },
  { value: "seo", label: "SEO Services - Organic search optimization" },
  { value: "website_dev", label: "Website Development - Website design & build" },
]

const WEBSITE_STATUS_OPTIONS = [
  "Recently built",
  "Needs updating / redesign",
  "Being built",
]

const ANALYTICS_TOOLS_OPTIONS = [
  "Google Analytics 4",
  "Google Analytics (Universal Analytics)",
  "None currently",
]

const TECH_STACK_OPTIONS = [
  "Google Workspace (Gmail, Docs, Sheets)",
  "Microsoft 365",
  "Slack",
  "Monday.com",
  "Asana",
  "Salesforce",
  "HubSpot",
  "Zapier",
]

const RESOURCES_OPTIONS = [
  "Brand guidelines / style guide",
  "Product / service information documents",
  "Customer testimonials / case studies",
  "Previous marketing materials",
  "Product images / videos",
  "Technical support for website / tracking",
  "Sales team insights about customers",
  "Email lists or customer data",
]

const REGULATORY_OPTIONS = [
  "HIPAA (Healthcare)",
  "GDPR / Privacy regulations",
  "Financial services regulations",
  "Advertising restrictions",
  "None",
]

export function DiscoveryDocumentForm({ client, isPublicMode = false, editToken }: Props) {
  const [doc, setDoc] = useState<DiscoveryDocument>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [generatingToken, setGeneratingToken] = useState(false)
  const [generatingDraft, setGeneratingDraft] = useState(false)

  // Stub function to generate initial draft - fills "test" in all text fields
  const handleGenerateInitialDraft = async () => {
    setGeneratingDraft(true)
    
    // Stub: Fill all text fields with "test"
    const draftDoc: DiscoveryDocument = {
      ...doc,
      // Keep existing domain and edit_token
      domain: doc.domain,
      edit_token: doc.edit_token,
      
      // Section 0: Meta/Header
      client_name: "test",
      contact_name: "test",
      contact_title: "test",
      contact_email: "test@test.com",
      contact_phone: "123-456-7890",
      industry: "test",
      
      // Section 1: Company Overview
      primary_business: "test",
      years_in_business: "test",
      annual_revenue: "test",
      num_employees: 10,
      geographic_market: "test",
      primary_goal_12_months: "test",
      target_leads_per_month: 100,
      target_leads_timeframe: "test",
      target_cpl_amount: "test",
      target_cpl_reasoning: "test",
      qualified_lead_definition: "test",
      customer_ltv: "test",
      customer_ltv_calculation: "test",
      sales_cycle_length: "test",
      close_rate_percent: "test",
      current_monthly_leads: 50,
      current_lead_generation_method: "test",
      current_sql_percent: "test",
      what_is_working: "test",
      budget_monthly: "test",
      budget_quarterly: "test",
      budget_annual: "test",
      leadgen_budget_monthly: "test",
      leadgen_budget_quarterly: "test",
      leadgen_budget_annual: "test",
      seasonal_peak_months: "test",
      seasonal_slow_months: "test",
      seasonal_details: "test",
      
      // Section 2: Target Audience
      ideal_customer_description: "test",
      decision_maker_titles: "test",
      decision_authority_level: "C-Suite",
      target_company_size: "test",
      target_industries: "test",
      geographic_focus: "test",
      customer_age_range: "test",
      customer_gender: "All",
      customer_education: "Any",
      customer_income_range: "test",
      pain_point_1: "test",
      pain_point_2: "test",
      pain_point_3: "test",
      goal_motivation_1: "test",
      goal_motivation_2: "test",
      goal_motivation_3: "test",
      buying_process: "test",
      
      // Section 3: Value Proposition
      differentiation: "test",
      value_prop_1: "test",
      value_prop_2: "test",
      value_prop_3: "test",
      why_choose_us: "test",
      market_perception: "test",
      brand_voice_other: "test",
      messaging_theme_1: "test",
      messaging_theme_2: "test",
      messaging_theme_3: "test",
      testimonials_available: "Yes",
      testimonials_count: 5,
      testimonials_examples: "test",
      proof_customer_stories: "test",
      proof_statistics: "test",
      proof_awards: "test",
      proof_notable_customers: "test",
      
      // Section 4: Competitive Landscape
      competitor_1: "test",
      competitor_2: "test",
      competitor_3: "test",
      competitor_strengths: "test",
      competitive_advantages: "test",
      
      // Section 5: Services
      services_not_wanted_details: "test",
      
      // Section 6: Digital Presence
      website_url: "test.com",
      website_status_other: "test",
      website_monthly_visitors: 1000,
      website_conversion_rate: "test",
      website_main_issues: "test",
      social_strategy: "test",
      
      // Section 7: Analytics
      analytics_other: "test",
      crm_name: "test",
      crm_features_used: "test",
      lead_data_tracked: "test",
      conversion_tracking_status: "Yes – Fully set up",
      conversion_tracking_details: "test",
      crm_integration_possible: "Yes – CRM supports integrations",
      crm_integration_details: "test",
      
      // Section 8: Tech Stack
      tools_other: "test",
      
      // Section 9: Team
      poc_name: "test",
      poc_title: "test",
      poc_email: "test@test.com",
      poc_phone: "123-456-7890",
      poc_availability: "test",
      final_decision_name: "test",
      final_decision_title: "test",
      decision_timeline: "test",
      resources_other: "test",
      internal_resources_other: "test",
      
      // Section 10: Timeline
      urgency_level: "Moderate",
      first_leads_timeframe: "test",
      ramp_up_timeframe: "test",
      full_results_timeframe: "test",
      success_indicator_1: "test",
      success_indicator_2: "test",
      success_indicator_3: "test",
      exceed_expectations: "test",
      concern_1: "test",
      concern_2: "test",
      concern_3: "test",
      
      // Section 11: Additional
      regulatory_other: "test",
      industry_keywords: "test",
      seasonality_peak: "test",
      seasonality_slow: "test",
      seasonality_strategy: "test",
      anything_else: "test",
      success_definition: "test",
      case_study_consent: "Yes",
    }
    
    setDoc(draftDoc)
    setGeneratingDraft(false)
  }

  const loadDocument = async () => {
    setLoading(true)
    setError(null)
    try {
      let data: DiscoveryDocument
      if (isPublicMode && editToken) {
        data = await api.getPublicDiscoveryDocument(editToken)
      } else {
        data = await api.getDiscoveryDocument(client.id)
      }
      setDoc(data)
    } catch (e: any) {
      if (e.status !== 404) {
        setError(e.message)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocument()
  }, [client.id, editToken])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (isPublicMode && editToken) {
        await api.savePublicDiscoveryDocument(editToken, doc)
      } else {
        await api.saveDiscoveryDocument(client.id, doc)
      }
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateEditToken = async () => {
    setGeneratingToken(true)
    try {
      const updated = await api.generateDiscoveryDocEditToken(client.id)
      setDoc(prev => ({ ...prev, edit_token: updated.edit_token }))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setGeneratingToken(false)
    }
  }

  const handleCopyEditLink = () => {
    if (doc.edit_token) {
      const url = `${window.location.origin}/public/discovery-document/${doc.edit_token}`
      navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const toggleArrayValue = (field: keyof DiscoveryDocument, value: string) => {
    setDoc(prev => {
      const arr = (prev[field] as string[] | null) || []
      if (arr.includes(value)) {
        return { ...prev, [field]: arr.filter(v => v !== value) }
      } else {
        return { ...prev, [field]: [...arr, value] }
      }
    })
  }

  // Repeating group helpers
  const addMarketingEffort = () => {
    setDoc(prev => ({
      ...prev,
      previous_marketing_efforts: [
        ...(prev.previous_marketing_efforts || []),
        { channel_name: "", timeframe: "", result: "", why_worked: "" }
      ]
    }))
  }

  const removeMarketingEffort = (idx: number) => {
    setDoc(prev => ({
      ...prev,
      previous_marketing_efforts: prev.previous_marketing_efforts?.filter((_, i) => i !== idx)
    }))
  }

  const addSecondaryAudience = () => {
    setDoc(prev => ({
      ...prev,
      secondary_audiences: [
        ...(prev.secondary_audiences || []),
        { description: "", job_titles: "", why_target: "" }
      ]
    }))
  }

  const removeSecondaryAudience = (idx: number) => {
    setDoc(prev => ({
      ...prev,
      secondary_audiences: prev.secondary_audiences?.filter((_, i) => i !== idx)
    }))
  }

  const addCompetitorChannel = () => {
    setDoc(prev => ({
      ...prev,
      competitor_channels: [
        ...(prev.competitor_channels || []),
        { name: "", google_ads: false, meta_ads: false, social_media: false, seo_content: false, website_quality: "", other_channels: "" }
      ]
    }))
  }

  const removeCompetitorChannel = (idx: number) => {
    setDoc(prev => ({
      ...prev,
      competitor_channels: prev.competitor_channels?.filter((_, i) => i !== idx)
    }))
  }

  const addSocialPlatform = () => {
    setDoc(prev => ({
      ...prev,
      social_platforms: [
        ...(prev.social_platforms || []),
        { platform: "", followers: 0, activity_level: "", primary_goal: "" }
      ]
    }))
  }

  const removeSocialPlatform = (idx: number) => {
    setDoc(prev => ({
      ...prev,
      social_platforms: prev.social_platforms?.filter((_, i) => i !== idx)
    }))
  }

  const addStakeholder = () => {
    setDoc(prev => ({
      ...prev,
      other_stakeholders: [
        ...(prev.other_stakeholders || []),
        { name: "", title: "", role: "", email: "" }
      ]
    }))
  }

  const removeStakeholder = (idx: number) => {
    setDoc(prev => ({
      ...prev,
      other_stakeholders: prev.other_stakeholders?.filter((_, i) => i !== idx)
    }))
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          {isPublicMode ? "Edit Discovery Document" : `${client.name} - Discovery Document`}
        </h2>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Spinner className="mr-2" />}
          Save Document
        </Button>
      </div>

      {/* Domain & Actions Row */}
      {!isPublicMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Domain Input + Generate Initial Draft */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Globe className="h-4 w-4" />
                Client Domain
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input
                placeholder="e.g. acme.com"
                value={doc.domain || ""}
                onChange={(e) => setDoc({ ...doc, domain: e.target.value })}
              />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="w-full" disabled={generatingDraft}>
                    {generatingDraft && <Spinner className="mr-2" />}
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate Initial Draft
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Generate Initial Draft?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete and replace the current discovery document content. Any existing data will be lost. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleGenerateInitialDraft}>
                      Generate Draft
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* Shareable Edit Link */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-4 w-4" />
                Shareable Edit Link
              </CardTitle>
              <CardDescription className="text-sm">Share this link to allow external users to edit this document</CardDescription>
            </CardHeader>
            <CardContent>
              {doc.edit_token ? (
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/public/discovery-document/${doc.edit_token}`}
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyEditLink}>
                    {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              ) : (
                <Button onClick={handleGenerateEditToken} disabled={generatingToken}>
                  {generatingToken && <Spinner className="mr-2" />}
                  Generate Edit Link
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* All Sections in Accordions */}
      <Accordion type="multiple" defaultValue={["section-0"]} className="space-y-4">
        {/* SECTION 0: META / HEADER */}
        <AccordionItem value="section-0" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">Section 0: Meta / Header</AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Client Name</label>
                <Input value={doc.client_name || ""} onChange={(e) => setDoc({ ...doc, client_name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Discovery Date</label>
                <Input type="date" value={doc.discovery_date || ""} onChange={(e) => setDoc({ ...doc, discovery_date: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Contact Person - Name</label>
                <Input value={doc.contact_name || ""} onChange={(e) => setDoc({ ...doc, contact_name: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Contact Person - Title</label>
                <Input value={doc.contact_title || ""} onChange={(e) => setDoc({ ...doc, contact_title: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Contact Person - Email</label>
                <Input type="email" value={doc.contact_email || ""} onChange={(e) => setDoc({ ...doc, contact_email: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Contact Person - Phone</label>
                <Input type="tel" value={doc.contact_phone || ""} onChange={(e) => setDoc({ ...doc, contact_phone: e.target.value })} />
              </div>
              <div className="grid gap-2 md:col-span-2">
                <label className="text-sm font-medium">Industry</label>
                <Input value={doc.industry || ""} onChange={(e) => setDoc({ ...doc, industry: e.target.value })} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 1: COMPANY OVERVIEW & BUSINESS OBJECTIVES */}
        <AccordionItem value="section-1" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">Section 1: Company Overview & Business Objectives</AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4">
            {/* 1.1 Company Background */}
            <div>
              <h4 className="font-medium mb-3">1.1 Company Background</h4>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Company Primary Business / Service Offering</label>
                  <Textarea value={doc.primary_business || ""} onChange={(e) => setDoc({ ...doc, primary_business: e.target.value })} rows={3} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">How long has your company been in business?</label>
                    <Input value={doc.years_in_business || ""} onChange={(e) => setDoc({ ...doc, years_in_business: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Current Annual Revenue (or Revenue Range)</label>
                    <Input value={doc.annual_revenue || ""} onChange={(e) => setDoc({ ...doc, annual_revenue: e.target.value })} placeholder="e.g. $1–3M" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Number of Employees</label>
                    <Input type="number" value={doc.num_employees || ""} onChange={(e) => setDoc({ ...doc, num_employees: parseInt(e.target.value) || undefined })} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Geographic Service Area / Market</label>
                    <Input value={doc.geographic_market || ""} onChange={(e) => setDoc({ ...doc, geographic_market: e.target.value })} />
                  </div>
                </div>
              </div>
            </div>

            {/* 1.2 Lead Generation Goals */}
            <div>
              <h4 className="font-medium mb-3">1.2 Lead Generation Goals</h4>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Primary Goal for the Next 12 Months</label>
                  <Textarea value={doc.primary_goal_12_months || ""} onChange={(e) => setDoc({ ...doc, primary_goal_12_months: e.target.value })} rows={3} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Target Leads per Month</label>
                    <Input type="number" value={doc.target_leads_per_month || ""} onChange={(e) => setDoc({ ...doc, target_leads_per_month: parseInt(e.target.value) || undefined })} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Timeframe (By when?)</label>
                    <Input value={doc.target_leads_timeframe || ""} onChange={(e) => setDoc({ ...doc, target_leads_timeframe: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Target Cost Per Lead (CPL)</label>
                    <Input value={doc.target_cpl_amount || ""} onChange={(e) => setDoc({ ...doc, target_cpl_amount: e.target.value })} placeholder="$" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Customer Lifetime Value (LTV)</label>
                    <Input value={doc.customer_ltv || ""} onChange={(e) => setDoc({ ...doc, customer_ltv: e.target.value })} placeholder="$" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">How did you determine target CPL?</label>
                  <Textarea value={doc.target_cpl_reasoning || ""} onChange={(e) => setDoc({ ...doc, target_cpl_reasoning: e.target.value })} rows={2} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">What does a "qualified lead" look like for your business?</label>
                  <Textarea value={doc.qualified_lead_definition || ""} onChange={(e) => setDoc({ ...doc, qualified_lead_definition: e.target.value })} rows={3} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">How is LTV calculated?</label>
                  <Textarea value={doc.customer_ltv_calculation || ""} onChange={(e) => setDoc({ ...doc, customer_ltv_calculation: e.target.value })} rows={2} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Typical Sales Cycle Length</label>
                    <Input value={doc.sales_cycle_length || ""} onChange={(e) => setDoc({ ...doc, sales_cycle_length: e.target.value })} placeholder="e.g. 6–8 weeks" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Current Close Rate (%)</label>
                    <Input value={doc.close_rate_percent || ""} onChange={(e) => setDoc({ ...doc, close_rate_percent: e.target.value })} placeholder="%" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="close_rate_not_tracked" checked={doc.close_rate_not_tracked || false} onChange={(e) => setDoc({ ...doc, close_rate_not_tracked: e.target.checked })} className="h-4 w-4" />
                  <label htmlFor="close_rate_not_tracked" className="text-sm">We don't track close rate currently</label>
                </div>
              </div>
            </div>

            {/* 1.3 Current Marketing Performance */}
            <div>
              <h4 className="font-medium mb-3">1.3 Current Marketing Performance</h4>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Current Monthly Lead Volume</label>
                    <Input type="number" value={doc.current_monthly_leads || ""} onChange={(e) => setDoc({ ...doc, current_monthly_leads: parseInt(e.target.value) || undefined })} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">% that are Sales-Qualified</label>
                    <Input value={doc.current_sql_percent || ""} onChange={(e) => setDoc({ ...doc, current_sql_percent: e.target.value })} placeholder="%" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">How are leads currently generated?</label>
                  <Textarea value={doc.current_lead_generation_method || ""} onChange={(e) => setDoc({ ...doc, current_lead_generation_method: e.target.value })} rows={3} />
                </div>
                
                {/* Previous Marketing Efforts - Repeating Group */}
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Previous Marketing Efforts</label>
                    <Button variant="outline" size="sm" onClick={addMarketingEffort}><Plus className="h-4 w-4 mr-1" /> Add</Button>
                  </div>
                  {doc.previous_marketing_efforts?.map((effort, idx) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-3 relative group">
                      <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100" onClick={() => removeMarketingEffort(idx)}><Trash2 className="h-4 w-4" /></Button>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1">
                          <label className="text-sm font-medium">Channel / Tactic Name</label>
                          <Input placeholder="e.g., Google Ads, SEO" value={effort.channel_name || ""} onChange={(e) => { const arr = [...(doc.previous_marketing_efforts || [])]; arr[idx] = { ...arr[idx], channel_name: e.target.value }; setDoc({ ...doc, previous_marketing_efforts: arr }); }} />
                        </div>
                        <div className="grid gap-1">
                          <label className="text-sm font-medium">Timeframe</label>
                          <Input placeholder="e.g., Jan 2024 - Jun 2024" value={effort.timeframe || ""} onChange={(e) => { const arr = [...(doc.previous_marketing_efforts || [])]; arr[idx] = { ...arr[idx], timeframe: e.target.value }; setDoc({ ...doc, previous_marketing_efforts: arr }); }} />
                        </div>
                      </div>
                      <div className="grid gap-1">
                        <label className="text-sm font-medium">Result</label>
                        <Textarea placeholder="What were the outcomes?" value={effort.result || ""} onChange={(e) => { const arr = [...(doc.previous_marketing_efforts || [])]; arr[idx] = { ...arr[idx], result: e.target.value }; setDoc({ ...doc, previous_marketing_efforts: arr }); }} rows={2} />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-sm font-medium">Why it worked / didn&apos;t work</label>
                        <Textarea placeholder="Analysis of success or failure" value={effort.why_worked || ""} onChange={(e) => { const arr = [...(doc.previous_marketing_efforts || [])]; arr[idx] = { ...arr[idx], why_worked: e.target.value }; setDoc({ ...doc, previous_marketing_efforts: arr }); }} rows={2} />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="grid gap-2">
                  <label className="text-sm font-medium">What is currently working in your marketing?</label>
                  <Textarea value={doc.what_is_working || ""} onChange={(e) => setDoc({ ...doc, what_is_working: e.target.value })} rows={3} />
                </div>
              </div>
            </div>

            {/* 1.4 Budget */}
            <div>
              <h4 className="font-medium mb-3">1.4 Budget</h4>
              <div className="grid gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Total Marketing Budget - Monthly</label>
                    <Input value={doc.budget_monthly || ""} onChange={(e) => setDoc({ ...doc, budget_monthly: e.target.value })} placeholder="$" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Total Marketing Budget - Quarterly</label>
                    <Input value={doc.budget_quarterly || ""} onChange={(e) => setDoc({ ...doc, budget_quarterly: e.target.value })} placeholder="$" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Total Marketing Budget - Annual</label>
                    <Input value={doc.budget_annual || ""} onChange={(e) => setDoc({ ...doc, budget_annual: e.target.value })} placeholder="$" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Lead Gen Budget - Monthly</label>
                    <Input value={doc.leadgen_budget_monthly || ""} onChange={(e) => setDoc({ ...doc, leadgen_budget_monthly: e.target.value })} placeholder="$" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Lead Gen Budget - Quarterly</label>
                    <Input value={doc.leadgen_budget_quarterly || ""} onChange={(e) => setDoc({ ...doc, leadgen_budget_quarterly: e.target.value })} placeholder="$" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Lead Gen Budget - Annual</label>
                    <Input value={doc.leadgen_budget_annual || ""} onChange={(e) => setDoc({ ...doc, leadgen_budget_annual: e.target.value })} placeholder="$" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Seasonal Peak Months</label>
                    <Input value={doc.seasonal_peak_months || ""} onChange={(e) => setDoc({ ...doc, seasonal_peak_months: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Seasonal Slow Months</label>
                    <Input value={doc.seasonal_slow_months || ""} onChange={(e) => setDoc({ ...doc, seasonal_slow_months: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Seasonal Budget Details</label>
                  <Textarea value={doc.seasonal_details || ""} onChange={(e) => setDoc({ ...doc, seasonal_details: e.target.value })} rows={2} />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 2: TARGET AUDIENCE */}
        <AccordionItem value="section-2" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">Section 2: Target Audience</AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4">
            {/* 2.1 Primary Target Audience */}
            <div>
              <h4 className="font-medium mb-3">2.1 Primary Target Audience</h4>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Ideal Customer Description</label>
                  <Textarea value={doc.ideal_customer_description || ""} onChange={(e) => setDoc({ ...doc, ideal_customer_description: e.target.value })} rows={3} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Decision-Maker Job Titles</label>
                  <Textarea value={doc.decision_maker_titles || ""} onChange={(e) => setDoc({ ...doc, decision_maker_titles: e.target.value })} rows={2} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Decision Authority Level</label>
                  <div className="flex gap-4 flex-wrap">
                    {["C-Suite", "Director", "Manager", "Other"].map(opt => (
                      <label key={opt} className="flex items-center gap-2">
                        <input type="radio" name="decision_authority_level" checked={doc.decision_authority_level === opt} onChange={() => setDoc({ ...doc, decision_authority_level: opt })} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Target Company Size</label>
                    <Input value={doc.target_company_size || ""} onChange={(e) => setDoc({ ...doc, target_company_size: e.target.value })} placeholder="# employees or revenue range" />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Customer Age Range</label>
                    <Input value={doc.customer_age_range || ""} onChange={(e) => setDoc({ ...doc, customer_age_range: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Target Industries</label>
                  <Textarea value={doc.target_industries || ""} onChange={(e) => setDoc({ ...doc, target_industries: e.target.value })} rows={2} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Geographic Focus</label>
                  <Textarea value={doc.geographic_focus || ""} onChange={(e) => setDoc({ ...doc, geographic_focus: e.target.value })} rows={2} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Customer Gender</label>
                    <div className="flex gap-4">
                      {["All", "Specific"].map(opt => (
                        <label key={opt} className="flex items-center gap-2">
                          <input type="radio" name="customer_gender" checked={doc.customer_gender === opt} onChange={() => setDoc({ ...doc, customer_gender: opt })} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Education Level</label>
                    <div className="flex gap-4 flex-wrap">
                      {["High school", "Bachelor's", "Advanced", "Any"].map(opt => (
                        <label key={opt} className="flex items-center gap-2">
                          <input type="radio" name="customer_education" checked={doc.customer_education === opt} onChange={() => setDoc({ ...doc, customer_education: opt })} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Income / Budget Authority Range</label>
                  <Input value={doc.customer_income_range || ""} onChange={(e) => setDoc({ ...doc, customer_income_range: e.target.value })} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Main Pain Point 1</label>
                    <Input value={doc.pain_point_1 || ""} onChange={(e) => setDoc({ ...doc, pain_point_1: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Main Pain Point 2</label>
                    <Input value={doc.pain_point_2 || ""} onChange={(e) => setDoc({ ...doc, pain_point_2: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Main Pain Point 3</label>
                    <Input value={doc.pain_point_3 || ""} onChange={(e) => setDoc({ ...doc, pain_point_3: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Main Goal/Motivation 1</label>
                    <Input value={doc.goal_motivation_1 || ""} onChange={(e) => setDoc({ ...doc, goal_motivation_1: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Main Goal/Motivation 2</label>
                    <Input value={doc.goal_motivation_2 || ""} onChange={(e) => setDoc({ ...doc, goal_motivation_2: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Main Goal/Motivation 3</label>
                    <Input value={doc.goal_motivation_3 || ""} onChange={(e) => setDoc({ ...doc, goal_motivation_3: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Typical Buying Process</label>
                  <Textarea value={doc.buying_process || ""} onChange={(e) => setDoc({ ...doc, buying_process: e.target.value })} rows={3} />
                </div>
              </div>
            </div>

            {/* 2.2 Secondary Audiences */}
            <div>
              <h4 className="font-medium mb-3">2.2 Secondary Target Audiences</h4>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">Add secondary audience segments</span>
                <Button variant="outline" size="sm" onClick={addSecondaryAudience}><Plus className="h-4 w-4 mr-1" /> Add</Button>
              </div>
              {doc.secondary_audiences?.map((aud, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3 relative group mb-3">
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100" onClick={() => removeSecondaryAudience(idx)}><Trash2 className="h-4 w-4" /></Button>
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Audience Description</label>
                    <Textarea placeholder="Describe this secondary audience segment" value={aud.description || ""} onChange={(e) => { const arr = [...(doc.secondary_audiences || [])]; arr[idx] = { ...arr[idx], description: e.target.value }; setDoc({ ...doc, secondary_audiences: arr }); }} rows={2} />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Job Titles</label>
                    <Textarea placeholder="List relevant job titles" value={aud.job_titles || ""} onChange={(e) => { const arr = [...(doc.secondary_audiences || [])]; arr[idx] = { ...arr[idx], job_titles: e.target.value }; setDoc({ ...doc, secondary_audiences: arr }); }} rows={2} />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Why target them?</label>
                    <Textarea placeholder="Business rationale for targeting this segment" value={aud.why_target || ""} onChange={(e) => { const arr = [...(doc.secondary_audiences || [])]; arr[idx] = { ...arr[idx], why_target: e.target.value }; setDoc({ ...doc, secondary_audiences: arr }); }} rows={2} />
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Continue with remaining sections in next parts... */}
        {/* Sections 3-11 follow the same pattern */}
        
        {/* SECTION 3: VALUE PROPOSITION & MESSAGING */}
        <AccordionItem value="section-3" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">Section 3: Value Proposition & Messaging</AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4">
            <div>
              <h4 className="font-medium mb-3">3.1 Differentiation</h4>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">What makes your business different from competitors?</label>
                  <Textarea value={doc.differentiation || ""} onChange={(e) => setDoc({ ...doc, differentiation: e.target.value })} rows={3} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Top Value Proposition 1</label>
                    <Input value={doc.value_prop_1 || ""} onChange={(e) => setDoc({ ...doc, value_prop_1: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Top Value Proposition 2</label>
                    <Input value={doc.value_prop_2 || ""} onChange={(e) => setDoc({ ...doc, value_prop_2: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Top Value Proposition 3</label>
                    <Input value={doc.value_prop_3 || ""} onChange={(e) => setDoc({ ...doc, value_prop_3: e.target.value })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Why should prospects choose you over competitors?</label>
                  <Textarea value={doc.why_choose_us || ""} onChange={(e) => setDoc({ ...doc, why_choose_us: e.target.value })} rows={3} />
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">3.2 Brand Messaging</h4>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">How do you want to be perceived in the market?</label>
                  <Textarea value={doc.market_perception || ""} onChange={(e) => setDoc({ ...doc, market_perception: e.target.value })} rows={3} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Brand Voice / Tone</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {BRAND_VOICE_OPTIONS.map(opt => (
                      <label key={opt} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={(doc.brand_voice_tones || []).includes(opt)} onChange={() => toggleArrayValue("brand_voice_tones", opt)} className="h-4 w-4" />
                        {opt}
                      </label>
                    ))}
                  </div>
                  <Input placeholder="Other (describe)" value={doc.brand_voice_other || ""} onChange={(e) => setDoc({ ...doc, brand_voice_other: e.target.value })} className="mt-2" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Key Messaging Theme 1</label>
                    <Input value={doc.messaging_theme_1 || ""} onChange={(e) => setDoc({ ...doc, messaging_theme_1: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Key Messaging Theme 2</label>
                    <Input value={doc.messaging_theme_2 || ""} onChange={(e) => setDoc({ ...doc, messaging_theme_2: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Key Messaging Theme 3</label>
                    <Input value={doc.messaging_theme_3 || ""} onChange={(e) => setDoc({ ...doc, messaging_theme_3: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Testimonials/Case Studies Available?</label>
                    <div className="flex gap-4">
                      {["Yes", "Some", "No"].map(opt => (
                        <label key={opt} className="flex items-center gap-2">
                          <input type="radio" name="testimonials_available" checked={doc.testimonials_available === opt} onChange={() => setDoc({ ...doc, testimonials_available: opt })} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">How many available?</label>
                    <Input type="number" value={doc.testimonials_count || ""} onChange={(e) => setDoc({ ...doc, testimonials_count: parseInt(e.target.value) || undefined })} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Can you provide examples?</label>
                  <Textarea value={doc.testimonials_examples || ""} onChange={(e) => setDoc({ ...doc, testimonials_examples: e.target.value })} rows={2} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Most Compelling Proof Points - Customer Success Stories</label>
                  <Textarea value={doc.proof_customer_stories || ""} onChange={(e) => setDoc({ ...doc, proof_customer_stories: e.target.value })} rows={2} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Most Compelling Proof Points - Statistics / Metrics</label>
                  <Textarea value={doc.proof_statistics || ""} onChange={(e) => setDoc({ ...doc, proof_statistics: e.target.value })} rows={2} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Most Compelling Proof Points - Awards / Certifications</label>
                  <Textarea value={doc.proof_awards || ""} onChange={(e) => setDoc({ ...doc, proof_awards: e.target.value })} rows={2} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Most Compelling Proof Points - Notable Customers</label>
                  <Textarea value={doc.proof_notable_customers || ""} onChange={(e) => setDoc({ ...doc, proof_notable_customers: e.target.value })} rows={2} />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 4: COMPETITIVE LANDSCAPE */}
        <AccordionItem value="section-4" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">Section 4: Competitive Landscape</AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Main Competitor 1</label>
                <Input value={doc.competitor_1 || ""} onChange={(e) => setDoc({ ...doc, competitor_1: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Main Competitor 2</label>
                <Input value={doc.competitor_2 || ""} onChange={(e) => setDoc({ ...doc, competitor_2: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Main Competitor 3</label>
                <Input value={doc.competitor_3 || ""} onChange={(e) => setDoc({ ...doc, competitor_3: e.target.value })} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">Competitor Channels Table</label>
                <Button variant="outline" size="sm" onClick={addCompetitorChannel}><Plus className="h-4 w-4 mr-1" /> Add</Button>
              </div>
              {doc.competitor_channels?.map((comp, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3 relative group mb-3">
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100" onClick={() => removeCompetitorChannel(idx)}><Trash2 className="h-4 w-4" /></Button>
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Competitor Name</label>
                    <Input placeholder="e.g., Acme Corp" value={comp.name || ""} onChange={(e) => { const arr = [...(doc.competitor_channels || [])]; arr[idx] = { ...arr[idx], name: e.target.value }; setDoc({ ...doc, competitor_channels: arr }); }} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Marketing Channels Used</label>
                    <div className="flex flex-wrap gap-4 text-sm mt-2">
                      <label className="flex items-center gap-2"><input type="checkbox" checked={comp.google_ads || false} onChange={(e) => { const arr = [...(doc.competitor_channels || [])]; arr[idx] = { ...arr[idx], google_ads: e.target.checked }; setDoc({ ...doc, competitor_channels: arr }); }} /> Google Ads</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={comp.meta_ads || false} onChange={(e) => { const arr = [...(doc.competitor_channels || [])]; arr[idx] = { ...arr[idx], meta_ads: e.target.checked }; setDoc({ ...doc, competitor_channels: arr }); }} /> Meta Ads</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={comp.social_media || false} onChange={(e) => { const arr = [...(doc.competitor_channels || [])]; arr[idx] = { ...arr[idx], social_media: e.target.checked }; setDoc({ ...doc, competitor_channels: arr }); }} /> Social Media</label>
                      <label className="flex items-center gap-2"><input type="checkbox" checked={comp.seo_content || false} onChange={(e) => { const arr = [...(doc.competitor_channels || [])]; arr[idx] = { ...arr[idx], seo_content: e.target.checked }; setDoc({ ...doc, competitor_channels: arr }); }} /> SEO/Content</label>
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Website Quality</label>
                    <Input placeholder="e.g., Strong, Modern, Outdated" value={comp.website_quality || ""} onChange={(e) => { const arr = [...(doc.competitor_channels || [])]; arr[idx] = { ...arr[idx], website_quality: e.target.value }; setDoc({ ...doc, competitor_channels: arr }); }} />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Other Channels</label>
                    <Input placeholder="e.g., Podcasts, Influencers, Events" value={comp.other_channels || ""} onChange={(e) => { const arr = [...(doc.competitor_channels || [])]; arr[idx] = { ...arr[idx], other_channels: e.target.value }; setDoc({ ...doc, competitor_channels: arr }); }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">What are competitors doing well?</label>
              <Textarea value={doc.competitor_strengths || ""} onChange={(e) => setDoc({ ...doc, competitor_strengths: e.target.value })} rows={3} />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Where do you have competitive advantages?</label>
              <Textarea value={doc.competitive_advantages || ""} onChange={(e) => setDoc({ ...doc, competitive_advantages: e.target.value })} rows={3} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 5: SETSAIL SERVICES ASSESSMENT */}
        <AccordionItem value="section-5" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">Section 5: SetSail Services Assessment</AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Services of Interest</label>
                <div className="space-y-2">
                  {SERVICES_OPTIONS.map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={(doc.services_interested || []).includes(opt.value)} onChange={() => toggleArrayValue("services_interested", opt.value)} className="h-4 w-4" />
                      {opt.label}
                    </label>
                  ))}
                </div>
              </div>
              
              <h4 className="font-medium">Previous Use of Services</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Google Ads - Used before?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2"><input type="radio" checked={doc.google_ads_used === true} onChange={() => setDoc({ ...doc, google_ads_used: true })} /> Yes</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={doc.google_ads_used === false} onChange={() => setDoc({ ...doc, google_ads_used: false })} /> No</label>
                  </div>
                  <select className="border rounded px-3 py-2" value={doc.google_ads_experience || ""} onChange={(e) => setDoc({ ...doc, google_ads_experience: e.target.value })}>
                    <option value="">Experience Level</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Meta Ads - Used before?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2"><input type="radio" checked={doc.meta_ads_used === true} onChange={() => setDoc({ ...doc, meta_ads_used: true })} /> Yes</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={doc.meta_ads_used === false} onChange={() => setDoc({ ...doc, meta_ads_used: false })} /> No</label>
                  </div>
                  <select className="border rounded px-3 py-2" value={doc.meta_ads_experience || ""} onChange={(e) => setDoc({ ...doc, meta_ads_experience: e.target.value })}>
                    <option value="">Experience Level</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Social Media - Used before?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2"><input type="radio" checked={doc.social_media_used === true} onChange={() => setDoc({ ...doc, social_media_used: true })} /> Yes</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={doc.social_media_used === false} onChange={() => setDoc({ ...doc, social_media_used: false })} /> No</label>
                  </div>
                  <select className="border rounded px-3 py-2" value={doc.social_media_experience || ""} onChange={(e) => setDoc({ ...doc, social_media_experience: e.target.value })}>
                    <option value="">Experience Level</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">SEO - Used before?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2"><input type="radio" checked={doc.seo_used === true} onChange={() => setDoc({ ...doc, seo_used: true })} /> Yes</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={doc.seo_used === false} onChange={() => setDoc({ ...doc, seo_used: false })} /> No</label>
                  </div>
                  <select className="border rounded px-3 py-2" value={doc.seo_experience || ""} onChange={(e) => setDoc({ ...doc, seo_experience: e.target.value })}>
                    <option value="">Experience Level</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Website Development - Used before?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2"><input type="radio" checked={doc.website_dev_used === true} onChange={() => setDoc({ ...doc, website_dev_used: true })} /> Yes</label>
                    <label className="flex items-center gap-2"><input type="radio" checked={doc.website_dev_used === false} onChange={() => setDoc({ ...doc, website_dev_used: false })} /> No</label>
                  </div>
                  <select className="border rounded px-3 py-2" value={doc.website_dev_experience || ""} onChange={(e) => setDoc({ ...doc, website_dev_experience: e.target.value })}>
                    <option value="">Experience Level</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
              </div>
              
              <div className="grid gap-2">
                <label className="text-sm font-medium">Services you do NOT want to use?</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2"><input type="radio" checked={doc.services_not_wanted === false} onChange={() => setDoc({ ...doc, services_not_wanted: false })} /> No – open to all</label>
                  <label className="flex items-center gap-2"><input type="radio" checked={doc.services_not_wanted === true} onChange={() => setDoc({ ...doc, services_not_wanted: true })} /> Yes – specify</label>
                </div>
                {doc.services_not_wanted && (
                  <Textarea placeholder="Which services and why?" value={doc.services_not_wanted_details || ""} onChange={(e) => setDoc({ ...doc, services_not_wanted_details: e.target.value })} rows={2} />
                )}
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* SECTION 6-11 (Condensed) */}
        <AccordionItem value="section-6" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">Section 6: Current Digital Presence</AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Do you have a website?</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2"><input type="radio" checked={doc.has_website === true} onChange={() => setDoc({ ...doc, has_website: true })} /> Yes</label>
                  <label className="flex items-center gap-2"><input type="radio" checked={doc.has_website === false} onChange={() => setDoc({ ...doc, has_website: false })} /> No</label>
                </div>
              </div>
              {doc.has_website && (
                <>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Website URL</label>
                    <Input value={doc.website_url || ""} onChange={(e) => setDoc({ ...doc, website_url: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Website Status</label>
                    <div className="space-y-1">
                      {WEBSITE_STATUS_OPTIONS.map(opt => (
                        <label key={opt} className="flex items-center gap-2 text-sm">
                          <input type="checkbox" checked={(doc.website_status || []).includes(opt)} onChange={() => toggleArrayValue("website_status", opt)} className="h-4 w-4" />
                          {opt}
                        </label>
                      ))}
                    </div>
                    <Input placeholder="Other" value={doc.website_status_other || ""} onChange={(e) => setDoc({ ...doc, website_status_other: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Monthly Visitors</label>
                      <Input type="number" value={doc.website_monthly_visitors || ""} onChange={(e) => setDoc({ ...doc, website_monthly_visitors: parseInt(e.target.value) || undefined })} />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Conversion Rate</label>
                      <Input value={doc.website_conversion_rate || ""} onChange={(e) => setDoc({ ...doc, website_conversion_rate: e.target.value })} placeholder="%" />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Main Issues</label>
                    <Textarea value={doc.website_main_issues || ""} onChange={(e) => setDoc({ ...doc, website_main_issues: e.target.value })} rows={2} />
                  </div>
                </>
              )}
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Social Media Platforms</label>
                  <Button variant="outline" size="sm" onClick={addSocialPlatform}><Plus className="h-4 w-4 mr-1" /> Add</Button>
                </div>
                {doc.social_platforms?.map((plat, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-3 relative group mb-3">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100" onClick={() => removeSocialPlatform(idx)}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1">
                        <label className="text-sm font-medium">Platform</label>
                        <Input placeholder="e.g., LinkedIn, Instagram" value={plat.platform || ""} onChange={(e) => { const arr = [...(doc.social_platforms || [])]; arr[idx] = { ...arr[idx], platform: e.target.value }; setDoc({ ...doc, social_platforms: arr }); }} />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-sm font-medium">Followers</label>
                        <Input type="number" placeholder="0" value={plat.followers || ""} onChange={(e) => { const arr = [...(doc.social_platforms || [])]; arr[idx] = { ...arr[idx], followers: parseInt(e.target.value) || 0 }; setDoc({ ...doc, social_platforms: arr }); }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1">
                        <label className="text-sm font-medium">Activity Level</label>
                        <select className="border rounded px-3 py-2" value={plat.activity_level || ""} onChange={(e) => { const arr = [...(doc.social_platforms || [])]; arr[idx] = { ...arr[idx], activity_level: e.target.value }; setDoc({ ...doc, social_platforms: arr }); }}>
                          <option value="">Select...</option>
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>
                      <div className="grid gap-1">
                        <label className="text-sm font-medium">Primary Goal</label>
                        <select className="border rounded px-3 py-2" value={plat.primary_goal || ""} onChange={(e) => { const arr = [...(doc.social_platforms || [])]; arr[idx] = { ...arr[idx], primary_goal: e.target.value }; setDoc({ ...doc, social_platforms: arr }); }}>
                          <option value="">Select...</option>
                          <option value="Growth">Growth</option>
                          <option value="Engagement">Engagement</option>
                          <option value="Leads">Leads</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Current Social Media Strategy</label>
                <Textarea value={doc.social_strategy || ""} onChange={(e) => setDoc({ ...doc, social_strategy: e.target.value })} rows={3} />
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="section-7" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">Section 7: Analytics & Tracking</AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Analytics Tools in Use</label>
                <div className="space-y-1">
                  {ANALYTICS_TOOLS_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={(doc.analytics_tools || []).includes(opt)} onChange={() => toggleArrayValue("analytics_tools", opt)} className="h-4 w-4" />
                      {opt}
                    </label>
                  ))}
                </div>
                <Input placeholder="Other" value={doc.analytics_other || ""} onChange={(e) => setDoc({ ...doc, analytics_other: e.target.value })} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">CRM Name</label>
                  <Input value={doc.crm_name || ""} onChange={(e) => setDoc({ ...doc, crm_name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">CRM Features Used</label>
                  <Input value={doc.crm_features_used || ""} onChange={(e) => setDoc({ ...doc, crm_features_used: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Lead Data Tracked</label>
                <Textarea value={doc.lead_data_tracked || ""} onChange={(e) => setDoc({ ...doc, lead_data_tracked: e.target.value })} rows={2} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Conversion Tracking Status</label>
                <div className="flex gap-4 flex-wrap">
                  {["Yes – Fully set up", "Partially set up", "No – Needs to be set up"].map(opt => (
                    <label key={opt} className="flex items-center gap-2 text-sm">
                      <input type="radio" checked={doc.conversion_tracking_status === opt} onChange={() => setDoc({ ...doc, conversion_tracking_status: opt })} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
              {doc.conversion_tracking_status === "Partially set up" && (
                <Textarea placeholder="What works / what doesn't?" value={doc.conversion_tracking_details || ""} onChange={(e) => setDoc({ ...doc, conversion_tracking_details: e.target.value })} rows={2} />
              )}
              <div className="grid gap-2">
                <label className="text-sm font-medium">Can we integrate campaign tracking with your CRM?</label>
                <div className="flex gap-4 flex-wrap">
                  {["Yes – CRM supports integrations", "Unsure", "No – Manual lead entry only"].map(opt => (
                    <label key={opt} className="flex items-center gap-2 text-sm">
                      <input type="radio" checked={doc.crm_integration_possible === opt} onChange={() => setDoc({ ...doc, crm_integration_possible: opt })} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
              {doc.crm_integration_possible === "Unsure" && (
                <Textarea placeholder="Details" value={doc.crm_integration_details || ""} onChange={(e) => setDoc({ ...doc, crm_integration_details: e.target.value })} rows={2} />
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="section-8" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">Section 8: Current Tech Stack</AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Tools Currently Used</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {TECH_STACK_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={(doc.tools_used || []).includes(opt)} onChange={() => toggleArrayValue("tools_used", opt)} className="h-4 w-4" />
                    {opt}
                  </label>
                ))}
              </div>
              <Textarea placeholder="Other tools" value={doc.tools_other || ""} onChange={(e) => setDoc({ ...doc, tools_other: e.target.value })} rows={2} />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="section-9" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">Section 9: Team & Support</AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4">
            <div className="grid gap-4">
              <h4 className="font-medium">Primary Point of Contact</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input value={doc.poc_name || ""} onChange={(e) => setDoc({ ...doc, poc_name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input value={doc.poc_title || ""} onChange={(e) => setDoc({ ...doc, poc_title: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={doc.poc_email || ""} onChange={(e) => setDoc({ ...doc, poc_email: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Phone</label>
                  <Input type="tel" value={doc.poc_phone || ""} onChange={(e) => setDoc({ ...doc, poc_phone: e.target.value })} />
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <label className="text-sm font-medium">Availability</label>
                  <Input value={doc.poc_availability || ""} onChange={(e) => setDoc({ ...doc, poc_availability: e.target.value })} placeholder="Days / hours available" />
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium">Other Stakeholders</label>
                  <Button variant="outline" size="sm" onClick={addStakeholder}><Plus className="h-4 w-4 mr-1" /> Add</Button>
                </div>
                {doc.other_stakeholders?.map((sh, idx) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-3 relative group mb-3">
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100" onClick={() => removeStakeholder(idx)}><Trash2 className="h-4 w-4" /></Button>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1">
                        <label className="text-sm font-medium">Name</label>
                        <Input placeholder="Full name" value={sh.name || ""} onChange={(e) => { const arr = [...(doc.other_stakeholders || [])]; arr[idx] = { ...arr[idx], name: e.target.value }; setDoc({ ...doc, other_stakeholders: arr }); }} />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-sm font-medium">Title</label>
                        <Input placeholder="Job title" value={sh.title || ""} onChange={(e) => { const arr = [...(doc.other_stakeholders || [])]; arr[idx] = { ...arr[idx], title: e.target.value }; setDoc({ ...doc, other_stakeholders: arr }); }} />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-sm font-medium">Role</label>
                        <Input placeholder="Role in decision-making" value={sh.role || ""} onChange={(e) => { const arr = [...(doc.other_stakeholders || [])]; arr[idx] = { ...arr[idx], role: e.target.value }; setDoc({ ...doc, other_stakeholders: arr }); }} />
                      </div>
                      <div className="grid gap-1">
                        <label className="text-sm font-medium">Email</label>
                        <Input placeholder="email@example.com" value={sh.email || ""} onChange={(e) => { const arr = [...(doc.other_stakeholders || [])]; arr[idx] = { ...arr[idx], email: e.target.value }; setDoc({ ...doc, other_stakeholders: arr }); }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <h4 className="font-medium">Final Decision Authority</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Name</label>
                  <Input value={doc.final_decision_name || ""} onChange={(e) => setDoc({ ...doc, final_decision_name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input value={doc.final_decision_title || ""} onChange={(e) => setDoc({ ...doc, final_decision_title: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Decision Timeline</label>
                  <Input value={doc.decision_timeline || ""} onChange={(e) => setDoc({ ...doc, decision_timeline: e.target.value })} placeholder="Days / Weeks" />
                </div>
              </div>

              <h4 className="font-medium">Resources Available</h4>
              <div className="grid grid-cols-2 gap-2">
                {RESOURCES_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={(doc.resources_available || []).includes(opt)} onChange={() => toggleArrayValue("resources_available", opt)} className="h-4 w-4" />
                    {opt}
                  </label>
                ))}
              </div>
              <Textarea placeholder="Other resources" value={doc.resources_other || ""} onChange={(e) => setDoc({ ...doc, resources_other: e.target.value })} rows={2} />
              
              <h4 className="font-medium">Internal Resources</h4>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={doc.has_dev_support || false} onChange={(e) => setDoc({ ...doc, has_dev_support: e.target.checked })} className="h-4 w-4" /> Developer / IT Support</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={doc.has_marketing_support || false} onChange={(e) => setDoc({ ...doc, has_marketing_support: e.target.checked })} className="h-4 w-4" /> Marketing Support</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={doc.has_sales_support || false} onChange={(e) => setDoc({ ...doc, has_sales_support: e.target.checked })} className="h-4 w-4" /> Sales Support</label>
              </div>
              <Textarea placeholder="Other internal resources" value={doc.internal_resources_other || ""} onChange={(e) => setDoc({ ...doc, internal_resources_other: e.target.value })} rows={2} />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="section-10" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">Section 10: Timeline & Expectations</AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4">
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Target Strategy Launch Date</label>
                  <Input type="date" value={doc.target_launch_date || ""} onChange={(e) => setDoc({ ...doc, target_launch_date: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">How Urgent?</label>
                  <div className="flex gap-4 flex-wrap">
                    {["Very flexible", "Moderate", "Fast", "Urgent"].map(opt => (
                      <label key={opt} className="flex items-center gap-2 text-sm">
                        <input type="radio" checked={doc.urgency_level === opt} onChange={() => setDoc({ ...doc, urgency_level: opt })} />
                        {opt}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">First Leads Timeframe</label>
                  <Input value={doc.first_leads_timeframe || ""} onChange={(e) => setDoc({ ...doc, first_leads_timeframe: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Performance Ramp-Up Timeframe</label>
                  <Input value={doc.ramp_up_timeframe || ""} onChange={(e) => setDoc({ ...doc, ramp_up_timeframe: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Full Results Timeframe</label>
                  <Input value={doc.full_results_timeframe || ""} onChange={(e) => setDoc({ ...doc, full_results_timeframe: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">90-Day Success Indicator 1</label>
                  <Input value={doc.success_indicator_1 || ""} onChange={(e) => setDoc({ ...doc, success_indicator_1: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">90-Day Success Indicator 2</label>
                  <Input value={doc.success_indicator_2 || ""} onChange={(e) => setDoc({ ...doc, success_indicator_2: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">90-Day Success Indicator 3</label>
                  <Input value={doc.success_indicator_3 || ""} onChange={(e) => setDoc({ ...doc, success_indicator_3: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">What would exceed expectations?</label>
                <Textarea value={doc.exceed_expectations || ""} onChange={(e) => setDoc({ ...doc, exceed_expectations: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Concern 1</label>
                  <Input value={doc.concern_1 || ""} onChange={(e) => setDoc({ ...doc, concern_1: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Concern 2</label>
                  <Input value={doc.concern_2 || ""} onChange={(e) => setDoc({ ...doc, concern_2: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Concern 3</label>
                  <Input value={doc.concern_3 || ""} onChange={(e) => setDoc({ ...doc, concern_3: e.target.value })} />
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="section-11" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">Section 11: Additional Information</AccordionTrigger>
          <AccordionContent className="space-y-6 pt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium">Regulatory / Compliance Considerations</label>
                <div className="grid grid-cols-2 gap-2">
                  {REGULATORY_OPTIONS.map(opt => (
                    <label key={opt} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={(doc.regulatory_considerations || []).includes(opt)} onChange={() => toggleArrayValue("regulatory_considerations", opt)} className="h-4 w-4" />
                      {opt}
                    </label>
                  ))}
                </div>
                <Input placeholder="Other" value={doc.regulatory_other || ""} onChange={(e) => setDoc({ ...doc, regulatory_other: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Industry-specific Keywords / Terminology</label>
                <Textarea value={doc.industry_keywords || ""} onChange={(e) => setDoc({ ...doc, industry_keywords: e.target.value })} rows={3} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Is Your Business Seasonal?</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2"><input type="radio" checked={doc.is_seasonal === true} onChange={() => setDoc({ ...doc, is_seasonal: true })} /> Yes</label>
                  <label className="flex items-center gap-2"><input type="radio" checked={doc.is_seasonal === false} onChange={() => setDoc({ ...doc, is_seasonal: false })} /> No</label>
                </div>
              </div>
              {doc.is_seasonal && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Peak Months</label>
                    <Input value={doc.seasonality_peak || ""} onChange={(e) => setDoc({ ...doc, seasonality_peak: e.target.value })} />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-sm font-medium">Slow Months</label>
                    <Input value={doc.seasonality_slow || ""} onChange={(e) => setDoc({ ...doc, seasonality_slow: e.target.value })} />
                  </div>
                  <div className="grid gap-2 md:col-span-2">
                    <label className="text-sm font-medium">How should seasonality affect our strategy?</label>
                    <Textarea value={doc.seasonality_strategy || ""} onChange={(e) => setDoc({ ...doc, seasonality_strategy: e.target.value })} rows={2} />
                  </div>
                </div>
              )}
              <div className="grid gap-2">
                <label className="text-sm font-medium">Anything else we should know?</label>
                <Textarea value={doc.anything_else || ""} onChange={(e) => setDoc({ ...doc, anything_else: e.target.value })} rows={3} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">What would make this engagement successful for you?</label>
                <Textarea value={doc.success_definition || ""} onChange={(e) => setDoc({ ...doc, success_definition: e.target.value })} rows={3} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Can we use your results / success as a case study?</label>
                <div className="flex gap-4">
                  {["Yes", "Maybe – ask later", "No"].map(opt => (
                    <label key={opt} className="flex items-center gap-2 text-sm">
                      <input type="radio" checked={doc.case_study_consent === opt} onChange={() => setDoc({ ...doc, case_study_consent: opt })} />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Save button at bottom */}
      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving && <Spinner className="mr-2" />}
          Save Discovery Document
        </Button>
      </div>
    </div>
  )
}

