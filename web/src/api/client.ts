import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore, DEMO_PASSWORD } from '../lib/auth'
import type { SystemSource } from '../components/clinical/MatchBadge'

export interface RestrictedMarker {
  restricted: true
  reason: string
}

export function isRestricted(val: unknown): val is RestrictedMarker {
  return typeof val === 'object' && val !== null && (val as Record<string, unknown>).restricted === true
}

export interface PatientSearchHit {
  clid: string
  name: string
  gender?: string
  dob?: string | RestrictedMarker
  phone?: string | RestrictedMarker
  pincode?: string | RestrictedMarker
  city?: string | RestrictedMarker
  linked_systems: SystemSource[]
  best_score: number
}

export interface PatientSummaryData {
  clid: string
  patient: {
    clid: string
    name: string
    gender?: string
    dob?: string | RestrictedMarker
    phone?: string | RestrictedMarker
    pincode?: string | RestrictedMarker
    city?: string | RestrictedMarker
    state?: string | RestrictedMarker
    created_at?: string
  }
  linked_systems: SystemSource[]
  active_conditions: Array<{
    id: string | number
    display?: string
    condition_name?: string
    code?: string
    icd10_code?: string
    clinical_status?: string
    source: string
    source_record_id?: string
    recorded_at: string
  }> | RestrictedMarker
  current_medications: Array<{
    id?: number
    generic_name: string
    brand_name?: string
    dose?: string
    dosage?: string
    source?: string
    sources?: string[]
    source_record_id?: string
    recorded_at: string
    has_conflict: boolean
    conflict_type?: 'missing_from_ehr' | 'allergy_conflict' | 'dosage_mismatch' | string
    conflict_detail?: string
    ehr_prescribed?: boolean
    pharmacy_dispensed?: boolean
  }> | RestrictedMarker
  active_allergies: Array<{
    id: string | number
    substance: string
    reaction?: string
    criticality?: string
    allergy_class?: string
    severity?: string
    source: string
    source_record_id?: string
    recorded_at: string
  }> | RestrictedMarker
  allergies?: Array<{
    id: string | number
    substance: string
    reaction?: string
    criticality?: string
    allergy_class?: string
    severity?: string
    source: string
    source_record_id?: string
    recorded_at: string
  }> | RestrictedMarker
  lab_trends: Array<{
    test_name: string
    loinc_code?: string
    current_value?: number
    latest_value?: number
    unit?: string
    reference_range?: string
    flag?: string
    interpretation?: string
    latest_date?: string
    recorded_at?: string
    source?: string
    trend: Array<{
      value: number
      unit?: string
      date?: string
      recorded_at?: string
      flag?: string
      source: string
    }>
  }> | RestrictedMarker
  recent_encounters: Array<{
    id: string | number
    encounter_id?: string
    reason?: string
    encounter_type?: string
    department?: string
    facility?: string
    period_start?: string
    period_end?: string
    recorded_at?: string
    source: string
    source_record_id?: string
  }> | RestrictedMarker
  claims: Array<{
    id: string | number
    claim_id?: string
    claimed_amount?: number
    approved_amount?: number
    total_amount?: number
    currency?: string
    status: string
    category?: string
    description?: string
    service_date?: string
    recorded_at?: string
    insurer_name?: string
    source: string
  }> | RestrictedMarker
}

export interface TimelineItem {
  id: string
  type?: 'encounter' | 'condition' | 'allergy' | 'medication' | 'observation' | 'claim' | string
  item_type?: 'encounter' | 'condition' | 'allergy' | 'medication' | 'observation' | 'claim' | string
  category?: string
  title: string
  subtitle?: string
  date?: string
  recorded_at?: string
  source: SystemSource
  source_record_id: string
  data?: Record<string, unknown>
  details?: Record<string, unknown>
}

export interface IdentityLink {
  source: SystemSource
  source_record_id: string
  confidence_score: number
  evidence: Record<string, unknown>
  status: string
  created_at: string
}

export interface PatientIdentityData {
  clid: string
  golden_patient: {
    clid: string
    name: string
    dob?: string
    gender?: string
    phone?: string
    pincode?: string
    city?: string
    state?: string
    created_at?: string
  }
  provenance: Record<string, string>
  alternates: Record<string, Array<{ value: string; source: string; source_record_id: string }>>
  links: IdentityLink[]
}

export interface AuditEntryItem {
  id: number
  ts: string
  actor: string
  role: string
  clid: string
  action: string
  categories: string
  decision: string
  reason: string
  prev_hash: string
  hash: string
}

export interface ConsentItem {
  id: number
  clid: string
  group: string
  categories: string
  purpose: string
  valid_to: string
  status: string
}

/**
 * Standard typed API requester with Bearer token & automatic login retry.
 */
