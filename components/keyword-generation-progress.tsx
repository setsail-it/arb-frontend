"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Loader2, Sparkles, Check } from "lucide-react"

interface Props {
  message: string
}

const STEPS = [
  { id: 1, label: "Summon", patterns: ["Starting", "Summoning"] },
  { id: 2, label: "Think", patterns: ["thinking", "anger", "patient", "studies", "contemplate", "gather", "churns", "rushed"] },
  { id: 3, label: "Extract", patterns: ["spoken", "Extractor", "parsing"] },
  { id: 4, label: "Save", patterns: ["Saving", "Successfully"] },
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
  return 1
}

export function KeywordGenerationProgress({ message }: Props) {
  const currentStepId = getCurrentStepId(message)
  const isComplete = message.includes("Successfully")

  return (
    <Card className="border-2 border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg">
      <CardContent className="pt-6 pb-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-foreground">Generating Keywords</h3>
          </div>

          {/* Current Message */}
          <div className="bg-background/50 rounded-lg p-4 border border-border/50">
            <div className="flex items-start gap-3">
              {isComplete ? (
                <Sparkles className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              ) : (
                <Loader2 className="h-5 w-5 animate-spin text-primary flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground break-words">{message}</p>
              </div>
            </div>
          </div>

          {/* Step Indicators - 4 steps in a row */}
          <div className="grid grid-cols-4 gap-4">
            {STEPS.map((step) => {
              const isStepComplete = currentStepId > step.id
              const isCurrent = currentStepId === step.id
              const isPending = currentStepId < step.id

              return (
                <div
                  key={step.id}
                  className={`
                    relative rounded-lg p-3 text-center transition-all duration-300
                    ${isStepComplete ? "bg-primary/20 border-2 border-primary" : ""}
                    ${isCurrent ? "bg-primary/10 border-2 border-primary animate-pulse" : ""}
                    ${isPending ? "bg-muted/30 border border-border/30" : ""}
                  `}
                >
                  <div className="flex flex-col items-center gap-1.5">
                    {isStepComplete && (
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
                        ${isStepComplete ? "text-primary" : ""}
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
