"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Play, Pause, RotateCcw, SkipForward, Eye } from "lucide-react"
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
  equation?: string
  assign?: string
  value?: number
  mapping?: LetterMapping
  currentLetter?: string
}

type Assignment = {
  letter: string
  value: number
}

type SolverVisualizationProps = {
  initialDomains: Domain
  progressSteps: ProgressStep[]
  assignments: Assignment[]
  equations: string[]
  currentEquation: string | null
  solution: LetterMapping | null
  isFinished: boolean
  showAnswer: boolean
  setShowAnswer: (show: boolean) => void
  mainEquation: string
  onReset: () => void
}

export function SolverVisualization({
  initialDomains,
  progressSteps,
  assignments: initialAssignments,
  equations,
  currentEquation,
  solution,
  isFinished,
  showAnswer,
  setShowAnswer,
  mainEquation,
  onReset,
}: SolverVisualizationProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [playSpeed, setPlaySpeed] = useState(500)
  const [sliderValue, setSliderValue] = useState(100)
  const progressRef = useRef<HTMLDivElement>(null)

  const [currentDomains, setCurrentDomains] = useState<Domain>(initialDomains)
  const [currentAssignments, setCurrentAssignments] = useState<Assignment[]>([])
  const [previousDomains, setPreviousDomains] = useState<Domain | null>(null)

  const currentStepData = progressSteps[currentStep] || {}

  // Extract unique letters from the main equation
  const uniqueLetters = Array.from(new Set(mainEquation.replace(/[^A-Za-z]/g, "").toUpperCase()));

  useEffect(() => {
    let updatedDomains = { ...initialDomains }
    const stepAssignments: Assignment[] = []

    for (let i = 0; i <= currentStep && i < progressSteps.length; i++) {
      const step = progressSteps[i]

      if (step.assign && step.value !== undefined) {
        if (!stepAssignments.some((a) => a.letter === step.assign && a.value === step.value)) {
          stepAssignments.push({ letter: step.assign, value: step.value })
        }
        setPreviousDomains(updatedDomains)
        updatedDomains = updateDomainsWithAssignment(updatedDomains, step.assign, step.value)
      }

      if (step.mapping) {
        Object.entries(step.mapping).forEach(([letter, value]) => {
          if (value !== null && !stepAssignments.some((a) => a.letter === letter)) {
            stepAssignments.push({ letter, value })
            setPreviousDomains(updatedDomains)
            updatedDomains = updateDomainsWithAssignment(updatedDomains, letter, value)
          }
        })
      }
    }

    setCurrentDomains(updatedDomains)
    setCurrentAssignments(stepAssignments)

    if (isFinished && solution) {
      const correctedAssignments = stepAssignments.map((a) => {
        const correctValue = solution[a.letter]
        if (correctValue !== null && correctValue !== undefined && correctValue !== a.value) {
          return { ...a, value: correctValue }
        }
        return a
      })
      setCurrentAssignments(correctedAssignments)
    }

  }, [currentStep, progressSteps, initialDomains])

  useEffect(() => {
    if (!isRunning || progressSteps.length === 0 || currentStep >= progressSteps.length - 1) return

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

  useEffect(() => {
    if (progressRef.current && isRunning) {
      progressRef.current.scrollTop = progressRef.current.scrollHeight
    }
  }, [currentStep, isRunning])

  const toggleVisualization = () => {
    setIsRunning(!isRunning)
  }

  const nextStep = () => {
    if (currentStep < progressSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const resetVisualization = () => {
    setIsRunning(false)
    setCurrentStep(0)
    setShowAnswer(false)
    setCurrentDomains(initialDomains)
    setCurrentAssignments([])
    setPreviousDomains(null)
    onReset()
  }

  const handleSpeedChange = (value: number[]) => {
    setSliderValue(value[0])
    setPlaySpeed(2000 - Math.round((value[0] / 100) * 1950))
  }

  function updateDomainsWithAssignment(domains: Domain, letter: string, value: number): Domain {
    const newDomains = { ...domains }
    newDomains[letter] = [value]
    Object.keys(newDomains).forEach((key) => {
      if (key !== letter && !key.startsWith("Carry")) {
        newDomains[key] = newDomains[key].filter((val) => val !== value)
      }
    })
    return newDomains
  }

  const formatDomains = (
    domains: Domain,
    solution: LetterMapping | null,
    isFinished: boolean
  ) => {
    const keys = Object.keys({ ...domains, ...(solution || {}) })
      .filter((key) => key.length === 1 || key.startsWith("Carry"))
      .sort((a, b) => {
        const aIsCarry = a.startsWith("Carry")
        const bIsCarry = b.startsWith("Carry")
        if (aIsCarry === bIsCarry) return a.localeCompare(b)
        return aIsCarry ? 1 : -1
      })

    return keys.map((key) => {
      let values = domains[key] ?? []

      if (
        isFinished &&
        solution &&
        (values.length === 0 || (values.length === 1 && values[0] !== solution[key])) &&
        solution[key] !== null &&
        solution[key] !== undefined
      ) {
        values = [solution[key]!]
      }

      return (
        <div key={key} className="mb-1 text-white">
          <span className="font-mono fonto-bold uppercase">{key} = </span>[{values.join(", ")}]
        </div>
      )
    })
  }



  return (
    <div className="space-y-6">
      {/* Equations */}
      {equations.length > 0 && (
        <div className="mb-4">
          <div className="text-xl font-semibold mb-2 text-white">Equations:</div>
          <div className="flex flex-wrap gap-2">
            {equations.map((eq, idx) => (
              <Badge
                key={idx}
                className={`${eq === currentEquation
                  ? "bg-yellow-500 text-slate-900 border-2 border-yellow-500 text-sm font-bold"
                  : "bg-slate-700 text-white border-2 border-slate-600 text-sm"
                  }`}
              >
                {eq}
              </Badge>
            ))}
          </div>
        </div>

      )}

      {/* Main Equation */}
      {mainEquation && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 text-center mb-6">
          <div className="text-xl font-mono font-bold text-white">{mainEquation}</div>
        </div>
      )}

      {/* Unique Letters */}
      {mainEquation && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-6">
          <div className="text-lg font-semibold mb-2 text-white">Unique Letters:</div>
          <div className="flex justify-center gap-3">
            {uniqueLetters.map((letter) => (
              <div
                key={letter}
                className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg"
              >
                {letter}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Left Column */}
        <div className="space-y-6">
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
            <div className="flex flex-nowrap gap-2 justify-between mb-4 items-center">
              <Button
                onClick={resetVisualization}
                className="w-28 h-11 text-sm bg-slate-700 border-slate-600 hover:bg-slate-600 text-white active:bg-gradient-to-r active:from-purple-600 active:to-pink-600"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button
                onClick={toggleVisualization}
                disabled={!progressSteps.length || currentStep >= progressSteps.length - 1}
                className={`w-28 h-11 text-sm text-white ${isRunning
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  : "bg-slate-700 border-slate-600 hover:bg-slate-600"
                  } active:bg-gradient-to-r active:from-purple-600 active:to-pink-600`}
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
                className="w-28 h-11 text-sm bg-slate-700 border-slate-600 hover:bg-slate-600 text-white active:bg-gradient-to-r active:from-purple-600 active:to-pink-600"
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Next
              </Button>
              <Button
                onClick={() => setShowAnswer(!showAnswer)}
                className="w-28 h-11 text-sm bg-slate-700 border-slate-600 hover:bg-slate-600 text-white active:bg-gradient-to-r active:from-purple-600 active:to-pink-600"
              >
                <Eye className="h-4 w-4 mr-2" />
                Answer
              </Button>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-300 w-12">Speed:</span>
              <Slider value={[sliderValue]} min={0} max={100} step={1} onValueChange={handleSpeedChange} className="flex-1" />
              <span className="text-sm text-gray-300 w-12 text-right">{sliderValue}%</span>
            </div>
          </div>

          {/* Current Domains */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Current Domains:</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-900 p-3 rounded-md text-sm font-mono">
                {Object.keys(currentDomains).length === 0 ? (
                  <div className="text-gray-400">No domains to display yet</div>
                ) : (
                  formatDomains(currentDomains, solution, isFinished)
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6 h-full">
          <Card className="bg-slate-800 border-slate-700 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-white">Decision Tree</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-900 p-3 rounded-md h-[835px] overflow-y-auto flex flex-col items-center justify-start">
                {currentAssignments.length === 0 ? (
                  <div className="text-gray-400">No decisions made yet</div>
                ) : (
                  <div className="flex flex-col items-center space-y-4 w-full">
                    {currentAssignments.map((assignment, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div className="w-40 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-md flex items-center justify-center text-white font-bold">
                          {assignment.letter.toUpperCase()} = {assignment.value}
                        </div>
                        {index < currentAssignments.length - 1 && <div className="h-6 w-0.5 bg-gray-400"></div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Answer Section */}


      {/* Answer Section */}
      {showAnswer && solution && (
        <div className="mt-8">
          <div className="bg-slate-800 border-slate-700 rounded-lg p-6">
            <div className="mb-4">
              <div className="text-lg font-bold text-green-400 mb-2">Answer</div>
              <div className="bg-slate-900 p-3 rounded-md font-mono text-white">
                {Object.entries(solution)
                  .filter(([key, value]) => value !== null && !key.startsWith("Carry"))
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([letter, value]) => `${letter.toUpperCase()} = ${value}`)
                  .join(", ")}
              </div>
            </div>
            <div className="mb-4">
              <div className="text-lg font-bold text-white mb-2">Final Domains:</div>
              <div className="bg-slate-900 p-4 rounded-md">
                {/* Get all keys using the formatDomains logic */}
                {(() => {
                  const keys = Object.keys({ ...currentDomains, ...(solution || {}) })
                   
                    .filter((key) => key.length === 1 || key.startsWith("Carry"))
                    .sort((a, b) => {
                      const aIsCarry = a.startsWith("Carry")
                      const bIsCarry = b.startsWith("Carry")
                      if (aIsCarry === bIsCarry) return a.localeCompare(b)
                      return aIsCarry ? 1 : -1
                    })
                    
                    .filter(key => !key.startsWith("Carry"));
                    

                  const firstHalf = keys.slice(0, Math.ceil(keys.length / 2));
                  const secondHalf = keys.slice(Math.ceil(keys.length / 2));

                  return (
                    <>
                      {/* First row */}
                      <div className="flex justify-evenly mb-4">
                        {firstHalf.map(letter => {
                          let values = currentDomains[letter] ?? [];

                          if (
                            isFinished &&
                            solution &&
                            (values.length === 0 || (values.length === 1 && values[0] !== solution[letter])) &&
                            solution[letter] !== null &&
                            solution[letter] !== undefined
                          ) {
                            values = [solution[letter]!];
                          }

                          return (
                            <div key={letter} className="bg-slate-700 rounded-lg p-3 w-[180px]">
                              <div className="text-center text-white text-xl font-bold mb-2">{letter.toUpperCase()}</div>
                              <div className="grid grid-cols-5 gap-1">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                                  const isInDomain = values.includes(num);
                                  const isSolution = solution ? solution[letter] === num : false;
                                  const isHighlighted = isInDomain && (isSolution || (values.length === 1 && values[0] === num));

                                  return (
                                    <div
                                      key={num}
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-sm
                                  ${isHighlighted ? "bg-purple-500 text-white" : "bg-slate-800 text-gray-400"}`}
                                    >
                                      {num}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Second row */}
                      <div className="flex justify-evenly">
                        {secondHalf.map(letter => {
                          let values = currentDomains[letter] ?? [];

                          if (
                            isFinished &&
                            solution &&
                            (values.length === 0 || (values.length === 1 && values[0] !== solution[letter])) &&
                            solution[letter] !== null &&
                            solution[letter] !== undefined
                          ) {
                            values = [solution[letter]!];
                          }

                          return (
                            <div key={letter} className="bg-slate-700 rounded-lg p-3 w-[180px]">
                              <div className="text-center text-white text-xl font-bold mb-2">{letter.toUpperCase()}</div>
                              <div className="grid grid-cols-5 gap-1">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => {
                                  const isInDomain = values.includes(num);
                                  const isSolution = solution ? solution[letter] === num : false;
                                  const isHighlighted = isInDomain && (isSolution || (values.length === 1 && values[0] === num));

                                  return (
                                    <div
                                      key={num}
                                      className={`w-6 h-6 rounded-full flex items-center justify-center text-sm
                                  ${isHighlighted ? "bg-purple-500 text-white" : "bg-slate-800 text-gray-400"}`}
                                    >
                                      {num}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-white mb-2">Final Decision Tree:</div>
              <div className="flex flex-col items-center space-y-4 py-4">
                    {currentAssignments.map((assignment, index) => (
                      <div key={index} className="flex flex-col items-center">
                        <div className="w-40 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-md flex items-center justify-center text-white font-bold">
                          {assignment.letter.toUpperCase()} = {assignment.value}
                        </div>
                        {index < currentAssignments.length - 1 && <div className="h-6 w-0.5 bg-gray-400"></div>}
                      </div>
                    ))}
              </div>
            </div>
          </div>
        </div>
      )}


    </div>
  )
}

