"use client"

import { Check, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface FetchProgressTrackerProps {
  message: string
}

const STEPS = [
  { id: 1, label: "Initialize", patterns: ["Starting", "Initializing"] },
  { id: 2, label: "Scouts", patterns: ["parallel", "Scout-1", "Scout-2", "Scout-3", "site context", "blog posts", "staff bios"] },
  { id: 3, label: "Images", patterns: ["Collecting images", "Processing blog post", "Image collection"] },
  { id: 4, label: "Save", patterns: ["Saving", "Save"] },
]

function getCurrentStepId(message: string): number {
  const lowerMessage = message.toLowerCase()
  
  // Check patterns in reverse order (highest priority first)
  for (let i = STEPS.length - 1; i >= 0; i--) {
    const step = STEPS[i]
    if (step.patterns.some(pattern => lowerMessage.includes(pattern.toLowerCase()))) {
      return step.id
    }
  }
  return 1 // Default to first step
}

export function FetchProgressTracker({ message }: FetchProgressTrackerProps) {
  const currentStepId = getCurrentStepId(message)

  return (
    <Card className="border-2 border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg">
      <CardContent className="pt-6 pb-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-foreground">Fetching Client Context</h3>
          </div>

          {/* Current Message */}
          <div className="bg-background/50 rounded-lg p-4 border border-border/50">
            <div className="flex items-start gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground break-words">{message}</p>
              </div>
            </div>
          </div>

          {/* Step Indicators - 4 steps in a row */}
          <div className="grid grid-cols-4 gap-4">
            {STEPS.map((step) => {
              const isComplete = currentStepId > step.id
              const isCurrent = currentStepId === step.id
              const isPending = currentStepId < step.id

              return (
                <div
                  key={step.id}
                  className={`
                    relative rounded-lg p-3 text-center transition-all duration-300
                    ${isComplete ? "bg-primary/20 border-2 border-primary" : ""}
                    ${isCurrent ? "bg-primary/10 border-2 border-primary animate-pulse" : ""}
                    ${isPending ? "bg-muted/30 border border-border/30" : ""}
                  `}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    {isComplete && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                    {isCurrent && (
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      </div>
                    )}
                    {isPending && <div className="w-6 h-6 rounded-full bg-muted border border-border/50" />}
                    <span
                      className={`
                        text-xs font-medium leading-tight
                        ${isComplete ? "text-primary" : ""}
                        ${isCurrent ? "text-primary font-semibold" : ""}
                        ${isPending ? "text-muted-foreground" : ""}
                      `}
                    >
                      {step.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
