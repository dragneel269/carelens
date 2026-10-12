import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { PortalPage } from './PortalPage'
import { AuditPage } from './AuditPage'
import { useAuthStore, BADGES } from '../lib/auth'

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  )
}

const mockConsents = [
  {
    id: 1,
    clid: 'CL-000001',
    group: 'clinicians',
    categories: 'demographics_full,encounters,conditions,allergies,medications,labs',
    purpose: 'treatment',
    valid_to: '2026-11-10T00:00:00Z',
    status: 'active',
  },
  {
    id: 2,
    clid: 'CL-000001',
    group: 'pharmacy',
    categories: 'allergies,medications,demographics_min',
    purpose: 'treatment',
    valid_to: '2026-11-10T00:00:00Z',
    status: 'active',
  },
  {
    id: 3,
    clid: 'CL-000001',
    group: 'lab',
    categories: 'labs,demographics_min',
    purpose: 'treatment',
    valid_to: '2026-11-10T00:00:00Z',
    status: 'active',
  },
  {
    id: 4,
    clid: 'CL-000001',
    group: 'billing',
    categories: 'claims,demographics_min',
    purpose: 'payment',
    valid_to: '2026-11-10T00:00:00Z',
    status: 'active',
  },
]

const mockAuditEntries = [
  {
    id: 10,
    ts: '2026-10-12T14:30:00Z',
    actor: 'billing.sunil',
    role: 'billing',
    clid: 'CL-000001',
    action: 'read',
    categories: 'claims',
    decision: 'DENY',
    reason: "Denied: No active unexpired consent for group 'billing' and category 'claims'",
    prev_hash: 'abc12345',
    hash: 'def67890',
  },
  {
    id: 9,
    ts: '2026-10-12T14:20:00Z',
    actor: 'dr.rao',
    role: 'doctor',
    clid: 'CL-000001',
    action: 'read',
    categories: 'conditions',
    decision: 'ALLOW',
    reason: 'Access granted by active patient consent',
    prev_hash: '12345678',
    hash: 'abc12345',
  },
]

describe('PortalPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useAuthStore.getState().setToken('mock-patient-token', BADGES[6]) // ramesh (patient)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders consent toggles by group (clinicians, pharmacy, lab, billing) and category', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('/consents')) {
        return { ok: true, json: async () => mockConsents } as Response
      }
      if (u.includes('/audit')) {
        return { ok: true, json: async () => mockAuditEntries } as Response
      }
      return { ok: true, json: async () => [] } as Response
    })

    renderWithClient(<PortalPage />)

    await waitFor(() => {
      expect(screen.getByTestId('consent-card-clinicians')).toBeInTheDocument()
    })

    expect(screen.getByTestId('consent-card-pharmacy')).toBeInTheDocument()
    expect(screen.getByTestId('consent-card-lab')).toBeInTheDocument()
    expect(screen.getByTestId('consent-card-billing')).toBeInTheDocument()

    // Check category pills exist
    expect(screen.getByTestId('toggle-billing-claims')).toBeInTheDocument()
    expect(screen.getByTestId('revoke-all-button')).toBeInTheDocument()
  })

  it('allows revoking billing consent and triggers API call', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('/api/consents/4/revoke')) {
        return { ok: true, json: async () => ({ status: 'success' }) } as Response
      }
      if (u.includes('/consents')) {
        return { ok: true, json: async () => mockConsents } as Response
      }
      if (u.includes('/audit')) {
        return { ok: true, json: async () => mockAuditEntries } as Response
      }
      return { ok: true, json: async () => [] } as Response
    })

    renderWithClient(<PortalPage />)

    await waitFor(() => {
      expect(screen.getByTestId('btn-revoke-billing')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('btn-revoke-billing'))

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('/api/consents/4/revoke'),
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('renders access history table with outcome and denials visibly highlighted', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('/consents')) {
        return { ok: true, json: async () => mockConsents } as Response
      }
      if (u.includes('/audit')) {
        return { ok: true, json: async () => mockAuditEntries } as Response
      }
      return { ok: true, json: async () => [] } as Response
    })

    renderWithClient(<PortalPage />)

    await waitFor(() => {
      expect(screen.getByTestId('access-history-section')).toBeInTheDocument()
      expect(screen.getByTestId('outcome-10')).toBeInTheDocument()
    })

    // Check denial is displayed prominently
    expect(screen.getByTestId('outcome-10')).toHaveTextContent('DENIED')
    expect(screen.getByTestId('outcome-9')).toHaveTextContent('ALLOWED')
    expect(screen.getByText(/billing.sunil/i)).toBeInTheDocument()
    expect(screen.getByText(/Denied: No active unexpired consent/i)).toBeInTheDocument()
  })
})

describe('AuditPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useAuthStore.getState().setToken('mock-admin-token', BADGES[5]) // admin.neha (admin)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders ledger-style table with HashChip and Verify button showing ok status', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('/audit/verify')) {
        return {
          ok: true,
          json: async () => ({
            verified: true,
            count: 10,
            broken_at_id: null,
            message: 'All 10 audit entries successfully verified against genesis hash',
          }),
        } as Response
      }
      if (u.includes('/audit')) {
        return { ok: true, json: async () => mockAuditEntries } as Response
      }
      return { ok: true, json: async () => [] } as Response
    })

    renderWithClient(<AuditPage />)

    await waitFor(() => {
      expect(screen.getByTestId('verify-ledger-button')).toBeInTheDocument()
      expect(screen.getByTestId('verify-status-banner')).toHaveTextContent(/Chain Intact \(ok\)/i)
    })

    expect(screen.getByTestId('verification-message-box')).toHaveTextContent(/successfully validated.*\(ok\)/i)

    // Check ledger table rows
    expect(screen.getByTestId('ledger-row-10')).toBeInTheDocument()
    expect(screen.getByTestId('ledger-row-9')).toBeInTheDocument()
  })
})
