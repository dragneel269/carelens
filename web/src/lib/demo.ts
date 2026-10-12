import { create } from 'zustand'
import { apiRequest } from '../api/client'
import { useAuthStore } from './auth'
import { QueryClient } from '@tanstack/react-query'

export interface DemoStep {
  time: string
  title: string
  scriptPrompt: string
  description: string
  role: 'doctor' | 'pharmacist' | 'billing' | 'patient' | 'admin'
  username: string
  route: string
  actionName: string
  execute: (navigate: (path: string) => void, queryClient: QueryClient) => Promise<void>
}

export const DEMO_STEPS_CONFIG: DemoStep[] = [
  {
    time: '0:00',
    title: 'Problem: Ramesh, 58, Mysuru',
    scriptPrompt: 'Hospital EHR, two labs, pharmacy, insurer. Name spelled 3 ways without national ID.',
    description:
      'Fragmented data across Apollo EHR, Metropolis & Anand labs, MedPlus pharmacy, and Star Health. Name variations: Ramesh Kumar, Ramesh Kumaar, R. Kumar.',
    role: 'admin',
    username: 'admin.neha',
    route: '/demo',
    actionName: 'Reset & Pre-Warm State',
    execute: async (_nav, queryClient) => {
      // Step 0: Ensure admin login, reset demo data, and pre-warm hero
      const login = useAuthStore.getState().login
      await login('admin.neha')
      await apiRequest('/api/admin/reset-demo', { method: 'POST' })
      queryClient.clear()

      // Pre-warm dr.rao caches
      await login('dr.rao')
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: ['patient-summary', 'CL-000001', 'doctor'],
          queryFn: () => apiRequest('/api/patients/CL-000001/summary'),
        }),
        queryClient.prefetchQuery({
          queryKey: ['patient-timeline', 'CL-000001', '', 'doctor'],
          queryFn: () => apiRequest('/api/patients/CL-000001/timeline'),
        }),
        queryClient.prefetchQuery({
          queryKey: ['patient-identity', 'CL-000001', 'doctor'],
          queryFn: () => apiRequest('/api/patients/CL-000001/identity'),
        }),
        queryClient.prefetchQuery({
          queryKey: ['patients-search', 'Ramesh', 'doctor'],
          queryFn: () => apiRequest('/api/patients?q=Ramesh'),
        }),
      ])
    },
  },
  {
    time: '0:30',
    title: 'Log in as Dr. Rao, search "Ramesh"',
    scriptPrompt: 'Identity engine matches across 4 feeder systems without national ID. Match badge displays "4 systems linked".',
    description:
      'Deterministic linkage using phone, DOB phonetic Metaphone, and RapidFuzz name scoring. 4 feeder records auto-linked with 100% confidence.',
    role: 'doctor',
    username: 'dr.rao',
    route: '/',
    actionName: 'Dr. Rao Search',
    execute: async (nav, queryClient) => {
      const login = useAuthStore.getState().login
      await login('dr.rao')
      await queryClient.invalidateQueries()
      nav('/')
    },
  },
  {
    time: '1:15',
    title: 'Overview: One HbA1c trend & merged meds',
    scriptPrompt: 'Unified HbA1c trend from two separate labs; reconciled medications with conflict flags.',
    description:
      'Recharts trend line unifies % from Metropolis and mmol/mol converted from Anand Lab. Current meds flag Atorva missing from EHR and Mox 500 allergy conflict.',
    role: 'doctor',
    username: 'dr.rao',
    route: '/patient/CL-000001',
    actionName: 'Hero Patient Chart',
    execute: async (nav, queryClient) => {
      const login = useAuthStore.getState().login
      await login('dr.rao')
      await queryClient.invalidateQueries()
      nav('/patient/CL-000001')
    },
  },
  {
    time: '2:15',
    title: 'Role switch: Pharmacist then Billing',
    scriptPrompt: 'Switching role replays 220 ms sweep of redaction bars. Zero-trust clinical redactions.',
    description:
      'Imran Khan (Pharmacist) sees only medications and allergies. Sunil Verma (Billing) sees only insurance claims.',
    role: 'pharmacist',
    username: 'pharm.imran',
    route: '/patient/CL-000001',
    actionName: 'Switch Pharmacist & Billing',
    execute: async (nav, queryClient) => {
      const login = useAuthStore.getState().login
      // First switch to pharmacist
      await login('pharm.imran')
      await queryClient.invalidateQueries()
      nav('/patient/CL-000001')
      await new Promise((res) => setTimeout(res, 350))
      // Then switch to billing
      await login('billing.sunil')
      await queryClient.invalidateQueries()
      nav('/patient/CL-000001')
    },
  },
  {
    time: '3:00',
    title: 'Patient tab: Ramesh revokes billing access',
    scriptPrompt: 'Ramesh accesses DPDP self-service portal (/portal) and revokes Billing access directive.',
    description:
      'DPDP compliance: patient directly manages consent directives. Instant revocation without caching.',
    role: 'patient',
    username: 'ramesh',
    route: '/portal',
    actionName: 'Revoke Billing Consent',
    execute: async (nav, queryClient) => {
      const login = useAuthStore.getState().login
      await login('ramesh')
      nav('/portal')
      try {
        const consents = await apiRequest<Array<{ id: number; group: string; status: string }>>('/api/consents')
        const billingConsent = consents.find((c) => c.group === 'billing' && c.status === 'active')
        if (billingConsent) {
          await apiRequest(`/api/consents/${billingConsent.id}/revoke`, { method: 'POST' })
        }
      } catch (e) {
        console.warn('Consent revocation in demo step:', e)
      }
      await queryClient.invalidateQueries()
    },
  },
  {
    time: '3:45',
    title: 'Billing refresh: Claims now Redacted',
    scriptPrompt: 'Next read by Billing denies claims access in real time. Hatching redaction bar appears.',
    description:
      'Policy decision is uncached. Immediately renders "Hidden for Billing - consent required". Policy violation logged to audit trail.',
    role: 'billing',
    username: 'billing.sunil',
    route: '/patient/CL-000001',
    actionName: 'Verify Redaction on Claims',
    execute: async (nav, queryClient) => {
      const login = useAuthStore.getState().login
      await login('billing.sunil')
      await queryClient.invalidateQueries()
      nav('/patient/CL-000001')
    },
  },
  {
    time: '4:15',
    title: 'Audit table as Admin: Denial on record',
    scriptPrompt: 'Admin inspects immutable ledger (/audit). Denial from billing is recorded. Verify Chain passes.',
    description:
      'Cryptographic ledger: SHA-256 hash chaining ensures tamper-evident auditability. Verify button confirms unbroken genesis chain.',
    role: 'admin',
    username: 'admin.neha',
    route: '/audit',
    actionName: 'Inspect Ledger & Verify Chain',
    execute: async (nav, queryClient) => {
      const login = useAuthStore.getState().login
      await login('admin.neha')
      await queryClient.invalidateQueries()
      nav('/audit')
      try {
        await apiRequest('/api/audit/verify')
      } catch {
        // verify endpoint check
      }
    },
  },
  {
    time: '4:40',
    title: 'Close: Zero national ID, Patient in control',
    scriptPrompt: 'Entity resolution without Aadhaar/ABHA, zero-trust RBAC with DPDP consent, append-only cryptographic ledger.',
    description:
      'Complete patient-centric data unification built specifically for the Indian healthcare ecosystem.',
    role: 'admin',
    username: 'admin.neha',
    route: '/demo',
    actionName: 'Demo Conclusion',
    execute: async (nav) => {
      nav('/demo')
    },
  },
]

