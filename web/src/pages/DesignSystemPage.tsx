import * as React from "react"
import {
  Filter,
  Info,
  Layers,
  Lock,
  Moon,
  RefreshCw,
  ShieldAlert,
  Sun,
  HelpCircle,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { Redacted } from "@/components/clinical/Redacted"
import { MatchBadge } from "@/components/clinical/MatchBadge"
import { SourceBadge } from "@/components/clinical/SourceBadge"
import { ProvChip } from "@/components/clinical/ProvChip"
import { HashChip } from "@/components/clinical/HashChip"
import { EmptyState } from "@/components/clinical/EmptyState"
import { SkeletonCard } from "@/components/clinical/SkeletonCard"

export default function DesignSystemPage() {
  const [isDark, setIsDark] = React.useState(() => {
    return document.documentElement.classList.contains("dark")
  })

  // Simulated viewer role for Redaction sweep demonstration
  const [currentRole, setCurrentRole] = React.useState<"doctor" | "pharmacist" | "billing">("billing")
  const [isSheetOpen, setIsSheetOpen] = React.useState(false)

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev
      if (next) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
      return next
    })
  }

  // Realistic clinical sample ledger data
  const auditEntries = [
    {
      id: "1",
      ts: "2026-10-11T09:14:22Z",
      actor: "dr.rao",
      role: "doctor",
      action: "read.clinical_summary",
      decision: "ALLOW",
      reason: "Active consent #CS-8812 (Treatment)",
      hash: "a3f81e09c84e1b42",
      prevHash: "7b21cd09fa12e431",
    },
    {
      id: "2",
      ts: "2026-10-11T09:18:05Z",
      actor: "pharm.imran",
      role: "pharmacist",
      action: "read.medications",
      decision: "ALLOW",
      reason: "Active consent #CS-8813 (Dispensing)",
      hash: "7c92b04f32a819c4",
      prevHash: "a3f81e09c84e1b42",
    },
    {
      id: "3",
      ts: "2026-10-11T09:22:40Z",
      actor: "billing.sunil",
      role: "billing",
      action: "read.clinical_diagnoses",
      decision: "DENY",
      reason: "Hidden for Billing - consent required",
      hash: "e109d43ac7194f2b",
      prevHash: "7c92b04f32a819c4",
    },
    {
      id: "4",
      ts: "2026-10-11T09:25:12Z",
      actor: "billing.sunil",
      role: "billing",
      action: "read.claims",
      decision: "ALLOW",
      reason: "Active consent #CS-8815 (Payment)",
      hash: "f429ac17804ee91d",
      prevHash: "e109d43ac7194f2b",
    },
  ]

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)] transition-colors duration-150 pb-20 selection:bg-[var(--teal)]/20 selection:text-[var(--teal)]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur-xs px-6 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-serif text-2xl font-semibold tracking-tight text-[var(--teal)]">
              CareLens
            </span>
            <span className="rounded-[4px] border border-[var(--line)] bg-[var(--paper)] px-2 py-0.5 font-mono text-[11px] font-medium tracking-wider text-[var(--ink-soft)] uppercase">
              Clinical Editorial System
            </span>
            <span className="text-xs text-[var(--ink-soft)] hidden md:inline">
              /design route
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <Button
              id="theme-toggle-btn"
              variant="outline"
              size="sm"
              onClick={toggleTheme}
              className="gap-2 border-[var(--line)] text-xs text-[var(--ink)]"
              aria-label="Toggle theme mode"
            >
              {isDark ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-[var(--teal)]" strokeWidth={1.75} />
                  <span>Light Theme</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-[var(--teal)]" strokeWidth={1.75} />
                  <span>Dark Theme</span>
                </>
              )}
            </Button>

            {/* Link back to home */}
            <a
              href="/"
              className="rounded-[6px] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 text-xs text-[var(--ink-soft)] hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teal)]"
            >
              Back to Root
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-6 pt-8 space-y-10">
        {/* Intro Banner */}
        <section className="space-y-2 border-b border-[var(--line)] pb-6">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-[var(--teal)] font-semibold">
              Design System Spec
            </span>
            <span className="text-[var(--line)]">·</span>
            <span className="text-xs text-[var(--ink-soft)]">
              4px grid · hairline borders · no gradients · Newsreader / Instrument Sans / IBM Plex Mono
            </span>
          </div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-[var(--ink)] sm:text-4xl">
            Clinical Editorial Component Specimen
          </h1>
          <p className="max-w-3xl text-sm leading-relaxed text-[var(--ink-soft)]">
            A calm, paper-like medical chart. Ingesting records across EHR, lab, pharmacy, and insurer
            systems without national ID dependencies. Self-hosted fonts, role-based redactions with
            sweep animations, and tamper-evident ledger primitives.
          </p>
        </section>

        {/* 1. Signature Clinical Pieces */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
            <div>
              <h2 className="font-serif text-xl font-medium text-[var(--ink)]">
                1. Signature Clinical Pieces
              </h2>
              <p className="text-xs text-[var(--ink-soft)]">
                Redacted with tooltip and 220ms sweep, MatchBadge, SourceBadge, ProvChip, HashChip.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Redacted & Role Switcher */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-[var(--teal)]" strokeWidth={1.5} />
                    <CardTitle className="text-base">Role-Based Redaction & Sweep Animation</CardTitle>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-1 text-xs">
                    <span className="text-[11px] font-mono text-[var(--ink-soft)] px-1">Viewing as:</span>
                    <button
                      onClick={() => setCurrentRole("doctor")}
                      className={`px-2 py-0.5 rounded-[4px] text-xs font-medium cursor-pointer transition-colors ${
                        currentRole === "doctor"
                          ? "bg-[var(--surface)] text-[var(--teal)] border border-[var(--line)]"
                          : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
                      }`}
                    >
                      Doctor
                    </button>
                    <button
                      onClick={() => setCurrentRole("pharmacist")}
                      className={`px-2 py-0.5 rounded-[4px] text-xs font-medium cursor-pointer transition-colors ${
                        currentRole === "pharmacist"
                          ? "bg-[var(--surface)] text-[var(--teal)] border border-[var(--line)]"
                          : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
                      }`}
                    >
                      Pharmacist
                    </button>
                    <button
                      onClick={() => setCurrentRole("billing")}
                      className={`px-2 py-0.5 rounded-[4px] text-xs font-medium cursor-pointer transition-colors ${
                        currentRole === "billing"
                          ? "bg-[var(--surface)] text-[var(--vermilion)] border border-[var(--line)] font-semibold"
                          : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
                      }`}
                    >
                      Billing
                    </button>
                  </div>
                </div>
                <CardDescription>
                  Switching to Billing role sweeps in diagonal-hatched ink bars over 220ms. Hover or focus the bar to inspect the redaction policy tooltip.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-4 space-y-3 font-sans text-xs">
                  <div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
                    <span className="font-serif text-sm font-medium text-[var(--ink)]">
                      Patient Clinical Chart: Ramesh Kumar (DOB: 1968-03-14)
                    </span>
                    <Badge variant="secondary" className="font-mono text-[11px]">CLID: CL-570001-901</Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[11px] font-mono text-[var(--ink-soft)] block uppercase">Primary Condition</span>
                      <div className="font-medium text-[var(--ink)]">
                        <Redacted
                          redacted={currentRole === "billing"}
                          reason="Hidden for Billing - consent required"
                          width="w-36"
                        >
                          Type 2 Diabetes Mellitus
                        </Redacted>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-mono text-[var(--ink-soft)] block uppercase">Comorbidity</span>
                      <div className="font-medium text-[var(--ink)]">
                        <Redacted
                          redacted={currentRole === "billing"}
                          reason="Hidden for Billing - consent required"
                          width="w-28"
                        >
                          Essential Hypertension
                        </Redacted>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-mono text-[var(--ink-soft)] block uppercase">Critical Allergy</span>
                      <div className="font-medium text-[var(--vermilion)]">
                        <Redacted
                          redacted={currentRole === "billing"}
                          reason="Hidden for Billing - consent required"
                          width="w-32"
                        >
                          Penicillin (Anaphylaxis Risk)
                        </Redacted>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-mono text-[var(--ink-soft)] block uppercase">Insurance Claim Item</span>
                      <div className="font-medium text-[var(--ink)]">
                        <span>OPD Consultation Claim · ₹1,200 (Approved)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-[var(--ink-soft)]">
                  <Info className="h-3.5 w-3.5 text-[var(--teal)] shrink-0" />
                  <span>
                    Current Role Status:{" "}
                    <strong className="text-[var(--ink)]">
                      {currentRole === "billing"
                        ? "Clinical diagnoses and allergies redacted (Default Deny policy applied)"
                        : "Full clinical access permitted under Treatment consent"}
                    </strong>
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* MatchBadge Specimen */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">MatchBadge</CardTitle>
                <CardDescription>
                  Multi-source identity resolution score with source-colour dots.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <MatchBadge
                    systems={["ehr", "lab", "pharmacy", "claims"]}
                    confidence={96}
                  />
                  <p className="mt-1 text-[11px] text-[var(--ink-soft)]">
                    4 sources linked (Hero patient auto-link score ≥ 0.90)
                  </p>
                </div>

                <div>
                  <MatchBadge
                    systems={["ehr", "lab", "pharmacy"]}
                    confidence={88}
                  />
                  <p className="mt-1 text-[11px] text-[var(--ink-soft)]">
                    3 sources linked · ReviewItem threshold (0.70 - 0.89)
                  </p>
                </div>

                <div>
                  <MatchBadge
                    systems={["ehr", "claims"]}
                    confidence={64}
                  />
                  <p className="mt-1 text-[11px] text-[var(--ink-soft)]">
                    2 sources · Unlinked pair below threshold
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* SourceBadges */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">SourceBadges</CardTitle>
                <CardDescription>
                  Strict tokens for the 4 medical data sources.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <SourceBadge source="ehr" />
                  <SourceBadge source="lab" />
                  <SourceBadge source="pharmacy" />
                  <SourceBadge source="claims" />
                </div>
                <div className="text-[11px] text-[var(--ink-soft)] leading-relaxed space-y-1 font-mono">
                  <div>EHR: #2B6CB0 / #6EA8E6</div>
                  <div>Lab: #4F7F3A / #8DBB6E</div>
                  <div>Pharmacy: #C07A1F / #E3A24A</div>
                  <div>Claims: #8C5B45 / #C99278</div>
                </div>
              </CardContent>
            </Card>

            {/* ProvChip */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">ProvChip</CardTitle>
                <CardDescription>
                  Provenance source and ISO timestamp on clinical facts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                <div>
                  <ProvChip
                    source="ehr"
                    sourceRecordId="APL-004512"
                    timestamp="2026-09-14T11:30:00Z"
                  />
                </div>
                <div>
                  <ProvChip
                    source="lab"
                    sourceRecordId="LB-77120"
                    timestamp="2026-09-14T08:15:00Z"
                  />
                </div>
                <div>
                  <ProvChip
                    source="pharmacy"
                    sourceRecordId="PH-30991"
                    timestamp="2026-09-18T16:45:00Z"
                  />
                </div>
                <div>
                  <ProvChip
                    source="claims"
                    sourceRecordId="STAR-48221"
                    timestamp="2026-09-24T10:00:00Z"
                  />
                </div>
              </CardContent>
            </Card>

            {/* HashChip */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">HashChip</CardTitle>
                <CardDescription>
                  8-character mono tabular ledger chip with click-to-copy.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <HashChip hash="a3f81e09c84e1b42" />
                  <HashChip hash="7c92b04f32a819c4" />
                  <HashChip hash="e109d43ac7194f2b" />
                </div>
                <p className="text-xs text-[var(--ink-soft)]">
                  Click any chip to copy the full SHA-256 hash to your clipboard.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 2. shadcn Core Primitives Rethemed */}
        <section className="space-y-4">
          <div className="border-b border-[var(--line)] pb-2">
            <h2 className="font-serif text-xl font-medium text-[var(--ink)]">
              2. Core Controls & Navigation (Rethemed)
            </h2>
            <p className="text-xs text-[var(--ink-soft)]">
              Button, Input, Badge, Tabs, Popover, Sheet, Tooltip. No default shadcn zinc. Hairline borders and visible teal focus rings.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Buttons */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Buttons & Visible Focus</CardTitle>
                <CardDescription>
                  Radius 6px, hairline borders, no shadows or gradients. Strict teal/vermilion/line tokens.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <Button variant="default">Primary Teal</Button>
                  <Button variant="secondary">Secondary Surface</Button>
                  <Button variant="outline">Outline Hairline</Button>
                  <Button variant="clinical">Clinical Code</Button>
                  <Button variant="destructive">Alert Vermilion</Button>
                  <Button variant="ghost">Ghost Action</Button>
                  <Button variant="link">Inline Link</Button>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[var(--line)]">
                  <Button size="sm">Small (h-7)</Button>
                  <Button size="default">Default (h-8.5)</Button>
                  <Button size="lg">Large (h-10)</Button>
                  <Button size="icon" aria-label="Refresh icon button">
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                  <Button disabled>Disabled State</Button>
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between py-3">
                <span className="text-xs text-[var(--ink-soft)]">
                  Focus rings are 2px Teal outline with offset for high accessibility.
                </span>
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1 text-xs">
                        <HelpCircle className="h-3.5 w-3.5 text-[var(--teal)]" />
                        <span>Tooltip Preview</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Clinical Editorial: Tooltips render on surface with hairline border
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardFooter>
            </Card>

            {/* Inputs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Inputs & Search</CardTitle>
                <CardDescription>
                  Calm input styling with visible focus ring.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="patient-search-input" className="text-[11px] font-mono text-[var(--ink-soft)] uppercase">
                    Patient Search Query
                  </label>
                  <Input
                    id="patient-search-input"
                    placeholder="Search by name or fake phone (e.g. 90000 12345)..."
                    defaultValue="Ramesh Kumar"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="loinc-input" className="text-[11px] font-mono text-[var(--ink-soft)] uppercase">
                    LOINC Code Input (Disabled)
                  </label>
                  <Input
                    id="loinc-input"
                    disabled
                    value="4548-4 (Hemoglobin A1c)"
                  />
                </div>
              </CardContent>
              <CardFooter className="py-2.5">
                <span className="font-mono text-[11px] text-[var(--ink-soft)]">
                  Status: Normalized LOINC 4548-4 verified
                </span>
              </CardFooter>
            </Card>
          </div>

          {/* Tabs & Popover & Sheet Showcase */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Tabs, Popover & Sheet Drawer</CardTitle>
                <div className="flex items-center gap-2">
                  {/* Popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                        <Filter className="h-3 w-3 text-[var(--teal)]" />
                        <span>Filter Sources</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-64 space-y-2">
                      <div className="font-serif text-sm font-medium text-[var(--ink)]">
                        Select Ingestion Sources
                      </div>
                      <p className="text-xs text-[var(--ink-soft)]">
                        Filter clinical facts by recording origin system:
                      </p>
                      <div className="space-y-1.5 pt-1 text-xs">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked className="rounded-[3px] accent-[var(--teal)]" />
                          <span>EHR (Apollo Multi-Specialty)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked className="rounded-[3px] accent-[var(--teal)]" />
                          <span>Lab A & B (Biomarker Panels)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" defaultChecked className="rounded-[3px] accent-[var(--teal)]" />
                          <span>Pharmacy (Dispensations)</span>
                        </label>
                      </div>
                    </PopoverContent>
                  </Popover>

                  {/* Sheet Drawer Trigger (380px drawer per design spec) */}
                  <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild>
                      <Button variant="default" size="sm" className="gap-1.5 text-xs">
                        <Layers className="h-3 w-3" />
                        <span>Open 380px Drawer</span>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right">
                      <SheetHeader>
                        <SheetTitle>Provenance Inspector</SheetTitle>
                        <SheetDescription>
                          Granular source linkage details and field-level evidence for Master Patient CL-570001-901.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="py-4 space-y-4 text-xs">
                        <div className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] text-[var(--ink-soft)] uppercase">Link Score</span>
                            <span className="font-mono font-semibold text-[var(--teal)]">0.96 (Auto-link)</span>
                          </div>
                          <div className="space-y-1 text-[11px] font-mono text-[var(--ink-soft)]">
                            <div>Name match: 0.35 / 0.35 (Token set ratio)</div>
                            <div>DOB match: 0.25 / 0.25 (1968-03-14)</div>
                            <div>Phone match: 0.20 / 0.20 (90000 12345)</div>
                            <div>Pincode: 0.10 / 0.10 (Mysuru 570001)</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <span className="font-mono text-[11px] text-[var(--ink-soft)] uppercase block">
                            Linked System IDs
                          </span>
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
                              <SourceBadge source="ehr" />
                              <span className="font-mono text-xs">APL-004512</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
                              <SourceBadge source="lab" />
                              <span className="font-mono text-xs">LB-77120 / TX-9981</span>
                            </div>
                            <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
                              <SourceBadge source="pharmacy" />
                              <span className="font-mono text-xs">PH-30991</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <SourceBadge source="claims" />
                              <span className="font-mono text-xs">STAR-48221</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="observations">
                <TabsList>
                  <TabsTrigger value="observations">Observations & Labs</TabsTrigger>
                  <TabsTrigger value="medications">Medications</TabsTrigger>
                  <TabsTrigger value="allergies">Allergies</TabsTrigger>
                  <TabsTrigger value="consents">Active Consents</TabsTrigger>
                </TabsList>

                <TabsContent value="observations" className="pt-2">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-[var(--ink-soft)] uppercase">HbA1c (LOINC 4548-4)</span>
                        <SourceBadge source="lab" />
                      </div>
                      <div className="font-mono text-xl font-medium tabular-nums text-[var(--vermilion)]">
                        7.9 %
                      </div>
                      <div className="text-[11px] text-[var(--ink-soft)]">
                        Normalized from 63 mmol/mol (Lab B) · Previous: 8.4%
                      </div>
                    </div>

                    <div className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-[var(--ink-soft)] uppercase">Fasting Glucose (LOINC 1558-6)</span>
                        <SourceBadge source="lab" />
                      </div>
                      <div className="font-mono text-xl font-medium tabular-nums text-[var(--ink)]">
                        134 mg/dL
                      </div>
                      <div className="text-[11px] text-[var(--ink-soft)]">
                        Lab A (June 2026) · Target &lt; 100 mg/dL
                      </div>
                    </div>

                    <div className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-mono text-[var(--ink-soft)] uppercase">Total Cholesterol</span>
                        <SourceBadge source="lab" />
                      </div>
                      <div className="font-mono text-xl font-medium tabular-nums text-[var(--ink)]">
                        188 mg/dL
                      </div>
                      <div className="text-[11px] text-[var(--ink-soft)]">
                        Lipid Panel (14 Sep 2026) · Normal range
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="medications" className="pt-2">
                  <div className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
                      <span className="font-medium text-[var(--ink)]">Glycomet 500 (Metformin hydrochloride)</span>
                      <ProvChip source="pharmacy" sourceRecordId="PH-30991" timestamp="2026-06-12T00:00:00Z" />
                    </div>
                    <div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
                      <span className="font-medium text-[var(--ink)]">Telma 40 (Telmisartan)</span>
                      <ProvChip source="ehr" sourceRecordId="APL-004512" timestamp="2026-08-01T00:00:00Z" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--vermilion)]">Mox 500 (Amoxicillin) — Allergy Conflict</span>
                      <Badge variant="destructive">Conflict Flagged</Badge>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="allergies" className="pt-2">
                  <div className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-4 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-[var(--vermilion)]" />
                      <span className="font-semibold text-[var(--vermilion)]">Penicillin Class Allergy</span>
                    </div>
                    <p className="text-[var(--ink-soft)]">
                      Recorded at Apollo Hospital EHR. Mox 500 dispensation from pharmacy flagged as contraindication.
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="consents" className="pt-2">
                  <div className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] p-4 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
                      <span>Clinicians Group (Treatment)</span>
                      <Badge variant="ok">Active · Valid 30 days</Badge>
                    </div>
                    <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5">
                      <span>Pharmacy Group (Dispensing)</span>
                      <Badge variant="ok">Active · Valid 30 days</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Billing & Insurer (Payment)</span>
                      <Badge variant="ok">Demographics Min + Claims only</Badge>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </section>

        {/* 3. Tamper-Evident Ledger Table */}
        <section className="space-y-4">
          <div className="border-b border-[var(--line)] pb-2">
            <h2 className="font-serif text-xl font-medium text-[var(--ink)]">
              3. Tamper-Evident Audit Ledger (Table)
            </h2>
            <p className="text-xs text-[var(--ink-soft)]">
              Dense clinical table with mono rows, 8-character HashChips, AA contrast, and hairline borders.
            </p>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Hash</TableHead>
                <TableHead className="w-36">Timestamp</TableHead>
                <TableHead className="w-32">Actor</TableHead>
                <TableHead className="w-28">Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead className="w-24">Decision</TableHead>
                <TableHead>Policy Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditEntries.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <HashChip hash={row.hash} />
                  </TableCell>
                  <TableCell className="font-mono text-[11px] tabular-nums text-[var(--ink-soft)]">
                    {row.ts.replace("T", " ").replace("Z", "")}
                  </TableCell>
                  <TableCell className="font-mono text-xs font-medium text-[var(--ink)]">
                    {row.actor}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {row.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-[var(--ink)]">
                    {row.action}
                  </TableCell>
                  <TableCell>
                    {row.decision === "ALLOW" ? (
                      <Badge variant="ok">ALLOW</Badge>
                    ) : (
                      <Badge variant="destructive">DENY</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-[var(--ink-soft)]">
                    {row.reason}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        {/* 4. Empty State & Loading Skeleton */}
        <section className="space-y-4">
          <div className="border-b border-[var(--line)] pb-2">
            <h2 className="font-serif text-xl font-medium text-[var(--ink)]">
              4. Empty State & Skeleton Loading
            </h2>
            <p className="text-xs text-[var(--ink-soft)]">
              Calm pulse loading card and actionable empty state without emoji or blobs.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <SkeletonCard lines={3} />
            <EmptyState
              title="No Identity Discrepancies Pending"
              description="All 4 patient records have been auto-linked with confidence ≥ 0.90. No manual review items require clinician adjudication."
              action={{
                label: "Simulate New Ingestion",
                onClick: () => {},
              }}
            />
          </div>
        </section>
      </main>
    </div>
  )
}