export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  let token = useAuthStore.getState().token

  // If no token, auto-login with current user
  if (!token) {
    const user = useAuthStore.getState().currentUser
    if (user) {
      try {
        const loginResp = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: user.username,
            password: DEMO_PASSWORD,
          }),
        })
        if (loginResp.ok) {
          const data = await loginResp.json()
          token = data.access_token
          useAuthStore.getState().setToken(token, user)
        }
      } catch {
        // Continue with unauthenticated request
      }
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorDetail = `Request failed: ${response.status}`
    try {
      const parsed = JSON.parse(errorText)
      if (parsed.detail) {
        errorDetail = typeof parsed.detail === 'string' ? parsed.detail : JSON.stringify(parsed.detail)
      }
    } catch {
      // Use fallback errorDetail
    }

    // Notify user with sonner toast on non-404 and non-403 unexpected errors (403 is in-band clinical policy denial)
    if (response.status !== 404 && response.status !== 403) {
      toast.error(errorDetail, {
        description: `${options.method || 'GET'} ${url}`,
      })
    }

    throw new Error(errorDetail)
  }

  return response.json()
}

// React Query Hooks

export function usePatientsSearch(query: string) {
  const token = useAuthStore((s) => s.token)
  const role = useAuthStore((s) => s.currentUser?.role)

  return useQuery<PatientSearchHit[]>({
    queryKey: ['patients-search', query, role, token],
    queryFn: () => apiRequest<PatientSearchHit[]>(`/api/patients?q=${encodeURIComponent(query)}`),
    staleTime: 10000,
  })
}

export function usePatientSummary(clid: string | undefined) {
  const token = useAuthStore((s) => s.token)
  const role = useAuthStore((s) => s.currentUser?.role)

  return useQuery<PatientSummaryData>({
    queryKey: ['patient-summary', clid, role, token],
    queryFn: () => apiRequest<PatientSummaryData>(`/api/patients/${clid}/summary`),
    enabled: Boolean(clid),
    staleTime: 5000,
  })
}

export function usePatientTimeline(
  clid: string | undefined,
  filters?: { types?: string[]; sources?: string[]; from?: string; to?: string }
) {
  const token = useAuthStore((s) => s.token)
  const role = useAuthStore((s) => s.currentUser?.role)

  const searchParams = new URLSearchParams()
  if (filters?.types?.length) searchParams.set('types', filters.types.join(','))
  if (filters?.sources?.length) searchParams.set('sources', filters.sources.join(','))
  if (filters?.from) searchParams.set('from_date', filters.from)
  if (filters?.to) searchParams.set('to_date', filters.to)

  const qs = searchParams.toString()

  return useQuery<{ clid: string; total_events: number; items: TimelineItem[] }>({
    queryKey: ['patient-timeline', clid, qs, role, token],
    queryFn: () =>
      apiRequest<{ clid: string; total_events: number; items: TimelineItem[] }>(
        `/api/patients/${clid}/timeline${qs ? `?${qs}` : ''}`
      ),
    enabled: Boolean(clid),
    staleTime: 5000,
  })
}

export function usePatientIdentity(clid: string | undefined) {
  const token = useAuthStore((s) => s.token)
  const role = useAuthStore((s) => s.currentUser?.role)

  return useQuery<PatientIdentityData>({
    queryKey: ['patient-identity', clid, role, token],
    queryFn: () => apiRequest<PatientIdentityData>(`/api/patients/${clid}/identity`),
    enabled: Boolean(clid),
    staleTime: 5000,
  })
}

export function usePatientUnified(clid: string | undefined) {
  const token = useAuthStore((s) => s.token)
  const role = useAuthStore((s) => s.currentUser?.role)

  return useQuery<Record<string, unknown>>({
    queryKey: ['patient-unified', clid, role, token],
    queryFn: () => apiRequest<Record<string, unknown>>(`/api/patients/${clid}/unified`),
    enabled: Boolean(clid),
    staleTime: 5000,
  })
}

export function useAuditEntries(limit: number = 50) {
  const token = useAuthStore((s) => s.token)
  const role = useAuthStore((s) => s.currentUser?.role)

  return useQuery<AuditEntryItem[]>({
    queryKey: ['audit-entries', limit, role, token],
    queryFn: () => apiRequest<AuditEntryItem[]>(`/api/audit?limit=${limit}`),
    enabled: !!token && (role === 'admin' || role === 'patient'),
    staleTime: 3000,
  })
}

export interface AuditVerifyResult {
  verified: boolean
  valid?: boolean
  count: number
  total_entries?: number
  broken_at_id?: number | null
  message: string
}

export function useAuditVerify() {
  const token = useAuthStore((s) => s.token)
  const role = useAuthStore((s) => s.currentUser?.role)

  return useQuery<AuditVerifyResult>({
    queryKey: ['audit-verify', role, token],
    queryFn: () => apiRequest<AuditVerifyResult>('/api/audit/verify'),
    enabled: !!token && role === 'admin',
    staleTime: 10000,
  })
}

export function useConsents() {
  const token = useAuthStore((s) => s.token)
  const role = useAuthStore((s) => s.currentUser?.role)

  return useQuery<ConsentItem[]>({
    queryKey: ['consents', role, token],
    queryFn: () => apiRequest<ConsentItem[]>('/api/consents'),
    enabled: !!token && (role === 'patient' || role === 'admin'),
    staleTime: 5000,
  })
}
