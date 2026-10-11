import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import App from './App'

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

describe('App Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders application header and title', () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'ok',
        service: 'carelens-backend',
        version: '0.1.0',
        timestamp: '2026-10-11T08:00:00Z',
      }),
    } as Response)

    renderWithClient(<App />)
    expect(screen.getByText('CareLens')).toBeInTheDocument()
    expect(screen.getByText(/Platform Infrastructure & Unified Health Engine/i)).toBeInTheDocument()
  })

  it('renders backend health status when query succeeds', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'ok',
        service: 'carelens-backend',
        version: '0.1.0',
        timestamp: '2026-10-11T08:00:00Z',
      }),
    } as Response)

    renderWithClient(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('health-success')).toBeInTheDocument()
    })

    expect(screen.getByText('FastAPI Operational')).toBeInTheDocument()
    expect(screen.getByText('carelens-backend')).toBeInTheDocument()
  })

  it('renders error state when backend health check fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    renderWithClient(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('health-error')).toBeInTheDocument()
    })

    expect(screen.getByText('Backend Connection Failed')).toBeInTheDocument()
  })
})
