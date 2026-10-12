import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { PatientDetailPage } from './PatientDetailPage'
import { useAuthStore, BADGES } from '../lib/auth'

function renderPage(initialEntry = '/patient/CL-000001') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/patient/:id" element={<PatientDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const mockDoctorSummary = {
  clid: 'CL-000001',
  patient: {
    clid: 'CL-000001',
    name: 'Ramesh Kumar',
    gender: 'male',
    dob: '1968-03-14',
    phone: '90000 12345',
    city: 'Mysuru',
  },
  linked_systems: ['ehr', 'lab', 'pharmacy', 'claims'],
  active_conditions: [
    {
      id: 1,
      display: 'Type 2 Diabetes Mellitus',
      code: 'E11.9',
      source: 'ehr',
      recorded_at: '2026-06-10T10:00:00Z',
    },
  ],
  active_allergies: [
    {
      id: 1,
      substance: 'Penicillin',
      reaction: 'Anaphylaxis',
      criticality: 'High',
      source: 'ehr',
      recorded_at: '2026-06-10T10:00:00Z',
    },
  ],
  current_medications: [
    {
      generic_name: 'Metformin',
      brand_name: 'Glycomet 500',
      dosage: '500 mg',
      sources: ['ehr', 'pharmacy'],
      has_conflict: false,
      recorded_at: '2026-06-10T10:00:00Z',
    },
    {
      generic_name: 'Amoxicillin',
      brand_name: 'Mox 500',
      dosage: '500 mg',
      sources: ['pharmacy'],
      has_conflict: true,
      conflict_type: 'allergy_conflict',
      conflict_detail: 'ALLERGY CONFLICT: Dispensed despite documented penicillin allergy!',
      recorded_at: '2026-09-12T11:00:00Z',
    },
  ],
  lab_trends: [
    {
      test_name: 'HbA1c',
      loinc_code: '4548-4',
      current_value: 7.9,
      unit: '%',
      flag: 'HIGH',
      recorded_at: '2026-09-15T09:00:00Z',
      trend: [
        { value: 8.4, unit: '%', recorded_at: '2026-06-10T09:00:00Z', source: 'lab' },
        { value: 7.9, unit: '%', recorded_at: '2026-09-15T09:00:00Z', source: 'lab' },
      ],
    },
  ],
  claims: [
    {
      id: 'STAR-48221',
      claim_id: 'STAR-48221',
      claimed_amount: 14500,
      approved_amount: 14500,
      status: 'approved',
      category: 'Inpatient',
      recorded_at: '2026-07-01T12:00:00Z',
      source: 'claims',
    },
  ],
}

const mockPharmacistSummary = {
  ...mockDoctorSummary,
  patient: {
    clid: 'CL-000001',
    name: 'Ramesh Kumar',
    gender: 'male',
    dob: { restricted: true, reason: 'Hidden for Pharmacist' },
    phone: { restricted: true, reason: 'Hidden for Pharmacist' },
    city: { restricted: true, reason: 'Hidden for Pharmacist' },
  },
  active_conditions: { restricted: true, reason: 'Access restricted for role pharmacist' },
  lab_trends: { restricted: true, reason: 'Access restricted for role pharmacist' },
  claims: { restricted: true, reason: 'Access restricted for role pharmacist' },
}

const mockBillingSummary = {
  ...mockDoctorSummary,
  patient: {
    clid: 'CL-000001',
    name: 'Ramesh Kumar',
    gender: 'male',
    dob: { restricted: true, reason: 'Hidden for Billing' },
    phone: { restricted: true, reason: 'Hidden for Billing' },
    city: { restricted: true, reason: 'Hidden for Billing' },
  },
  active_conditions: { restricted: true, reason: 'Access restricted for role billing' },
  current_medications: { restricted: true, reason: 'Access restricted for role billing' },
  active_allergies: { restricted: true, reason: 'Access restricted for role billing' },
  lab_trends: { restricted: true, reason: 'Access restricted for role billing' },
}

