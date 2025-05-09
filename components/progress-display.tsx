"use client"

import { useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ProgressStep = {
  message: string
  stepType?: string
  timestamp?: number
}

type ProgressDisplayProps = {
  steps: ProgressStep[]
  currentStep: number
}

export function ProgressDisplay({ steps, currentStep }: ProgressDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [steps, currentStep])

  const getStepColor = (step: ProgressStep, index: number) => {
    if (index === currentStep) return "text-yellow-300 font-bold"

    switch (step.stepType) {
      case "select":
        return "text-blue-300"
      case "assign":
        return "text-green-300"
      case "backtrack":
        return "text-red-300"
      case "solution_found":
        return "text-emerald-300 font-bold"
      case "no_solution":
        return "text-red-400 font-bold"
      default:
        return "text-gray-300"
    }
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-white">Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={scrollRef} className="h-64 overflow-y-auto bg-slate-900 p-3 rounded-md font-mono text-sm">
          {steps.length === 0 ? (
            <div className="text-gray-400">No progress to display yet</div>
          ) : (
            steps.map((step, index) => (
              <div key={index} className={`mb-2 ${getStepColor(step, index)}`}>
                {step.stepType && <span className="mr-2 uppercase text-xs">[{step.stepType}]</span>}
                {step.message}
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
