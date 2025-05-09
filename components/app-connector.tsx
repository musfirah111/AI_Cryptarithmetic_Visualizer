"use client"

import { useState, useEffect } from "react"
import { DomainUpdater } from "@/components/domain-updater"
import { ProgressDisplay } from "@/components/progress-display"
import { DecisionTree } from "@/components/decision-tree"
import { SolutionView } from "@/components/solution-view"
import { LoadingDialog } from "@/components/loading-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Play, Pause, RotateCcw, SkipForward } from "lucide-react"

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
}

type Assignment = {
  letter: string
  value: number
}

export default function AppConnector() {
  // Input state
  const [word1, setWord1] = useState("")
  const [word2, setWord2] = useState("")
  const [word3, setWord3] = useState("")
  const [apiUrl, setApiUrl] = useState("http://localhost:5000")

  // Solver state
  const [isLoading, setIsLoading] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [playSpeed, setPlaySpeed] = useState(500) // ms
  const [showSolution, setShowSolution] = useState(false)

  // Data state
  const [domains, setDomains] = useState<Domain>({})
  const [previousDomains, setPreviousDomains] = useState<Domain>({})
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [solution, setSolution] = useState<LetterMapping | null>(null)
  const [currentLetter, setCurrentLetter] = useState<string | undefined>(undefined)
  const [equations, setEquations] = useState<string[]>([])
  const [eventSource, setEventSource] = useState<EventSource | null>(null)
  const [isFinished, setIsFinished] = useState(false)
  const [activeTab, setActiveTab] = useState("input")
  const [error, setError] = useState<string | null>(null)

  // Reset the visualization
  const resetVisualization = () => {
    setIsRunning(false)
    setCurrentStep(0)
    setDomains({})
    setPreviousDomains({})
    setProgressSteps([])
    setAssignments([])
    setSolution(null)
    setCurrentLetter(undefined)
    setEquations([])
    setIsFinished(false)
    setShowSolution(false)
    setError(null)

    // Close any existing EventSource connection
    if (eventSource) {
      eventSource.close()
      setEventSource(null)
    }
  }

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

  // Build query string for EventSource
  const buildQuery = (params: Record<string, string>) => {
    return (
      "?" +
      Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&")
    )
  }

  // Handle solve button click
  const handleSolveButtonClick = async () => {
    // Validate input
    if (!word1 || !word2 || !word3) {
      setError("Please enter all three words")
      return
    }

    resetVisualization()
    setIsLoading(true)
    setActiveTab("visualization")

    const params = buildQuery({ word1, word2, word3 })
    console.log("Requesting:", `${apiUrl}/solve${params}`) // Log the request URL

    try {
      const es = new EventSource(`${apiUrl}/solve${params}`)
      setEventSource(es)

      es.onopen = () => {
        console.log("EventSource connection established")
      }

      es.onmessage = (event) => {
        console.log("Received data:", event.data) // Log received data
        // Handle data...
      }

      es.onerror = (error) => {
        console.error("EventSource error:", error)
        setError("Error connecting to backend")
      }
    } catch (error) {
      console.error("Error setting up EventSource:", error)
      setError("Failed to connect to backend")
    }
  }

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

  useEffect(() => {
    console.log("Current Domains:", domains); // Log current domains
    console.log("Current Assignments:", assignments); // Log current assignments
  }, [currentStep]);

  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Cryptarithmetic Solver
        </h1>
        <p className="text-gray-300">Connect the visualization with the backend solver</p>
      </div>

      <LoadingDialog isOpen={isLoading} />

      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="p-4 bg-gradient-to-r from-purple-900 to-slate-900 border-b border-slate-700">
            <TabsList className="grid w-full grid-cols-2 bg-slate-800">
              <TabsTrigger
                value="input"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white"
              >
                Input Puzzle
              </TabsTrigger>
              <TabsTrigger
                value="visualization"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white"
              >
                Visualization
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="input" className="p-6 space-y-6">
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="word1" className="text-gray-300">
                    First Word
                  </Label>
                  <Input
                    id="word1"
                    value={word1}
                    onChange={(e) => setWord1(e.target.value.toUpperCase())}
                    placeholder="SEND"
                    className="font-mono text-lg h-12 bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="word2" className="text-gray-300">
                    Second Word
                  </Label>
                  <Input
                    id="word2"
                    value={word2}
                    onChange={(e) => setWord2(e.target.value.toUpperCase())}
                    placeholder="MORE"
                    className="font-mono text-lg h-12 bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="word3" className="text-gray-300">
                    Result Word
                  </Label>
                  <Input
                    id="word3"
                    value={word3}
                    onChange={(e) => setWord3(e.target.value.toUpperCase())}
                    placeholder="MONEY"
                    className="font-mono text-lg h-12 bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-center mt-4">
                <Button
                  onClick={handleSolveButtonClick}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg py-6 px-8"
                >
                  Solve Cryptarithmetic
                </Button>
              </div>

              {error && (
                <div className="bg-red-900/40 border-l-4 border-red-500 text-red-100 p-4 rounded-md">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-700/50 p-6 rounded-xl border border-slate-600">
                <h3 className="text-lg font-medium mb-4 text-white">Examples</h3>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setWord1("SEND")
                      setWord2("MORE")
                      setWord3("MONEY")
                    }}
                    className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white h-auto py-3 justify-start w-full"
                  >
                    <span className="font-mono font-bold">SEND + MORE = MONEY</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setWord1("BASE")
                      setWord2("BALL")
                      setWord3("GAMES")
                    }}
                    className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white h-auto py-3 justify-start w-full"
                  >
                    <span className="font-mono font-bold">BASE + BALL = GAMES</span>
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="visualization" className="p-6">
            {isFinished ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  <DomainUpdater domains={domains} previousDomains={previousDomains} currentLetter={currentLetter} />
                  <ProgressDisplay steps={progressSteps} currentStep={currentStep} />
                </div>
                <div className="space-y-6">
                  <DecisionTree assignments={assignments} />
                  <SolutionView
                    solution={solution}
                    isVisible={showSolution}
                    onToggleVisibility={() => setShowSolution(!showSolution)}
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="flex justify-center space-x-4 mt-4">
                    <Button
                      variant="outline"
                      onClick={resetVisualization}
                      className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-white"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                    <Button
                      onClick={toggleVisualization}
                      disabled={currentStep >= progressSteps.length - 1}
                      className={`${
                        isRunning
                          ? "bg-amber-600 hover:bg-amber-700"
                          : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      } text-white`}
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
                      disabled={currentStep >= progressSteps.length - 1}
                      className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-white"
                    >
                      <SkipForward className="h-4 w-4 mr-2" />
                      Next
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-lg text-gray-300">Enter a puzzle and click "Solve Cryptarithmetic" to start</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}
