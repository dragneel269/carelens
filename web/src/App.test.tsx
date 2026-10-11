import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import App from './App'
import { useAuthStore, BADGES } from './lib/auth'

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
      {ui}
    </QueryClientProvider>
  )
}

describe('App Component and Shell Layout', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    useAuthStore.getState().setToken('mock-test-token', BADGES[0])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders application header, brand title, and navigation links', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('/auth/login')) {
        return {
          ok: true,
          json: async () => ({ access_token: 'mock-token', role: 'doctor' }),
        } as Response
      }
      return {
        ok: true,
        json: async () => [],
      } as Response
    })

    renderWithClient(<App />)

    expect(screen.getByText('CareLens')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Patients/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Portal/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Audit Ledger/i })).toBeInTheDocument()
  })

  it('renders "Viewing as" role switcher with active badge', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response)

    renderWithClient(<App />)

    expect(screen.getByText(/Viewing as:/i)).toBeInTheDocument()
    expect(screen.getAllByText(/doctor/i).length).toBeGreaterThan(0)
  })

  it('renders the 280px patient search sidebar with hits', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('/auth/login')) {
        return {
          ok: true,
          json: async () => ({ access_token: 'mock-token', role: 'doctor' }),
        } as Response
      }
      if (u.includes('/patients')) {
        return {
          ok: true,
          json: async () => [
            {
              clid: 'CL-000001',
              name: 'Ramesh Kumar',
              gender: 'male',
              phone: '90000 12345',
              linked_systems: ['ehr', 'lab', 'pharmacy', 'claims'],
              best_score: 0.96,
            },
          ],
        } as Response
      }
      return {
        ok: true,
        json: async () => [],
      } as Response
    })

    renderWithClient(<App />)

    expect(screen.getByPlaceholderText(/Search name, phone, CLID/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getAllByText('Ramesh Kumar').length).toBeGreaterThan(0)
      expect(screen.getAllByText('CL-000001').length).toBeGreaterThan(0)
    })
  })
})
