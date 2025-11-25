"use client"

import { useState, useEffect } from "react"
import type { Client, KeywordIdea, KeywordCluster, KeywordSet } from "@/types"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { ChevronRight, ChevronDown } from "lucide-react"
import { KeywordGenerationProgress } from "@/components/keyword-generation-progress"

interface Props {
  client: Client
}

export function KeywordExplorerView({ client }: Props) {
  const [config, setConfig] = useState({
    max_num_kws_per_seed: 600,
    sv_min: 200,
    kd_max: 20,
    sim_threshold: 0.7,
    intent_min: 1,
    intent_max: 2,
  })

  // Data state
  const [ideas, setIdeas] = useState<KeywordIdea[]>([])
  const [clusters, setClusters] = useState<KeywordCluster[]>([])
  const [sets, setSets] = useState<KeywordSet[]>([])

  // Loading state
  const [loadingIdeas, setLoadingIdeas] = useState(false)
  const [loadingClusters, setLoadingClusters] = useState(false)
  const [loadingSets, setLoadingSets] = useState(false)

  // Streaming progress state
  const [generatingIdeas, setGeneratingIdeas] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({ message: "", step: 0 })

  const refreshIdeas = async () => {
    const data = await api.getKeywordIdeas(client.id)
    setIdeas(data || [])
  }

  const refreshClusters = async () => {
    const data = await api.getClusters(client.id)
    setClusters(data || [])
  }

  const refreshSets = async () => {
    const data = await api.getSets(client.id)
    setSets(data || [])
  }

  // Initial load
  useEffect(() => {
    refreshIdeas()
    refreshClusters()
    refreshSets()
  }, [client.id])

  const handleGenerateIdeas = async () => {
    setGeneratingIdeas(true)
    setGenerationProgress({ message: "Starting keyword generation...", step: 0 })

    await api.generateKeywordIdeasStream(
      client.id,
      { min_sv: config.sv_min, max_kd: config.kd_max },
      (message, step) => {
        setGenerationProgress({ message, step })
      },
      async (data) => {
        // Complete - refresh data and close progress
        await refreshIdeas()
        setGeneratingIdeas(false)
        setGenerationProgress({ message: "", step: 0 })
      },
      (error) => {
        console.error("Keyword generation error:", error)
        setGeneratingIdeas(false)
        setGenerationProgress({ message: "", step: 0 })
      },
    )
  }

  const handleDevelopClusters = async () => {
    setLoadingClusters(true)
    try {
      await api.developClusters(client.id, config)
      await refreshClusters()
    } finally {
      setLoadingClusters(false)
    }
  }

  const handleDevelopSets = async () => {
    setLoadingSets(true)
    try {
      await api.developSets(client.id)
      await refreshSets()
    } finally {
      setLoadingSets(false)
    }
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {generatingIdeas && (
        <div className="mb-2">
          <KeywordGenerationProgress message={generationProgress.message} step={generationProgress.step} />
        </div>
      )}

      <div className="bg-background border rounded-lg p-4 shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="grid grid-cols-6 gap-2 flex-1">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Max KWs/Seed</label>
              <Input
                type="number"
                value={config.max_num_kws_per_seed}
                onChange={(e) => setConfig({ ...config, max_num_kws_per_seed: +e.target.value })}
                className="h-8"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Min Volume</label>
              <Input
                type="number"
                value={config.sv_min}
                onChange={(e) => setConfig({ ...config, sv_min: +e.target.value })}
                className="h-8"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Max KD</label>
              <Input
                type="number"
                value={config.kd_max}
                onChange={(e) => setConfig({ ...config, kd_max: +e.target.value })}
                className="h-8"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Similarity</label>
              <Input
                type="number"
                step="0.01"
                value={config.sim_threshold}
                onChange={(e) => setConfig({ ...config, sim_threshold: +e.target.value })}
                className="h-8"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Min Intent</label>
              <Input
                type="number"
                value={config.intent_min}
                onChange={(e) => setConfig({ ...config, intent_min: +e.target.value })}
                className="h-8"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-foreground">Max Intent</label>
              <Input
                type="number"
                value={config.intent_max}
                onChange={(e) => setConfig({ ...config, intent_max: +e.target.value })}
                className="h-8"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
        {/* Column 1: Ideas */}
        <Card className="flex flex-col h-full">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Ideas ({ideas.length})</CardTitle>
            <Button size="sm" onClick={handleGenerateIdeas} disabled={generatingIdeas || loadingIdeas}>
              {(generatingIdeas || loadingIdeas) && <Spinner className="mr-2" />}
              {generatingIdeas ? "Generating..." : "Generate"}
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            <div className="border-t">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-muted-foreground bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2">Keyword</th>
                    <th className="px-4 py-2">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {ideas.map((idea) => (
                    <tr key={idea.id}>
                      <td className="px-4 py-2">{idea.keyword}</td>
                      <td className="px-4 py-2 text-muted-foreground text-xs">{idea.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Clusters */}
        <Card className="flex flex-col h-full">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Clusters ({clusters.length})</CardTitle>
            <Button size="sm" onClick={handleDevelopClusters} disabled={loadingClusters}>
              {loadingClusters && <Spinner className="mr-2" />}
              Develop
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-4 space-y-2">
            {clusters.map((cluster, i) => (
              <ClusterItem key={i} cluster={cluster} />
            ))}
          </CardContent>
        </Card>

        {/* Column 3: Sets */}
        <Card className="flex flex-col h-full">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Sets ({sets.length})</CardTitle>
            <Button size="sm" onClick={handleDevelopSets} disabled={loadingSets}>
              {loadingSets && <Spinner className="mr-2" />}
              Develop
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-4 space-y-4">
            {sets.map((set, i) => (
              <div key={i} className="border rounded-md p-3 space-y-2">
                <div className="font-medium text-sm flex justify-between">
                  <span>{set.primary_keyword}</span>
                  <span className="text-xs text-muted-foreground">
                    Vol: {set.primary_search_volume} KD: {set.primary_keyword_difficulty}
                  </span>
                </div>
                <div className="pl-2 border-l-2 border-muted">
                  {set.secondaries.map((sec, j) => (
                    <div key={j} className="text-xs text-muted-foreground py-0.5 flex justify-between">
                      <span>{sec.keyword}</span>
                      <span>{sec.search_volume}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ClusterItem({ cluster }: { cluster: KeywordCluster }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <div className="border rounded-md overflow-hidden">
      <div
        className="bg-muted/30 p-2 flex items-center justify-between cursor-pointer hover:bg-muted/50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium text-sm">{cluster.label}</span>
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </div>
      {isOpen && (
        <div className="p-2 bg-background text-xs border-t">
          <table className="w-full">
            <thead>
              <tr className="text-muted-foreground text-left">
                <th className="pb-1 font-normal">Kw</th>
                <th className="pb-1 font-normal">Vol</th>
                <th className="pb-1 font-normal">KD</th>
              </tr>
            </thead>
            <tbody>
              {cluster.keywords.map((kw, k) => (
                <tr key={k}>
                  <td className="py-0.5">{kw.keyword}</td>
                  <td className="py-0.5">{kw.search_volume}</td>
                  <td className="py-0.5">{kw.keyword_difficulty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
