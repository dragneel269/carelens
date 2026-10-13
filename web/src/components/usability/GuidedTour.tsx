import * as React from "react"
import { motion, AnimatePresence, useReducedMotion } from "motion/react"
import {
  Compass,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Shield,
  Layers,
  Eye,
  FileCheck2,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface TourStep {
  title: string
  subtitle: string
  description: string
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  tip: string
  badgeText: string
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Unified Golden Patient Identity",
    subtitle: "Cross-system matching without national IDs",
    description:
      "CareLens matches disparate records across EHR, Lab, Pharmacy, and Insurer databases without relying on national identifiers. Algorithmic multi-attribute matching unifies Ramesh Kumar under Master CL-000001.",
    icon: Layers,
    tip: "Notice the feeder ID chips (APL-004512, LB-77120, PH-30991, STAR-48221) and the 96% MatchBadge.",
    badgeText: "Step 1 of 5 · Identity Engine",
  },
  {
    title: "Zero-Trust 'Viewing As' Switcher",
    subtitle: "Dynamic role-based access control simulation",
    description:
      "CareLens applies strict default-deny policies. Switch between Doctor, Nurse, Pharmacist, Billing, and Patient from the top bar to observe instant server-side data redactions and purposeful access rules.",
    icon: Eye,
    tip: "Doctor sees diagnoses and meds; Pharmacist only sees meds and allergies; Billing sees only insurance claims.",
    badgeText: "Step 2 of 5 · Policy Engine",
  },
  {
    title: "Clinical Overview & Visible Redactions",
    subtitle: "Merged medications, conflicts & hatched redactions",
    description:
      "Review reconciled medications with planted conflict flags (missing from EHR, allergy conflict), unified HbA1c lab trends with normal reference bands, and hatched redaction bars showing clear 'Why hidden' policy reasons.",
    icon: Shield,
    tip: "Hover over any redaction bar or chip for plain-language legal and provenance explanations.",
    badgeText: "Step 3 of 5 · Clinical Workspace",
  },
  {
    title: "Patient Privacy Portal",
    subtitle: "DPDP consent directives & access history",
    description:
      "Under the Digital Personal Data Protection Act, patients grant or revoke consent by department (clinicians, pharmacy, lab, billing). Access history tracks all reads with prominent vermilion alerts for denied attempts.",
    icon: FileCheck2,
    tip: "Navigate to /portal to revoke Billing's consent and watch real-time updates within 3 seconds.",
    badgeText: "Step 4 of 5 · Consent Management",
  },
  {
    title: "Tamper-Evident Audit Ledger",
    subtitle: "Append-only SHA-256 cryptographic chain",
    description:
      "Every clinical read and consent evaluation is sealed into an append-only hash chain. The ledger proves who accessed what, when, and for what declared purpose. Click 'Verify Chain' to validate unbroken integrity.",
    icon: Compass,
    tip: "HashChips display 8-character hashes. Click any chip to copy the full SHA-256 fingerprint.",
    badgeText: "Step 5 of 5 · Cryptographic Audit",
  },
]

export interface GuidedTourProps {
  forceOpen?: boolean
  onClose?: () => void
}

export function GuidedTour({ forceOpen = false, onClose }: GuidedTourProps) {
  const shouldReduceMotion = useReducedMotion()
  const [isOpen, setIsOpen] = React.useState(false)
  const [currentStep, setCurrentStep] = React.useState(0)

  React.useEffect(() => {
    if (forceOpen) {
      const timer = setTimeout(() => {
        setIsOpen(true)
        setCurrentStep(0)
      }, 0)
      return () => clearTimeout(timer)
    }

    const completed = localStorage.getItem("carelens_tour_completed")
    if (!completed) {
      const timer = setTimeout(() => {
        setIsOpen(true)
      }, 700)
      return () => clearTimeout(timer)
    }
  }, [forceOpen])

  const handleClose = () => {
    localStorage.setItem("carelens_tour_completed", "true")
    setIsOpen(false)
    if (onClose) onClose()
  }

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      handleClose()
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  if (!isOpen) return null

  const step = TOUR_STEPS[currentStep]
  const Icon = step.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs antialiased">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -10 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg rounded-[12px] border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] p-6 shadow-2xl overflow-hidden"
          role="dialog"
          aria-labelledby="tour-modal-title"
        >
          {/* Top color bar */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-[var(--primary)]" />

          {/* Close / Skip button */}
          <button
            onClick={handleClose}
            aria-label="Skip tour"
            className="absolute top-4 right-4 rounded-[6px] p-1 text-[var(--ink-soft)] hover:bg-[var(--paper)] hover:text-[var(--ink)] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Header Badge */}
          <div className="flex items-center gap-2 mb-4">
            <span className="rounded-[4px] border border-[var(--primary)]/30 bg-[var(--tint-teal)] px-2 py-0.5 font-mono text-[10px] uppercase font-semibold text-[var(--primary-strong)]">
              {step.badgeText}
            </span>
          </div>

          {/* Step Icon and Title */}
          <div className="flex items-start gap-3.5 mb-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] border border-[var(--primary)]/20 bg-[var(--tint-teal)] text-[var(--primary)] shadow-2xs">
              <Icon className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3
                id="tour-modal-title"
                className="font-serif text-lg font-semibold tracking-tight text-[var(--ink)] leading-snug"
              >
                {step.title}
              </h3>
              <p className="font-sans text-xs text-[var(--teal)] font-medium">
                {step.subtitle}
              </p>
            </div>
          </div>

          {/* Step Body */}
          <p className="text-xs text-[var(--ink-soft)] leading-relaxed mb-4">
            {step.description}
          </p>

          {/* Interactive Pro-tip */}
          <div className="rounded-[8px] border border-[var(--line)] bg-[var(--paper)] p-3 mb-5 text-[11px] leading-relaxed text-[var(--ink)]">
            <span className="font-semibold text-[var(--primary)] mr-1">Clinical Insight:</span>
            {step.tip}
          </div>

          {/* Progress Indicators & Action Buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]">
            {/* Step Dots */}
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentStep
                      ? "w-5 bg-[var(--primary)]"
                      : "w-2 bg-[var(--line)] hover:bg-[var(--ink-soft)]"
                  }`}
                  aria-label={`Go to step ${idx + 1}`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePrev}
                  className="border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)] hover:bg-[var(--surface)] transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                  Back
                </Button>
              )}

              <Button
                size="sm"
                variant="default"
                onClick={handleNext}
                className="bg-[var(--primary)] text-white hover:bg-[var(--primary-strong)] text-xs px-3.5 transition-all duration-150 hover:-translate-y-0.5 active:translate-y-0 shadow-xs cursor-pointer"
              >
                {currentStep === TOUR_STEPS.length - 1 ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Finish Tour
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
