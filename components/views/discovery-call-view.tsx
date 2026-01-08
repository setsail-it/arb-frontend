"use client"

import { useState, useEffect } from "react"
import type { Client, DiscoveryCallResult } from "@/types"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Phone, ExternalLink, CheckCircle, AlertCircle, HelpCircle, Search } from "lucide-react"

interface Props {
  client: Client
  isDeepDive?: boolean
}

const CERTAINTY_CONFIG = {
  "1": { label: "Verified", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
  "2": { label: "Likely", color: "bg-amber-500/20 text-amber-400 border-amber-500/30", icon: AlertCircle },
  "3": { label: "Unknown", color: "bg-slate-500/20 text-slate-400 border-slate-500/30", icon: HelpCircle },
}

export function DiscoveryCallView({ client, isDeepDive = false }: Props) {
  const [result, setResult] = useState<DiscoveryCallResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchResult = async () => {
      try {
        const data = isDeepDive 
          ? await api.getDeepDiveResult(client.id)
          : await api.getDiscoveryCallResult(client.id)
        if (data && data.id) {
          setResult(data)
        }
      } catch (e: any) {
        if (e.status !== 404) {
          setError(e.message || "Failed to fetch results")
        }
      } finally {
        setLoading(false)
      }
    }
    fetchResult()
  }, [client.id, isDeepDive])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  if (!result || !result.answers_data || result.answers_data.length === 0) {
    const Icon = isDeepDive ? Search : Phone
    return (
      <div className="text-center py-12">
        <Icon className="h-12 w-12 mx-auto text-slate-500 mb-4" />
        <p className="text-slate-400">
          {isDeepDive ? "No deep dive results available." : "No discovery call results available."}
        </p>
        <p className="text-slate-500 text-sm mt-2">
          {isDeepDive 
            ? "Run a deep dive from the pipeline to see updated results here."
            : "Process a Fathom call from the pipeline to see results here."}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {isDeepDive ? "Deep Dive Results" : "Discovery Call Results"}
          </h2>
          <p className="text-slate-400 mt-1">
            {isDeepDive 
              ? "Updated Q&A from deep dive call analysis"
              : "Analyzed transcript from your discovery call"}
          </p>
        </div>
        {result.fathom_url && (
          <a
            href={result.fathom_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-violet-400 hover:text-violet-300"
          >
            <ExternalLink className="h-4 w-4" />
            View in Fathom
          </a>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {["1", "2", "3"].map((certainty) => {
          const config = CERTAINTY_CONFIG[certainty as keyof typeof CERTAINTY_CONFIG]
          const count = result.answers_data?.filter(a => String(a.certainty) === certainty).length || 0
          const Icon = config.icon
          return (
            <Card key={certainty} className="border-slate-700 bg-slate-800/40">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">{count}</p>
                    <p className="text-sm text-slate-400">{config.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Answers Table */}
      <Card className="border-slate-700 bg-slate-800/40">
        <CardHeader>
          <CardTitle className="text-white">Questions & Answers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {result.answers_data?.map((answer, idx) => {
              const certaintyKey = String(answer.certainty) as keyof typeof CERTAINTY_CONFIG
              const config = CERTAINTY_CONFIG[certaintyKey] || CERTAINTY_CONFIG["3"]
              return (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-slate-900/50 border border-slate-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-violet-400 font-mono text-sm">
                          Q{answer.question_number}
                        </span>
                        <Badge variant="outline" className={config.color}>
                          {config.label}
                        </Badge>
                      </div>
                      <p className="text-white font-medium mb-2">
                        {answer.question}
                      </p>
                      <p className="text-slate-300 text-sm whitespace-pre-wrap">
                        {answer.answer || "No answer provided"}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