const mockTimelineData = {
  clid: 'CL-000001',
  total: 2,
  items: [
    {
      id: 'med_1',
      item_type: 'medication',
      source: 'pharmacy',
      source_record_id: 'PH-30991',
      recorded_at: '2026-09-12T11:00:00Z',
      title: 'Mox 500 (500 mg)',
      subtitle: 'Generic: amoxicillin',
    },
    {
      id: 'obs_1',
      item_type: 'observation',
      source: 'lab',
      source_record_id: 'TX-9981',
      recorded_at: '2026-09-15T09:00:00Z',
      title: 'HbA1c: 7.9 %',
      subtitle: 'LOINC: 4548-4',
    },
  ],
}

const mockIdentityData = {
  clid: 'CL-000001',
  canonical_name: 'Ramesh Kumar',
  provenance: { name: 'ehr', dob: 'ehr' },
  alternates: {},
  links: [
    {
      source: 'ehr',
      source_record_id: 'APL-004512',
      confidence_score: 1.0,
      evidence: { match_type: 'seed_primary' },
      status: 'auto_linked',
      created_at: '2026-10-11T00:00:00Z',
    },
    {
      source: 'pharmacy',
      source_record_id: 'PH-30991',
      confidence_score: 0.96,
      evidence: {
        phone: { score: 0.2, value_a: '90000 12345' },
        dob: { score: 0.25 },
        name: { similarity: 0.96 },
      },
      status: 'auto_linked',
      created_at: '2026-10-11T00:00:00Z',
    },
  ],
}

