import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ShieldCheck, Check, X, ShieldAlert, Sparkles } from "lucide-react"

interface RoleCheatSheetDialogProps {
  open: boolean
  onClose: () => void
}

interface RolePermission {
  role: string
  title: string
  purpose: string
  demographics: boolean
  conditions: boolean
  medications: boolean
  allergies: boolean
  labs: boolean
  claims: boolean
  portalConsent: boolean
  auditVerify: boolean
  badgeColor: string
}

const ROLES_MATRIX: RolePermission[] = [
  {
    role: "Doctor",
    title: "Dr. Anand Rao (EHR Chief)",
    purpose: "Treatment (Full clinical care & cross-system reconciliation)",
    demographics: true,
    conditions: true,
    medications: true,
    allergies: true,
    labs: true,
    claims: false,
    portalConsent: false,
    auditVerify: false,
    badgeColor: "bg-[var(--tint-teal)] text-[var(--primary)] border-[var(--primary)]/40",
  },
  {
    role: "Nurse",
    title: "Staff Nurse Priya",
    purpose: "Treatment (Inpatient care & medication monitoring)",
    demographics: true,
    conditions: true,
    medications: true,
    allergies: true,
    labs: true,
    claims: false,
    portalConsent: false,
    auditVerify: false,
    badgeColor: "bg-[var(--tint-teal)] text-[var(--primary-strong)] border-[var(--primary)]/40",
  },
  {
    role: "Pharmacist",
    title: "Pharm. Vikram Seth",
    purpose: "Treatment (Dispensing safety & drug-allergy conflict check)",
    demographics: true,
    conditions: false,
    medications: true,
    allergies: true,
    labs: false,
    claims: false,
    portalConsent: false,
    auditVerify: false,
    badgeColor: "bg-[var(--source-pharmacy)]/15 text-[var(--source-pharmacy)] border-[var(--source-pharmacy)]/40",
  },
  {
    role: "Billing",
    title: "Suresh Menon",
    purpose: "Payment (Insurance claim adjudication & settlement)",
    demographics: true,
    conditions: false,
    medications: false,
    allergies: false,
    labs: false,
    claims: true,
    portalConsent: false,
    auditVerify: false,
    badgeColor: "bg-[var(--source-claims)]/15 text-[var(--source-claims)] border-[var(--source-claims)]/40",
  },
  {
    role: "Patient",
    title: "Ramesh Kumar (Data Principal)",
    purpose: "Self-service health data access & consent directive control",
    demographics: true,
    conditions: true,
    medications: true,
    allergies: true,
    labs: true,
    claims: true,
    portalConsent: true,
    auditVerify: false,
    badgeColor: "bg-[var(--ok)]/15 text-[var(--ok)] border-[var(--ok)]/40",
  },
  {
    role: "Admin",
    title: "Neha Sharma (SysAdmin)",
    purpose: "Platform operations, dataset ingestion, and audit verification",
    demographics: true,
    conditions: false,
    medications: false,
    allergies: false,
    labs: false,
    claims: false,
    portalConsent: false,
    auditVerify: true,
    badgeColor: "bg-[var(--ink)]/10 text-[var(--ink)] border-[var(--ink)]/30",
  },
]

export function RoleCheatSheetDialog({ open, onClose }: RoleCheatSheetDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-4xl border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] p-6 shadow-xl antialiased">
        <DialogHeader className="border-b border-[var(--line)] pb-4">
          <div className="flex items-center gap-2 text-[var(--teal)]">
            <ShieldCheck className="h-5 w-5" />
            <DialogTitle className="font-serif text-lg font-semibold tracking-tight text-[var(--ink)]">
              Role-Based Access Control (RBAC) Cheat-Sheet
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-[var(--ink-soft)] mt-1">
            CareLens enforces zero-trust default-deny access. Each clinical read requires active patient consent and a legally defined purpose (Treatment vs. Payment).
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto my-3 max-h-[60vh]">
          <table className="w-full text-left text-xs border border-[var(--line)] rounded-[8px] overflow-hidden">
            <thead className="bg-[var(--paper)] text-[11px] font-mono uppercase tracking-wider text-[var(--ink-soft)] border-b border-[var(--line)]">
              <tr>
                <th className="py-2.5 px-3">Role & User</th>
                <th className="py-2.5 px-2 text-center">Cond.</th>
                <th className="py-2.5 px-2 text-center">Meds</th>
                <th className="py-2.5 px-2 text-center">Allergies</th>
                <th className="py-2.5 px-2 text-center">Labs</th>
                <th className="py-2.5 px-2 text-center">Claims</th>
                <th className="py-2.5 px-2 text-center">Consent</th>
                <th className="py-2.5 px-2 text-center">Audit</th>
                <th className="py-2.5 px-3">Declared Purpose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)] font-sans">
              {ROLES_MATRIX.map((r) => (
                <tr key={r.role} className="hover:bg-[var(--paper)]/60 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-[4px] border font-mono text-[10px] font-semibold uppercase ${r.badgeColor}`}>
                        {r.role}
                      </span>
                      <span className="font-serif text-xs font-medium text-[var(--ink)]">
                        {r.title}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {r.conditions ? (
                      <Check className="h-4 w-4 text-[var(--ok)] mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-[var(--ink-soft)]/40 mx-auto" />
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {r.medications ? (
                      <Check className="h-4 w-4 text-[var(--ok)] mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-[var(--ink-soft)]/40 mx-auto" />
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {r.allergies ? (
                      <Check className="h-4 w-4 text-[var(--ok)] mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-[var(--ink-soft)]/40 mx-auto" />
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {r.labs ? (
                      <Check className="h-4 w-4 text-[var(--ok)] mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-[var(--ink-soft)]/40 mx-auto" />
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {r.claims ? (
                      <Check className="h-4 w-4 text-[var(--ok)] mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-[var(--ink-soft)]/40 mx-auto" />
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {r.portalConsent ? (
                      <Sparkles className="h-4 w-4 text-[var(--primary)] mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-[var(--ink-soft)]/40 mx-auto" />
                    )}
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    {r.auditVerify ? (
                      <ShieldAlert className="h-4 w-4 text-[var(--teal)] mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-[var(--ink-soft)]/40 mx-auto" />
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-[var(--ink-soft)]">
                    {r.purpose}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[var(--line)] text-xs text-[var(--ink-soft)]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--ink)]">Policy rule:</span>
            <span>Fields marked restricted render hatched redaction bars with visible reasons.</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-[6px] border border-[var(--line)] bg-[var(--paper)] px-3 py-1 font-sans text-xs text-[var(--ink)] hover:bg-[var(--surface)] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
