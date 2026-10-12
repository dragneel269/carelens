import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { DemoPage } from './DemoPage'
import { ScriptOverlay } from '../components/demo/ScriptOverlay'
import { useAuthStore, BADGES } from '../lib/auth'
import { useDemoStore, DEMO_STEPS_CONFIG } from '../lib/demo'

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
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('DemoPage and ScriptOverlay', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url) => {
      const u = String(url)
      if (u.includes('/admin/reset-demo')) {
        return { ok: true, json: async () => ({ status: 'demo_environment_reset' }) } as Response
      }
      if (u.includes('/patients')) {
        return { ok: true, json: async () => [] } as Response
      }
      if (u.includes('/auth/login')) {
        return {
          ok: true,
          json: async () => ({ access_token: 'fake-jwt', user: BADGES[5] }),
        } as Response
      }
      return { ok: true, json: async () => ({}) } as Response
    })

    useAuthStore.getState().setToken('test-token', BADGES.find((b) => b.role === 'admin') || BADGES[5])
    useDemoStore.setState({
      activeStepIndex: 0,
      completedRunsCount: 0,
      isRunningSequence: false,
      isOverlayOpen: true,
      runLogs: [],
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders demo header, reset button, and prewarm button', () => {
    renderWithClient(<DemoPage />)

    expect(screen.getByTestId('demo-header')).toBeInTheDocument()
    expect(screen.getByTestId('reset-demo-button')).toBeInTheDocument()
    expect(screen.getByTestId('prewarm-hero-button')).toBeInTheDocument()
    expect(screen.getByTestId('run-script-3x-button')).toBeInTheDocument()
    expect(screen.getByText(/Demo Script Automation/i)).toBeInTheDocument()
  })

  it('renders all 8 steps matching docs/demo-script.md in stepper', () => {
    renderWithClient(<DemoPage />)

    expect(DEMO_STEPS_CONFIG).toHaveLength(8)
    expect(screen.getByTestId('active-step-card')).toBeInTheDocument()
    expect(screen.getAllByText('0:00').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Problem: Ramesh, 58, Mysuru/i).length).toBeGreaterThanOrEqual(1)

    // Check all chips exist
    for (let i = 0; i < 8; i++) {
      expect(screen.getByTestId(`step-chip-${i}`)).toBeInTheDocument()
    }
  })

  it('navigates stepper forward and backward', () => {
    renderWithClient(<DemoPage />)

    const nextBtn = screen.getByLabelText('Next step')
    fireEvent.click(nextBtn)

    expect(useDemoStore.getState().activeStepIndex).toBe(1)
    expect(screen.getAllByText('0:30').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Log in as Dr. Rao, search "Ramesh"/i).length).toBeGreaterThanOrEqual(1)

    const prevBtn = screen.getByLabelText('Previous step')
    fireEvent.click(prevBtn)

    expect(useDemoStore.getState().activeStepIndex).toBe(0)
    expect(screen.getAllByText('0:00').length).toBeGreaterThanOrEqual(1)
  })

  it('ScriptOverlay renders HUD with presenter talking points and controls', () => {
    renderWithClient(<ScriptOverlay />)

    expect(screen.getByTestId('demo-script-overlay')).toBeInTheDocument()
    expect(screen.getByTestId('overlay-reset-btn')).toBeInTheDocument()
    expect(screen.getByTestId('overlay-prewarm-btn')).toBeInTheDocument()
    expect(screen.getByTestId('overlay-run-3x-btn')).toBeInTheDocument()
    expect(screen.getByText(/Script HUD/i)).toBeInTheDocument()
  })

  it('triggers reset demo data when button clicked', async () => {
    renderWithClient(<DemoPage />)

    const resetBtn = screen.getByTestId('reset-demo-button')
    fireEvent.click(resetBtn)

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/admin/reset-demo'),
        expect.objectContaining({ method: 'POST' })
      )
    })
  })
})
