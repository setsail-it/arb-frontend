"use client"

import { useState, useEffect } from "react"
import type { Client } from "@/types"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Shield,
  CheckCircle2,
  Database,
  ArrowRight,
  AlertCircle,
} from "lucide-react"

interface Props {
  client: Client
  onNavigateTo?: (view: string) => void
}

interface GroundTruthSource {
  source: string | null
  answers_count: number
  available: boolean
}

export function GroundTruthView({ client, onNavigateTo }: Props) {
  const [sourceInfo, setSourceInfo] = useState<GroundTruthSource | null>(null)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>("idle")

  useEffect(() => {
    const loadData = async () => {
      try {
        const source = await api.getGroundTruthSource(String(client.id))
        setSourceInfo(source)
        
        const jobStatus = await api.getGroundTruthStatus(String(client.id))
        if (jobStatus.status === "complete") {
          setStatus("complete")
        } else if (jobStatus.status === "running" || jobStatus.status === "pending") {
          setStatus("processing")
        } else if (jobStatus.status === "error") {
          setStatus("error")
        }
      } catch (e) {
        console.error("Error loading ground truth data:", e)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [client.id])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8 text-emerald-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Ground Truth Enhancement</h1>
        <p className="text-slate-400 mt-1">
          Updates Discovery Document and General Context with verified client information
        </p>
      </div>

      {/* Status Card */}
      <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-lg ${status === "complete" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"}`}>
            {status === "complete" ? <CheckCircle2 className="h-6 w-6" /> : <Shield className="h-6 w-6" />}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-white">
              {status === "complete" ? "Enhancement Complete" : "Ground Truth Status"}
            </h2>
            
            {sourceInfo?.available ? (
              <div className="mt-2 space-y-2">
                <p className="text-slate-300">
                  Source: <span className="font-semibold text-emerald-400">{sourceInfo.source}</span>
                  {" "}({sourceInfo.answers_count} verified answers)
                </p>
                
                {status === "complete" && (
                  <p className="text-slate-400 text-sm">
                    The Discovery Document and General Context have been updated with client-verified information.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-slate-400 mt-2">
                No ground truth available. Complete a Discovery Call or Deep Dive first.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* What was updated */}
      {status === "complete" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Updated Documents</h3>
          
          {/* General Context Card - only GC is enhanced now */}
          <div 
            onClick={() => onNavigateTo?.("general")}
            className="rounded-lg border border-slate-700 bg-slate-800 p-5 cursor-pointer hover:border-emerald-500 hover:bg-slate-700 transition-all max-w-md"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                <Database className="h-5 w-5" />
              </div>
              <h4 className="font-semibold text-white">General Context</h4>
            </div>
            <p className="text-sm text-slate-400 mb-3">
              Fields updated with verified client information (about, target market, CTA, competitors, etc.)
            </p>
            <div className="flex items-center text-sm text-emerald-400">
              View context <ArrowRight className="h-4 w-4 ml-1" />
            </div>
          </div>
        </div>
      )}

      {/* Info about the process */}
      <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-5">
        <h3 className="font-semibold text-white mb-3">How Ground Truth Works</h3>
        <ul className="space-y-2 text-sm text-slate-400">
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold">1.</span>
            <span>Takes verified answers from Discovery Call or Deep Dive (prioritizes Deep Dive if available)</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold">2.</span>
            <span>Updates General Context fields where client has provided verified information</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold">3.</span>
            <span>Prioritizes client-stated facts over AI-inferred or web-scraped data</span>
          </li>
        </ul>
      </div>

      {/* Note about Scout-2 */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-950/30 border border-amber-500/30">
        <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="text-amber-300 font-medium">Why is this fast?</p>
          <p className="text-amber-200/70 mt-1">
            Ground Truth Enhancement doesn't re-scrape websites (Scout-2). It uses the existing 
            Discovery Document and General Context, updating them with verified client answers. 
            This typically takes 5-20 seconds.
          </p>
        </div>
      </div>
    </div>
  )
}