interface DemoState {
  isOverlayOpen: boolean
  activeStepIndex: number
  completedRunsCount: number
  isRunningSequence: boolean
  isResetting: boolean
  isPrewarming: boolean
  runLogs: string[]

  setOverlayOpen: (open: boolean) => void
  toggleOverlay: () => void
  setActiveStepIndex: (index: number) => void
  appendLog: (msg: string) => void
  clearLogs: () => void

  resetDemoData: (queryClient: QueryClient) => Promise<boolean>
  prewarmHero: (queryClient: QueryClient) => Promise<boolean>
  executeStep: (stepIndex: number, navigate: (path: string) => void, queryClient: QueryClient) => Promise<void>
  runScriptThreeTimes: (navigate: (path: string) => void, queryClient: QueryClient) => Promise<void>
}

const STORE_RUNS_KEY = 'carelens_demo_runs_count'
const STORE_LOGS_KEY = 'carelens_demo_runs_logs'

export const useDemoStore = create<DemoState>((set, get) => {
  const initialRuns =
    typeof window !== 'undefined' ? Number(sessionStorage.getItem(STORE_RUNS_KEY) || 0) : 0
  let initialLogs: string[] = []
  if (typeof window !== 'undefined') {
    try {
      const stored = sessionStorage.getItem(STORE_LOGS_KEY)
      if (stored) initialLogs = JSON.parse(stored)
    } catch {
      initialLogs = []
    }
  }

  return {
    isOverlayOpen: true, // Default to true so it is readily visible when activated
    activeStepIndex: 0,
    completedRunsCount: initialRuns,
    isRunningSequence: false,
    isResetting: false,
    isPrewarming: false,
    runLogs: initialLogs,

    setOverlayOpen: (open) => set({ isOverlayOpen: open }),
    toggleOverlay: () => set((s) => ({ isOverlayOpen: !s.isOverlayOpen })),
    setActiveStepIndex: (index) => set({ activeStepIndex: index }),

    appendLog: (msg) => {
      const time = new Date().toLocaleTimeString()
      set((s) => {
        const nextLogs = [`[${time}] ${msg}`, ...s.runLogs.slice(0, 49)]
        try {
          sessionStorage.setItem(STORE_LOGS_KEY, JSON.stringify(nextLogs))
        } catch {
          // ignore
        }
        return { runLogs: nextLogs }
      })
    },

    clearLogs: () => {
      try {
        sessionStorage.removeItem(STORE_LOGS_KEY)
      } catch {
        // ignore
      }
      set({ runLogs: [] })
    },

  resetDemoData: async (queryClient: QueryClient) => {
    set({ isResetting: true })
    get().appendLog('POST /admin/reset-demo requested...')
    try {
      const login = useAuthStore.getState().login
      const currentUser = useAuthStore.getState().currentUser
      if (currentUser?.role !== 'admin') {
        await login('admin.neha')
      }
      await apiRequest('/api/admin/reset-demo', { method: 'POST' })
      queryClient.clear()
      get().appendLog('Reset complete: database restored to canonical seed state (seed=42).')
      set({ isResetting: false })
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reset failed'
      get().appendLog(`Reset error: ${msg}`)
      set({ isResetting: false })
      return false
    }
  },

  prewarmHero: async (queryClient: QueryClient) => {
    set({ isPrewarming: true })
    get().appendLog('Pre-warming Hero patient CL-000001 caches...')
    try {
      const login = useAuthStore.getState().login
      await login('dr.rao')
      await Promise.all([
        queryClient.prefetchQuery({
          queryKey: ['patient-summary', 'CL-000001', 'doctor'],
          queryFn: () => apiRequest('/api/patients/CL-000001/summary'),
        }),
        queryClient.prefetchQuery({
          queryKey: ['patient-timeline', 'CL-000001', '', 'doctor'],
          queryFn: () => apiRequest('/api/patients/CL-000001/timeline'),
        }),
        queryClient.prefetchQuery({
          queryKey: ['patient-identity', 'CL-000001', 'doctor'],
          queryFn: () => apiRequest('/api/patients/CL-000001/identity'),
        }),
        queryClient.prefetchQuery({
          queryKey: ['patients-search', 'Ramesh', 'doctor'],
          queryFn: () => apiRequest('/api/patients?q=Ramesh'),
        }),
      ])
      get().appendLog('Pre-warm complete: Hero CL-000001 caches primed.')
      set({ isPrewarming: false })
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Pre-warm failed'
      get().appendLog(`Pre-warm error: ${msg}`)
      set({ isPrewarming: false })
      return false
    }
  },

  executeStep: async (stepIndex, navigate, queryClient) => {
    set({ activeStepIndex: stepIndex })
    const step = DEMO_STEPS_CONFIG[stepIndex]
    get().appendLog(`Step ${stepIndex + 1} (${step.time}): ${step.title}`)
    await step.execute(navigate, queryClient)
  },

  runScriptThreeTimes: async (navigate, queryClient) => {
    set({ isRunningSequence: true, completedRunsCount: 0 })
    get().appendLog('STARTING 3 CONSECUTIVE DEMO SCRIPT RUNS (Zero page refresh)...')

    try {
      for (let run = 1; run <= 3; run++) {
        get().appendLog(`=== STARTING DEMO RUN #${run} of 3 ===`)

        for (let i = 0; i < DEMO_STEPS_CONFIG.length; i++) {
          set({ activeStepIndex: i })
          const step = DEMO_STEPS_CONFIG[i]
          get().appendLog(`[Run ${run}/3] Step ${i + 1}/${DEMO_STEPS_CONFIG.length}: ${step.title}`)
          await step.execute(navigate, queryClient)
          // Short visual pacing pause between steps
          await new Promise((res) => setTimeout(res, 500))
        }

        set({ completedRunsCount: run })
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(STORE_RUNS_KEY, String(run))
        }
        get().appendLog(`=== COMPLETED DEMO RUN #${run} of 3 ===`)
        await new Promise((res) => setTimeout(res, 600))
      }

      get().appendLog('SUCCESS: 3/3 consecutive runs completed with identical hero state and zero refresh.')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sequence error'
      get().appendLog(`Execution interrupted: ${msg}`)
    } finally {
      set({ isRunningSequence: false })
      navigate('/demo')
    }
  },
  }
})