describe('PatientDetailPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useAuthStore.getState().setToken('mock-token', BADGES[0]) // dr.rao (doctor)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders banner with serif 28px name, mono ID chips, consent pill, and hero role switcher', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('/summary')) {
        return { ok: true, json: async () => mockDoctorSummary } as Response
      }
      if (u.includes('/timeline')) {
        return { ok: true, json: async () => mockTimelineData } as Response
      }
      if (u.includes('/identity')) {
        return { ok: true, json: async () => mockIdentityData } as Response
      }
      return { ok: true, json: async () => [] } as Response
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Ramesh Kumar' })).toBeInTheDocument()
    })

    // Check heading styles (serif 28px)
    const heading = screen.getByRole('heading', { level: 1, name: 'Ramesh Kumar' })
    expect(heading.className).toContain('font-serif')
    expect(heading.className).toContain('text-[28px]')

    // ID chip
    expect(screen.getByText('CL-000001')).toBeInTheDocument()

    // Consent pill
    expect(screen.getByTestId('consent-pill')).toBeInTheDocument()
    expect(screen.getByText(/Consent: Treatment Active/i)).toBeInTheDocument()

    // Hero role switcher
    expect(screen.getByTestId('hero-role-switcher')).toBeInTheDocument()
    expect(screen.getByTestId('hero-role-select')).toBeInTheDocument()
  })

  it('renders Overview tab with cards for problems, medications with conflict, allergies, labs, claims with ProvChips for Doctor', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('/summary')) {
        return { ok: true, json: async () => mockDoctorSummary } as Response
      }
      if (u.includes('/timeline')) {
        return { ok: true, json: async () => mockTimelineData } as Response
      }
      if (u.includes('/identity')) {
        return { ok: true, json: async () => mockIdentityData } as Response
      }
      return { ok: true, json: async () => [] } as Response
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('card-problems')).toBeInTheDocument()
    })

    expect(screen.getByTestId('card-allergies')).toBeInTheDocument()
    expect(screen.getByTestId('card-medications')).toBeInTheDocument()
    expect(screen.getByTestId('card-labs')).toBeInTheDocument()
    expect(screen.getByTestId('card-claims')).toBeInTheDocument()

    // Check conflict warning
    expect(screen.getByTestId('conflict-warning')).toBeInTheDocument()
    expect(screen.getByText(/ALLERGY CONFLICT: Dispensed despite documented penicillin allergy!/i)).toBeInTheDocument()

    // Lab HbA1c value
    expect(screen.getByText('7.9')).toBeInTheDocument()
  })

  it('correctly differs in Pharmacist view: problems, labs, and claims are Redacted', async () => {
    useAuthStore.getState().setToken('mock-token', BADGES[2]) // pharm.imran (pharmacist)

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('/summary')) {
        return { ok: true, json: async () => mockPharmacistSummary } as Response
      }
      if (u.includes('/timeline')) {
        return { ok: true, json: async () => mockTimelineData } as Response
      }
      if (u.includes('/identity')) {
        return { ok: true, json: async () => mockIdentityData } as Response
      }
      return { ok: true, json: async () => [] } as Response
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('card-problems')).toBeInTheDocument()
    })

    // Problems are Redacted
    expect(screen.getByTestId('problems-redacted')).toBeInTheDocument()

    // Labs are Redacted
    expect(screen.getByTestId('labs-redacted')).toBeInTheDocument()

    // Claims are Redacted
    expect(screen.getByTestId('claims-redacted')).toBeInTheDocument()

    // Medications and Allergies are VISIBLE
    expect(screen.queryByTestId('medications-redacted')).not.toBeInTheDocument()
    expect(screen.queryByTestId('allergies-redacted')).not.toBeInTheDocument()
    expect(screen.getByText('Metformin')).toBeInTheDocument()
    expect(screen.getByText('Penicillin')).toBeInTheDocument()
  })

  it('correctly differs in Billing view: problems, meds, allergies, labs are Redacted, but claims are visible', async () => {
    useAuthStore.getState().setToken('mock-token', BADGES[4]) // billing.sunil (billing)

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('/summary')) {
        return { ok: true, json: async () => mockBillingSummary } as Response
      }
      if (u.includes('/timeline')) {
        return { ok: true, json: async () => mockTimelineData } as Response
      }
      if (u.includes('/identity')) {
        return { ok: true, json: async () => mockIdentityData } as Response
      }
      return { ok: true, json: async () => [] } as Response
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('card-claims')).toBeInTheDocument()
    })

    // Redacted cards
    expect(screen.getByTestId('problems-redacted')).toBeInTheDocument()
    expect(screen.getByTestId('allergies-redacted')).toBeInTheDocument()
    expect(screen.getByTestId('medications-redacted')).toBeInTheDocument()
    expect(screen.getByTestId('labs-redacted')).toBeInTheDocument()

    // Claims are VISIBLE
    expect(screen.queryByTestId('claims-redacted')).not.toBeInTheDocument()
    expect(screen.getByText('STAR-48221')).toBeInTheDocument()
  })

  it('renders Timeline tab with filtered list and chips', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('/summary')) {
        return { ok: true, json: async () => mockDoctorSummary } as Response
      }
      if (u.includes('/timeline')) {
        return { ok: true, json: async () => mockTimelineData } as Response
      }
      if (u.includes('/identity')) {
        return { ok: true, json: async () => mockIdentityData } as Response
      }
      return { ok: true, json: async () => [] } as Response
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('tab-timeline')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('tab-timeline'))

    await waitFor(() => {
      expect(screen.getByTestId('tab-timeline-content')).toBeInTheDocument()
    })

    expect(screen.getByTestId('filter-type-all')).toBeInTheDocument()
    expect(screen.getByTestId('filter-source-all')).toBeInTheDocument()
    expect(screen.getByText(/Longitudinal Timeline/i)).toBeInTheDocument()
  })

  it('renders Identity tab with Why linked line and mono confidence', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('/summary')) {
        return { ok: true, json: async () => mockDoctorSummary } as Response
      }
      if (u.includes('/timeline')) {
        return { ok: true, json: async () => mockTimelineData } as Response
      }
      if (u.includes('/identity')) {
        return { ok: true, json: async () => mockIdentityData } as Response
      }
      return { ok: true, json: async () => [] } as Response
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('tab-identity')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('tab-identity'))

    await waitFor(() => {
      expect(screen.getByTestId('tab-identity-content')).toBeInTheDocument()
    })

    expect(screen.getAllByText(/Why linked:/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/100.0%/i)).toBeInTheDocument()
    expect(screen.getByText(/96.0%/i)).toBeInTheDocument()
  })
})
