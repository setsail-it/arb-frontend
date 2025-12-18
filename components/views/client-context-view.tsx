"use client"

import { useState, useEffect } from "react"
import type { Client } from "@/types"
import { api } from "@/lib/api"
import { DiscoveryDocumentForm } from "@/components/views/discovery-document-form"
import { GeneralContextForm } from "@/components/views/general-context-form"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { 
  ArrowRight, 
  ArrowLeft,
  FileText, 
  Database, 
  Shield,
  Presentation,
  FileStack,
  Lightbulb,
  Play
} from "lucide-react"

interface Props {
  client: Client
}

type ComponentStatus = "idle" | "processing" | "complete"
type ActiveView = "admin" | "discovery" | "general" | "ground-truth" | "strategy" | "gamma" | "service-docs"

interface FlowState {
  domain: ComponentStatus
  discoveryDoc: ComponentStatus
  generalContext: ComponentStatus
  strategyDoc: ComponentStatus
  gamma: ComponentStatus
  serviceDocs: ComponentStatus
}

export function ClientContextView({ client }: Props) {
  const [activeView, setActiveView] = useState<ActiveView>("admin")
  const [domainInput, setDomainInput] = useState("")
  const [isActivating, setIsActivating] = useState(false)
  const [flowState, setFlowState] = useState<FlowState>({
    domain: "idle",
    discoveryDoc: "idle",
    generalContext: "idle",
    strategyDoc: "idle",
    gamma: "idle",
    serviceDocs: "idle",
  })

  // Load existing discovery doc to check if domain exists
  useEffect(() => {
    const loadExistingData = async () => {
      try {
        const doc = await api.getDiscoveryDocument(client.id)
        if (doc && doc.domain) {
          setDomainInput(doc.domain)
          setFlowState(prev => ({
            ...prev,
            domain: "complete",
            discoveryDoc: doc.client_name ? "complete" : "idle",
          }))
        }
        const context = await api.getContext(client.id)
        if (context && (context.overview || context.writing_rules)) {
          setFlowState(prev => ({
            ...prev,
            generalContext: "complete",
          }))
        }
      } catch (e) {
        // No existing data
      }
    }
    loadExistingData()
  }, [client.id])

  const handleActivate = async () => {
    if (!domainInput.trim()) return
    
    setIsActivating(true)
    setFlowState(prev => ({
      ...prev,
      domain: "complete",
      discoveryDoc: "processing",
      generalContext: "processing",
    }))

    try {
      // Trigger Discovery Doc generation
      await api.generateInitialDraft(client.id, domainInput.trim())
      setFlowState(prev => ({ ...prev, discoveryDoc: "complete" }))
    } catch (e) {
      console.error("Discovery doc generation failed:", e)
      setFlowState(prev => ({ ...prev, discoveryDoc: "idle" }))
    }

    try {
      // Trigger General Context fetch
      await api.fetchContextFromSite(client.id, domainInput.trim())
      setFlowState(prev => ({ ...prev, generalContext: "complete" }))
    } catch (e) {
      console.error("General context fetch failed:", e)
      setFlowState(prev => ({ ...prev, generalContext: "idle" }))
    }

    setIsActivating(false)
  }

  const handleStrategyGenerate = async () => {
    setFlowState(prev => ({ ...prev, strategyDoc: "processing" }))
    // Stub: Would call Perplexity API
    await new Promise(resolve => setTimeout(resolve, 2000))
    setFlowState(prev => ({ ...prev, strategyDoc: "complete" }))
  }

  const handleGammaGenerate = async () => {
    setFlowState(prev => ({ ...prev, gamma: "processing" }))
    // Stub: Would generate Gamma presentation
    await new Promise(resolve => setTimeout(resolve, 2000))
    setFlowState(prev => ({ ...prev, gamma: "complete" }))
  }

  const handleServiceDocsGenerate = async () => {
    setFlowState(prev => ({ ...prev, serviceDocs: "processing" }))
    // Stub: Would generate service documents
    await new Promise(resolve => setTimeout(resolve, 2000))
    setFlowState(prev => ({ ...prev, serviceDocs: "complete" }))
  }

  // Render detail views with back button
  if (activeView !== "admin") {
    return (
      <div className="h-full overflow-auto">
        <div className="mb-4">
          <Button 
            variant="ghost" 
            onClick={() => setActiveView("admin")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin View
          </Button>
        </div>
        
        {activeView === "discovery" && (
          <DiscoveryDocumentForm client={client} initialDomain={domainInput} />
        )}
        
        {activeView === "general" && (
          <GeneralContextForm client={client} />
        )}
        
        {activeView === "ground-truth" && (
          <GroundTruthView />
        )}
        
        {activeView === "strategy" && (
          <StrategyDocView onGenerate={handleStrategyGenerate} status={flowState.strategyDoc} />
        )}
        
        {activeView === "gamma" && (
          <GammaPresentationView onGenerate={handleGammaGenerate} status={flowState.gamma} />
        )}
        
        {activeView === "service-docs" && (
          <ServiceDocsView onGenerate={handleServiceDocsGenerate} status={flowState.serviceDocs} />
        )}
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Client Data Pipeline</h2>
      
      {/* Flow Diagram */}
      <div className="relative min-h-[500px]">
        {/* Row 1: Domain Input */}
        <div className="flex items-start gap-4 mb-8">
          {/* Domain Input Node */}
          <FlowNode
            title="Domain / About Company"
            icon={<Lightbulb className="h-5 w-5" />}
            status={flowState.domain}
            className="w-72"
          >
            <Textarea
              placeholder="Enter domain name (e.g., acme.com) or brief company description..."
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              className="min-h-[80px] text-sm"
            />
          </FlowNode>

          {/* Activate Arrow */}
          <div className="flex items-center self-center mt-8">
            <Button
              onClick={handleActivate}
              disabled={!domainInput.trim() || isActivating}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isActivating ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Activate
            </Button>
            <ArrowRight className="h-6 w-6 text-slate-500 ml-2" />
          </div>

          {/* Discovery Doc & General Context Column */}
          <div className="flex flex-col gap-4">
            <FlowNode
              title="Discovery Doc"
              icon={<FileText className="h-5 w-5" />}
              status={flowState.discoveryDoc}
              onClick={() => setActiveView("discovery")}
              clickable
            />
            <FlowNode
              title="General Context"
              icon={<Database className="h-5 w-5" />}
              status={flowState.generalContext}
              onClick={() => setActiveView("general")}
              clickable
            />
          </div>

          {/* Arrow from Discovery Doc */}
          <div className="flex items-start pt-6">
            <ArrowRight className="h-6 w-6 text-slate-500" />
          </div>

          {/* Strategy Doc */}
          <div className="pt-0">
            <FlowNode
              title="Strategy Doc"
              icon={<FileStack className="h-5 w-5" />}
              status={flowState.strategyDoc}
              onClick={() => setActiveView("strategy")}
              clickable
              subtitle="Perplexity Analysis"
            />
          </div>

          {/* Arrow */}
          <div className="flex items-start pt-6">
            <ArrowRight className="h-6 w-6 text-slate-500" />
          </div>

          {/* Gamma Presentation */}
          <div className="pt-0">
            <FlowNode
              title="Gamma Presentation"
              icon={<Presentation className="h-5 w-5" />}
              status={flowState.gamma}
              onClick={() => setActiveView("gamma")}
              clickable
              subtitle="Slide Deck"
            />
          </div>

          {/* Arrow */}
          <div className="flex items-start pt-6">
            <ArrowRight className="h-6 w-6 text-slate-500" />
          </div>

          {/* Service Docs */}
          <div className="pt-0">
            <FlowNode
              title="Service Docs"
              icon={<FileStack className="h-5 w-5" />}
              status={flowState.serviceDocs}
              onClick={() => setActiveView("service-docs")}
              clickable
              subtitle="Deliverables"
            />
          </div>
        </div>

        {/* Ground Truth - Island */}
        <div className="absolute bottom-4 right-4">
          <FlowNode
            title="Ground Truth"
            icon={<Shield className="h-5 w-5" />}
            status="idle"
            onClick={() => setActiveView("ground-truth")}
            clickable
            subtitle="Manual Override"
            isIsland
          />
        </div>
      </div>

      {/* Legend */}
      <div className="mt-8 flex gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-slate-500" />
          <span>Not Started</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
          <span>Processing</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Complete</span>
        </div>
      </div>
    </div>
  )
}

// Flow Node Component
interface FlowNodeProps {
  title: string
  icon: React.ReactNode
  status: ComponentStatus
  onClick?: () => void
  clickable?: boolean
  children?: React.ReactNode
  className?: string
  subtitle?: string
  isIsland?: boolean
}

function FlowNode({ 
  title, 
  icon, 
  status, 
  onClick, 
  clickable, 
  children, 
  className = "",
  subtitle,
  isIsland
}: FlowNodeProps) {
  const statusStyles = {
    idle: "border-slate-600 bg-slate-800/50",
    processing: "border-blue-500 bg-blue-950/30 animate-pulse",
    complete: "border-emerald-500 bg-emerald-950/30",
  }

  const iconColors = {
    idle: "text-slate-400",
    processing: "text-blue-400",
    complete: "text-emerald-400",
  }

  return (
    <Card 
      className={`
        ${statusStyles[status]} 
        ${clickable ? "cursor-pointer hover:border-opacity-100 transition-all hover:scale-105" : ""}
        ${isIsland ? "border-dashed" : ""}
        border-2 ${className}
      `}
      onClick={clickable ? onClick : undefined}
    >
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span className={iconColors[status]}>{icon}</span>
          {title}
        </CardTitle>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardHeader>
      {children && (
        <CardContent className="pt-0 px-4 pb-4">
          {children}
        </CardContent>
      )}
    </Card>
  )
}

// Stub Views
function GroundTruthView() {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Ground Truth</h2>
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">
            Ground Truth allows manual override of AI-generated content.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Coming soon...
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function StrategyDocView({ onGenerate, status }: { onGenerate: () => void; status: ComponentStatus }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Strategy Document</h2>
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <FileStack className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              Strategy Document generation using Perplexity AI analysis.
            </p>
            <Button 
              onClick={onGenerate} 
              disabled={status === "processing"}
              className="gap-2"
            >
              {status === "processing" ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Generating...
                </>
              ) : status === "complete" ? (
                "Regenerate Strategy Doc"
              ) : (
                "Generate Strategy Doc"
              )}
            </Button>
            {status === "complete" && (
              <p className="text-sm text-emerald-500">✓ Strategy document generated (stub)</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function GammaPresentationView({ onGenerate, status }: { onGenerate: () => void; status: ComponentStatus }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Gamma Presentation</h2>
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <Presentation className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              Generate a professional slide deck presentation.
            </p>
            <Button 
              onClick={onGenerate} 
              disabled={status === "processing"}
              className="gap-2"
            >
              {status === "processing" ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Generating...
                </>
              ) : status === "complete" ? (
                "Regenerate Presentation"
              ) : (
                "Generate Presentation"
              )}
            </Button>
            {status === "complete" && (
              <p className="text-sm text-emerald-500">✓ Presentation generated (stub)</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ServiceDocsView({ onGenerate, status }: { onGenerate: () => void; status: ComponentStatus }) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Service Documents</h2>
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <FileStack className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              Generate service-specific deliverable documents.
            </p>
            <Button 
              onClick={onGenerate} 
              disabled={status === "processing"}
              className="gap-2"
            >
              {status === "processing" ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Generating...
                </>
              ) : status === "complete" ? (
                "Regenerate Service Docs"
              ) : (
                "Generate Service Docs"
              )}
            </Button>
            {status === "complete" && (
              <p className="text-sm text-emerald-500">✓ Service documents generated (stub)</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
