import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Keyboard } from "lucide-react"

interface ShortcutsDialogProps {
  open: boolean
  onClose: () => void
}

interface ShortcutItem {
  keys: string[]
  description: string
  context?: string
}

const SHORTCUTS: ShortcutItem[] = [
  {
    keys: ["?"],
    description: "Open this keyboard shortcuts cheat-sheet",
  },
  {
    keys: ["⌘", "K"],
    description: "Open Quick Find search palette for patients & routes",
  },
  {
    keys: ["⌘", "⇧", "D"],
    description: "Launch Demo Command Center & Script Overlay (Admin)",
  },
  {
    keys: ["1"],
    description: "Switch to Patient Overview tab (Conditions, Meds, Labs)",
    context: "Patient Chart",
  },
  {
    keys: ["2"],
    description: "Switch to Patient Timeline tab (Chronological audit stream)",
    context: "Patient Chart",
  },
  {
    keys: ["3"],
    description: "Switch to Patient Identity tab (Cross-system links & evidence)",
    context: "Patient Chart",
  },
  {
    keys: ["T"],
    description: "Toggle between Light and Dark Vibrant Clinical themes",
  },
  {
    keys: ["Esc"],
    description: "Close active dialog, palette, or inspector drawer",
  },
]

export function ShortcutsDialog({ open, onClose }: ShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-lg border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] p-6 shadow-xl antialiased">
        <DialogHeader className="border-b border-[var(--line)] pb-3">
          <div className="flex items-center gap-2 text-[var(--teal)]">
            <Keyboard className="h-5 w-5" />
            <DialogTitle className="font-serif text-lg font-semibold tracking-tight text-[var(--ink)]">
              Keyboard Shortcuts
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-[var(--ink-soft)] mt-0.5">
            Navigate the CareLens medical workspace quickly using global hotkeys.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 my-3">
          {SHORTCUTS.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between py-1.5 px-2 rounded-[6px] hover:bg-[var(--paper)] transition-colors text-xs"
            >
              <div className="space-y-0.5">
                <div className="font-sans text-[var(--ink)] font-medium">
                  {item.description}
                </div>
                {item.context && (
                  <div className="font-mono text-[10px] text-[var(--teal)]">
                    {item.context}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-3">
                {item.keys.map((k, ki) => (
                  <kbd
                    key={ki}
                    className="inline-flex h-6 min-w-6 items-center justify-center rounded-[4px] border border-[var(--line)] bg-[var(--paper)] px-1.5 font-mono text-[11px] font-semibold text-[var(--ink)] shadow-2xs"
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[var(--line)] text-xs text-[var(--ink-soft)]">
          <span>Press <kbd className="font-mono font-bold text-[var(--ink)]">Esc</kbd> anytime to dismiss.</span>
          <button
            onClick={onClose}
            className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] px-3 py-1 font-sans text-xs text-[var(--ink)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
