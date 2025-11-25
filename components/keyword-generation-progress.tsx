"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Sparkles } from "lucide-react"

interface Props {
  message: string
  step: number
}

const BRUTE_MESSAGES = [
  "Starting keyword generation...",
  "Summoning The Brute...",
  "The Brute is still thinking...",
  "Don't anger the Brute...",
  "Be patient, for the Brute shall provide",
  "The Brute studies the deep and does not fear",
  "The Brute has spoken! Now extracting keywords...",
  "The Extractor is parsing The Brute's wisdom...",
  "Saving keyword ideas to database...",
  "Successfully generated keyword ideas!",
]

export function KeywordGenerationProgress({ message, step }: Props) {
  // Estimate progress based on message content
  const getProgress = () => {
    if (message.includes("Starting")) return 5
    if (message.includes("Summoning")) return 15
    if (message.includes("still thinking")) return 30
    if (message.includes("anger")) return 45
    if (message.includes("patient")) return 55
    if (message.includes("studies")) return 65
    if (message.includes("spoken")) return 75
    if (message.includes("Extractor")) return 85
    if (message.includes("Saving")) return 92
    if (message.includes("Successfully")) return 100
    return Math.min(step * 10, 90)
  }

  const progress = getProgress()
  const isComplete = message.includes("Successfully")

  return (
    <Card className="border-2 border-purple-500/30 bg-gradient-to-br from-purple-950/20 to-slate-900/50 shadow-lg shadow-purple-500/10">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-md animate-pulse" />
            <div className="relative bg-purple-600 rounded-full p-2">
              {isComplete ? (
                <Sparkles className="h-5 w-5 text-white" />
              ) : (
                <Loader2 className="h-5 w-5 text-white animate-spin" />
              )}
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">The Brute is Working</h3>
            <p className="text-sm text-muted-foreground">Generating keyword ideas...</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden mb-4">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-600 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-400/50 to-pink-400/50 rounded-full blur-sm transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Current message */}
        <div className="bg-slate-800/50 rounded-lg p-3 border border-purple-500/20">
          <p className="text-sm text-purple-200 font-mono text-center italic">"{message}"</p>
        </div>

        {/* Progress percentage */}
        <div className="flex justify-center mt-3">
          <span className="text-xs text-muted-foreground">{progress}% complete</span>
        </div>
      </CardContent>
    </Card>
  )
}
