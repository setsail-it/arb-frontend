"use client"

import { Check, Loader2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

interface FetchProgressTrackerProps {
  currentStep: number
  message: string
}

const STEPS = [
  { id: 1, label: "Initialize", key: "start" },
  { id: 2, label: "Scout-1", key: "scout1" },
  { id: 3, label: "Site Context", key: "context" },
  { id: 4, label: "Scout-2", key: "scout2" },
  { id: 5, label: "Blog Posts", key: "posts" },
  { id: 6, label: "Brand Assets", key: "assets" },
  { id: 7, label: "Images", key: "images" },
  { id: 8, label: "Save", key: "save" },
]

export function FetchProgressTracker({ currentStep, message }: FetchProgressTrackerProps) {
  const progress = (currentStep / 12) * 100

  return (
    <Card className="border-2 border-primary bg-gradient-to-br from-primary/10 to-primary/5 shadow-lg">
      <CardContent className="pt-6 pb-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-foreground">Fetching Client Context</h3>
            <p className="text-sm text-muted-foreground">Step {currentStep} of 12</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span className="font-medium text-primary">{Math.round(progress)}%</span>
              <span>100%</span>
            </div>
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

          {/* Step Indicators */}
          <div className="grid grid-cols-4 gap-3">
            {STEPS.map((step) => {
              const isComplete = currentStep > step.id
              const isCurrent = currentStep === step.id
              const isPending = currentStep < step.id

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
