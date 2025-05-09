"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type LetterMapping = {
  [key: string]: number | null
}

type Domain = {
  [key: string]: number[]
}

type ProgressStep = {
  message: string
  stepType?: string
  timestamp?: number
  domains?: Domain
  assignments?: Assignment[]
}

type Assignment = {
  letter: string
  value: number
}

type VisualizationPanelProps = {
  allDomains: Domain[]
  progressSteps: ProgressStep[]
  allAssignments: Assignment[][]
  equations: string[]
  solution: LetterMapping | null
  isFinished: boolean
  onReset: () => void
}

export function VisualizationPanel({
  allDomains,
  progressSteps,
  allAssignments,
  equations,
  solution,
  isFinished,
  onReset,
}: VisualizationPanelProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [playSpeed, setPlaySpeed] = useState(500) // ms
  const [sliderValue, setSliderValue] = useState(100) // percent
  const [showAnswer, setShowAnswer] = useState(false)
  const progressRef = useRef<HTMLDivElement>(null)

  // Current state based on step
  const currentDomains = allDomains[currentStep] || {}
  const currentAssignments = allAssignments[currentStep] || []

  // Auto-advance steps when running
  useEffect(() => {
    if (!isRunning || progressSteps.length === 0 || currentStep >= progressSteps.length - 1) {
      return
    }

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = prev + 1
        if (next >= progressSteps.length - 1) {
          setIsRunning(false)
          return progressSteps.length - 1
        }
        return next
      })
    }, playSpeed)

    return () => clearInterval(interval)
  }, [isRunning, currentStep, progressSteps.length, playSpeed])

  // Auto-scroll progress to bottom when currentStep changes
  useEffect(() => {
    if (progressRef.current && isRunning) {
      progressRef.current.scrollTop = progressRef.current.scrollHeight
    }
  }, [currentStep, isRunning])

  // Toggle play/pause
  const toggleVisualization = () => {
    setIsRunning(!isRunning)
  }

  // Skip to next step
  const nextStep = () => {
    if (currentStep < progressSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  // Reset visualization
  const resetVisualization = () => {
    setIsRunning(false)
    setCurrentStep(0)
    setShowAnswer(false)
    onReset()
  }

  // Handle speed change
  const handleSpeedChange = (value: number[]) => {
    setSliderValue(value[0])
    // Convert percentage to milliseconds (100% = 50ms, 0% = 2000ms)
    setPlaySpeed(2000 - Math.round((value[0] / 100) * 1950))
  }

  // Format domains for display
  const formatDomains = (domains: Domain) => {
    return Object.entries(domains).map(([letter, values]) => (
      <div key={letter} className="mb-1">
        <span className="font-mono font-bold">{letter} = ?:</span> [{values.join(", ")}]
      </div>
    ))
  }

  // Get current step data
  const currentStepData = progressSteps[currentStep] || {}

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Equations */}
        {equations.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Equations:</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {equations.map((eq, idx) => (
                  <Badge key={idx} className="bg-purple-600 text-white">
                    {eq}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={progressRef} className="h-64 overflow-y-auto bg-slate-900 p-3 rounded-md font-mono text-sm">
              {progressSteps.length === 0 ? (
                <div className="text-gray-400">No progress to display yet</div>
              ) : (
                progressSteps.slice(0, currentStep + 1).map((step, index) => {
                  const stepType = step.stepType || "progress"
                  let textColor = "text-gray-300"

                  if (stepType === "select") textColor = "text-blue-300"
                  if (stepType === "assign") textColor = "text-green-300"
                  if (stepType === "backtrack") textColor = "text-red-300"
                  if (stepType === "solution_found") textColor = "text-emerald-300 font-bold"
                  if (stepType === "no_solution") textColor = "text-red-400 font-bold"
                  if (index === currentStep) textColor = "text-yellow-300 font-bold"

                  return (
                    <div key={index} className={`mb-2 ${textColor}`}>
                      {step.stepType && <span className="mr-2 uppercase text-xs">[{step.stepType}]</span>}
                      {step.message}
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Controls */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <Button
              variant="outline"
              onClick={resetVisualization}
              className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-white"
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={toggleVisualization}
              disabled={!progressSteps.length || currentStep >= progressSteps.length - 1}
              className={`${
                isRunning
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              } text-white`}
              size="sm"
            >
              {isRunning ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {currentStep === 0 ? "Start" : "Resume"}
                </>
              )}
            </Button>
            <Button
              onClick={nextStep}
              disabled={!progressSteps.length || currentStep >= progressSteps.length - 1}
              className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-white"
              size="sm"
            >
              <SkipForward className="h-4 w-4 mr-2" />
              Next
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-300 w-12">Speed:</span>
            <Slider
              value={[sliderValue]}
              min={0}
              max={100}
              step={1}
              onValueChange={handleSpeedChange}
              className="flex-1"
            />
            <span className="text-sm text-gray-300 w-12 text-right">{sliderValue}%</span>
          </div>
        </div>

        {/* Current Domains */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">Current Domains:</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 p-3 rounded-md text-sm font-mono text-white">
              {Object.keys(currentDomains).length === 0 ? (
                <div className="text-gray-400">No domains to display yet</div>
              ) : (
                formatDomains(currentDomains)
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Decision Tree */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white">Decision Tree Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 p-3 rounded-md h-[400px] overflow-y-auto flex flex-col items-center justify-center">
              {currentAssignments.length === 0 ? (
                <div className="text-gray-400">No decisions made yet</div>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  {currentAssignments.map((assignment, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="w-40 h-12 bg-sky-200 rounded-md flex items-center justify-center text-slate-800 font-bold">
                        {assignment.letter} = {assignment.value}
                      </div>
                      {index < currentAssignments.length - 1 && <div className="h-6 w-0.5 bg-gray-400"></div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Answer (only shown when finished) */}
        {isFinished && solution && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Answer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-900 p-3 rounded-md font-mono text-white">
                {Object.entries(solution)
                  .filter(([_, value]) => value !== null)
                  .map(([letter, value]) => `${letter} = ${value}`)
                  .join(", ")}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}