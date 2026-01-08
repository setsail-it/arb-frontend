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
  "1": { 
    label: "Verified", 
    color: "bg-emerald-500 text-white border-emerald-400", 
    cardBg: "bg-emerald-950/50 border-emerald-700/50",
    icon: CheckCircle,
    iconColor: "text-emerald-400"
  },
  "2": { 
    label: "Likely", 
    color: "bg-amber-500 text-white border-amber-400", 
    cardBg: "bg-amber-950/30 border-amber-700/40",
    icon: AlertCircle,
    iconColor: "text-amber-400"
  },
  "3": { 
    label: "Unknown", 
    color: "bg-slate-600 text-white border-slate-500", 
    cardBg: "bg-slate-800/50 border-slate-600/50",
    icon: HelpCircle,
    iconColor: "text-slate-400"
  },
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
        // 404 means no results yet - not an error
        // 500 or other errors should show a message
        if (e.status && e.status !== 404) {
          setError(e.message || "Failed to fetch results")
        } else if (!e.status) {
          // Network error or parsing error - show generic message
          console.error("Error fetching discovery call results:", e)
          setError("Unable to load results. Please try again.")
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
    <div className="space-y-8 p-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">
            {isDeepDive ? "Deep Dive Results" : "Discovery Call"}
          </h2>
          <p className="text-slate-300 mt-2 text-lg">
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            View in Fathom
          </a>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        {["1", "2", "3"].map((certainty) => {
          const config = CERTAINTY_CONFIG[certainty as keyof typeof CERTAINTY_CONFIG]
          const count = result.answers_data?.filter(a => String(a.certainty) === certainty).length || 0
          const Icon = config.icon
          return (
            <div 
              key={certainty} 
              className={`rounded-xl border-2 p-6 ${config.cardBg}`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-slate-900/50`}>
                  <Icon className={`h-6 w-6 ${config.iconColor}`} />
                </div>
                <div>
                  <p className="text-4xl font-bold text-white">{count}</p>
                  <p className="text-base font-medium text-slate-200">{config.label}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Answers List */}
      <div className="rounded-xl border-2 border-slate-700 bg-slate-900/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700 bg-slate-800/50">
          <h3 className="text-xl font-semibold text-white">Questions & Answers</h3>
        </div>
        <div className="divide-y divide-slate-700/50 max-h-[700px] overflow-y-auto">
          {result.answers_data?.map((answer, idx) => {
            const certaintyKey = String(answer.certainty) as keyof typeof CERTAINTY_CONFIG
            const config = CERTAINTY_CONFIG[certaintyKey] || CERTAINTY_CONFIG["3"]
            return (
              <div
                key={idx}
                className="p-6 hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-violet-600/20 flex items-center justify-center">
                    <span className="text-violet-400 font-bold text-lg">
                      {answer.question_number}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <h4 className="text-lg font-semibold text-white">
                        {answer.question}
                      </h4>
                      <Badge className={`${config.color} px-3 py-1 text-xs font-bold`}>
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-slate-100 leading-relaxed text-base">
                      {answer.answer || <span className="text-slate-500 italic">No answer provided</span>}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

