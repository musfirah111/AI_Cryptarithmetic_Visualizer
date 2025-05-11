"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { LoadingDialog } from "@/components/loading-dialog"
import { SolverVisualization } from "@/components/solver-visualization"

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

export default function CryptarithmeticVisualizer() {
  // Input state
  const [word1, setWord1] = useState("")
  const [word2, setWord2] = useState("")
  const [word3, setWord3] = useState("")
  const [apiUrl, setApiUrl] = useState("http://localhost:5000")

  // Connection state
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "disconnected" | "checking" | "unknown">(
    "unknown",
  )
  const [isPreviewEnvironment, setIsPreviewEnvironment] = useState(false)

  // Solver state
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("input")
  const [error, setError] = useState<string | null>(null)

  // Data state
  const [initialDomains, setInitialDomains] = useState<Domain>({})
  const [domains, setDomains] = useState<Domain>({})
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [solution, setSolution] = useState<LetterMapping | null>(null)
  const [currentLetter, setCurrentLetter] = useState<string | undefined>(undefined)
  const [equations, setEquations] = useState<string[]>([])
  const [currentEquation, setCurrentEquation] = useState<string | null>(null)
  const [eventSource, setEventSource] = useState<EventSource | null>(null)
  const [isFinished, setIsFinished] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  const [mainEquation, setMainEquation] = useState("")
  const [debugData, setDebugData] = useState<any[]>([])

  // Check if we're in a preview environment
  useEffect(() => {
    // Check if we're in a preview environment (like Vercel preview)
    const isPreview =
      window.location.hostname.includes("vercel.app") ||
      window.location.hostname.includes("netlify.app") ||
      window.location.hostname !== "localhost"

    setIsPreviewEnvironment(isPreview)

    // If we're in a preview, set a more informative error
    if (isPreview) {
      setError("This app requires a local backend server. Please run the Flask server locally.")
    }
  }, [])

  // Check backend connection
  const checkBackendConnection = async () => {
    if (isPreviewEnvironment) {
      setConnectionStatus("disconnected")
      return false
    }

    try {
      setConnectionStatus("checking")
      setError(null)

      // Use AbortController to set a timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      const response = await fetch(`${apiUrl}`, {
        signal: controller.signal,
        mode: "cors",
        headers: {
          Accept: "application/json",
        },
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        setConnectionStatus("connected")
        return true
      } else {
        setConnectionStatus("disconnected")
        setError(`Backend server returned status ${response.status}`)
        return false
      }
    } catch (err) {
      setConnectionStatus("disconnected")

      // Provide more specific error messages
      if (err instanceof TypeError && err.message.includes("Failed to fetch")) {
        setError(`Cannot connect to backend at ${apiUrl}. Make sure the server is running.`)
      } else if (err instanceof DOMException && err.name === "AbortError") {
        setError(`Connection to ${apiUrl} timed out. Check if the server is running.`)
      } else {
        setError(`Connection error: ${err instanceof Error ? err.message : String(err)}`)
      }

      return false
    }
  }

  // Check connection on component mount and when apiUrl changes
  useEffect(() => {
    if (!isPreviewEnvironment) {
      checkBackendConnection()
    }
  }, [apiUrl, isPreviewEnvironment])

  // Initialize domains based on the words
  const initializeDomains = (word1: string, word2: string, word3: string) => {
    const allLetters = new Set([...word1, ...word2, ...word3])
    const leadingLetters = new Set([word1[0], word2[0], word3[0]])
    const domains: Domain = {}

    // Initialize domains for all letters
    allLetters.forEach((letter) => {
      if (leadingLetters.has(letter)) {
        // Leading letters can't be 0
        domains[letter] = [1, 2, 3, 4, 5, 6, 7, 8, 9]
      } else {
        domains[letter] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
      }
    })

    // Initialize carry domains (0 and 1)
    // Determine the maximum number of carry variables needed
    const maxLength = Math.max(word1.length, word2.length, word3.length)
    for (let i = 1; i < maxLength; i++) {
      domains[`Carry${i}`] = [0, 1]
    }

    return domains
  }

  // Reset the visualization
  const resetVisualization = () => {
    setDomains({})
    setInitialDomains({})
    setProgressSteps([])
    setAssignments([])
    setSolution(null)
    setCurrentLetter(undefined)
    setEquations([])
    setCurrentEquation(null)
    setIsFinished(false)
    setShowAnswer(false)
    setDebugData([]) // Clear debug data

    // Close any existing EventSource connection
    if (eventSource) {
      eventSource.close()
      setEventSource(null)
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

  // Update domains based on a new assignment
  const updateDomainsWithAssignment = (currentDomains: Domain, letter: string, value: number): Domain => {
    const newDomains = { ...currentDomains }

    // Set the assigned letter's domain to just the assigned value
    newDomains[letter] = [value]

    // Remove the assigned value from all other letter domains (not carry variables)
    Object.keys(newDomains).forEach((key) => {
      if (key !== letter && !key.startsWith("Carry")) {
        newDomains[key] = newDomains[key].filter((val) => val !== value)
      }
    })

    return newDomains
  }

  // Handle solve button click
  const handleSolveButtonClick = async () => {
    // Validate input
    if (!word1 || !word2 || !word3) {
      setError("Please enter all three words")
      return
    }

    // Don't attempt to connect in preview environment
    if (isPreviewEnvironment) {
      setError("This app requires a local backend server. Please run the Flask server locally.")
      return
    }

    resetVisualization()
    setIsLoading(true)
    setActiveTab("visualization")

    // Set the main equation
    setMainEquation(`${word1} + ${word2} = ${word3}`)

    // Initialize domains
    const domains = initializeDomains(word1, word2, word3)
    setInitialDomains(domains)
    setDomains(domains)

    // Check backend connection first
    const isConnected = await checkBackendConnection()

    if (!isConnected) {
      setIsLoading(false)
      return
    }

    const params = buildQuery({
      word1,
      word2,
      word3,
    })

    try {
      // Close any existing EventSource connection
      if (eventSource) {
        eventSource.close()
        setEventSource(null)
      }

      // Create EventSource for server-sent events with the full URL
      const es = new EventSource(`${apiUrl}/solve${params}`)
      setEventSource(es)

      // Set a timeout to detect connection issues
      const connectionTimeout = setTimeout(() => {
        if (es.readyState !== EventSource.OPEN) {
          setError(`Connection to backend timed out. Make sure the server is running at ${apiUrl}`)
          es.close()
          setEventSource(null)
          setIsLoading(false)
        }
      }, 5000)

      es.onopen = () => {
        clearTimeout(connectionTimeout)
        console.log("EventSource connection established")
      }

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("Received data:", data)

          // Add to debug data
          setDebugData((prev) => [...prev, data])

          // Handle equations
          if (data.equations) {
            setEquations(data.equations)
            return
          }

          // Handle completion
          if (data.done) {
            setSolution(data.assignments)
            setIsFinished(true)
            setIsLoading(false)
            es.close()
            setEventSource(null)
            return
          }

          // Handle step data
          if (data.message) {
            // Extract current equation if present in the message
            let currentEq = null
            if (data.message.includes("equation:")) {
              const eqMatch = data.message.match(/equation:\s*(.+)/i)
              if (eqMatch && eqMatch[1]) {
                currentEq = eqMatch[1].trim()
                setCurrentEquation(currentEq)
              }
            }

            // Add to progress steps
            const newStep: ProgressStep = {
              message: data.message,
              stepType: data.stepType || "progress",
              timestamp: Date.now(),
              equation: currentEq,
              assign: data.assign,
              value: data.value,
              mapping: data.mapping,
              currentLetter: data.currentLetter,
            }

            setProgressSteps((prev) => [...prev, newStep])

            // Handle current letter
            if (data.currentLetter) {
              setCurrentLetter(data.currentLetter)
            }

            // Handle assignments for decision tree
            if (data.assign && data.value !== undefined) {
              const newAssignment = { letter: data.assign, value: data.value }
              setAssignments((prev) => {
                // Check if this assignment already exists
                const exists = prev.some((a) => a.letter === data.assign && a.value === data.value)
                if (exists) return prev
                return [...prev, newAssignment]
              })
            }
          }
        } catch (err) {
          console.error("Error parsing event data:", err)
          setError("Error parsing server response")
          es.close()
          setEventSource(null)
          setIsLoading(false)
        }
      }

      es.onerror = (error) => {
        console.error("EventSource error:", error)
        setError(`Error connecting to backend at ${apiUrl}. Make sure the server is running and CORS is enabled.`)
        es.close()
        setEventSource(null)
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Error setting up EventSource:", error)
      setError(`Failed to connect to backend at ${apiUrl}. Please check if the server is running.`)
      setIsLoading(false)
    }
  }

  // Add this function after the handleSolveButtonClick function
  const handleSolveWithNextApi = async () => {
    // Validate input
    if (!word1 || !word2 || !word3) {
      setError("Please enter all three words")
      return
    }

    resetVisualization()
    setIsLoading(true)
    setActiveTab("visualization")

    // Set the main equation
    setMainEquation(`${word1} + ${word2} = ${word3}`)

    // Initialize domains
    const domains = initializeDomains(word1, word2, word3)
    setInitialDomains(domains)
    setDomains(domains)

    try {
      const response = await fetch(
        `/api/run-solver?word1=${encodeURIComponent(word1)}&word2=${encodeURIComponent(word2)}&word3=${encodeURIComponent(word3)}`,
      )

      // Check if the response is OK
      if (!response.ok) {
        const contentType = response.headers.get("content-type")
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Server error: ${response.status}`)
        } else {
          const errorText = await response.text()
          throw new Error(`Server error: ${response.status} - ${errorText.substring(0, 100)}...`)
        }
      }

      // Parse the JSON response
      const data = await response.json()

      // Add to debug data
      setDebugData([{ type: "api_response", data }])

      // Set equations
      if (data.equations && data.equations.length > 0) {
        setEquations(data.equations)
      }

      // Process progress steps
      if (data.progressSteps && data.progressSteps.length > 0) {
        // Enhance progress steps with mapping information
        const enhancedSteps = data.progressSteps.map((step: any) => {
          // If step has an assignment, add mapping info
          if (step.assign && step.value !== undefined) {
            return {
              ...step,
              mapping: { [step.assign]: step.value },
            }
          }
          return step
        })

        setProgressSteps(enhancedSteps)

        // Use provided assignments if available, otherwise extract from progress steps
        if (data.assignments && data.assignments.length > 0) {
          setAssignments(data.assignments)
        } else {
          // Process assignments from progress steps
          const allAssignments: Assignment[] = []

          for (const step of data.progressSteps) {
            if (step.assign && step.value !== undefined) {
              // Check if this assignment already exists
              if (!allAssignments.some((a) => a.letter === step.assign && a.value === step.value)) {
                allAssignments.push({
                  letter: step.assign,
                  value: step.value,
                })
              }
            }
          }

          setAssignments(allAssignments)
        }
      }

      // Set solution
      if (data.solution) {
        setSolution(data.solution)
        setIsFinished(true)
      }

      setIsLoading(false)
    } catch (error) {
      console.error("Error solving with Next.js API:", error)
      setError(`Error: ${error instanceof Error ? error.message : String(error)}`)
      setIsLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
          Visual Crypta
        </h1>
        <p className="text-gray-300">Solve cryptarithmetic with visuals</p>
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
                    onClick={isPreviewEnvironment ? handleSolveWithNextApi : handleSolveButtonClick}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-lg py-6 px-8"
                    disabled={isPreviewEnvironment ? false : connectionStatus !== "connected"}
                  >
                    Solve Cryptarithmetic
                  </Button>
                </div>
              </div>

              {error && !isPreviewEnvironment && (
                <div className="bg-red-900/40 border-l-4 border-red-500 text-red-100 p-4 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
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

                  <Button
                    variant="outline"
                    onClick={() => {
                      setWord1("ODD")
                      setWord2("ODD")
                      setWord3("EVEN")
                    }}
                    className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white h-auto py-3 justify-start w-full"
                  >
                    <span className="font-mono font-bold">ODD + ODD = EVEN</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setWord1("SATURN")
                      setWord2("URANUS")
                      setWord3("PLANETS")
                    }}
                    className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white h-auto py-3 justify-start w-full"
                  >
                    <span className="font-mono font-bold">SATURN + URANUS = PLANETS</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setWord1("CROSS")
                      setWord2("ROADS")
                      setWord3("DANGER")
                    }}
                    className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white h-auto py-3 justify-start w-full"
                  >
                    <span className="font-mono font-bold">CROSS + ROADS = DANGER</span>
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => {
                      setWord1("TWO")
                      setWord2("TWO")
                      setWord3("FOUR")
                    }}
                    className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-white h-auto py-3 justify-start w-full"
                  >
                    <span className="font-mono font-bold">TWO + TWO = FOUR</span>
                  </Button>
                </div>
              </div>
           
          </TabsContent>

          <TabsContent value="visualization" className="p-6">
            {progressSteps.length > 0 || Object.keys(initialDomains).length > 0 ? (
              <>
                <SolverVisualization
                  initialDomains={initialDomains}
                  progressSteps={progressSteps}
                  assignments={assignments}
                  equations={equations}
                  currentEquation={currentEquation}
                  solution={solution}
                  isFinished={isFinished}
                  showAnswer={showAnswer}
                  setShowAnswer={setShowAnswer}
                  mainEquation={mainEquation}
                  onReset={resetVisualization}
                />
              </>
            ) : (
            <div className="flex flex-col items-center justify-center py-16 space-y-6">
              <div className="w-20 h-20 bg-purple-900/50 rounded-full flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-purple-300"
                >
                  <rect width="16" height="20" x="4" y="2" rx="2" />
                  <line x1="8" x2="16" y1="6" y2="6" />
                  <line x1="8" x2="16" y1="10" y2="10" />
                  <line x1="8" x2="16" y1="14" y2="14" />
                  <line x1="8" x2="16" y1="18" y2="18" />
                </svg>
              </div>
              <p className="text-xl text-white">No visualization available. Please solve a puzzle first.</p>
              <Button onClick={() => setActiveTab("input")} className="bg-purple-600 hover:bg-purple-700 text-white">
                Go to Input
              </Button>
</div>
            )}
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}