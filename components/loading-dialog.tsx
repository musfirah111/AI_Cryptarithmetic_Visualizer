"use client"

import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

type LoadingDialogProps = {
  isOpen: boolean
}

export function LoadingDialog({ isOpen }: LoadingDialogProps) {
  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700 text-white">
        <div className="flex flex-col items-center justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-4" />
          <h3 className="text-lg font-medium">Solving puzzle...</h3>
          <p className="text-sm text-gray-400 mt-2">This may take a moment depending on the complexity.</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
