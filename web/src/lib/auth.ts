import { create } from 'zustand'

export interface UserBadge {
  username: string
  role: 'doctor' | 'nurse' | 'pharmacist' | 'lab_tech' | 'billing' | 'admin' | 'patient'
  full_name: string
  desk: string
  description: string
  linked_clid?: string
}

export const BADGES: UserBadge[] = [
  {
    username: 'dr.rao',
    role: 'doctor',
    full_name: 'Dr. Ramesh Rao',
    desk: 'OPD Desk 4 (Internal Medicine)',
    description: 'Full clinical chart access across all medical categories',
  },
  {
    username: 'nurse.geeta',
    role: 'nurse',
    full_name: 'Geeta Sharma',
    desk: 'Ward 3 Triage Desk',
    description: 'Clinical access to encounters, vitals, meds & allergies (claims excluded)',
  },
  {
    username: 'pharm.imran',
    role: 'pharmacist',
    full_name: 'Imran Khan',
    desk: 'Central Pharmacy Counter',
    description: 'Dispensing desk: medications, allergies, and minimal demographics only',
  },
  {
    username: 'lab.divya',
    role: 'lab_tech',
    full_name: 'Divya Nair',
    desk: 'Diagnostic Lab 2',
    description: 'Laboratory diagnostics and minimal demographics only',
  },
  {
    username: 'billing.sunil',
    role: 'billing',
    full_name: 'Sunil Verma',
    desk: 'Insurance & Claims Desk',
    description: 'Financial ledger: insurance claims and minimal demographics only',
  },
  {
    username: 'admin.neha',
    role: 'admin',
    full_name: 'Neha Sharma',
    desk: 'IT Administration & Compliance',
    description: 'System administration, ingestion pipeline and immutable audit ledger',
  },
  {
    username: 'ramesh',
    role: 'patient',
    full_name: 'Ramesh Kumar',
    desk: 'Patient Portal (Self-Service)',
    description: 'Personal health record, consent toggles, and data access ledger',
    linked_clid: 'CL-000001',
  },
]

export const DEMO_PASSWORD = 'carelens-demo'

interface AuthState {
  token: string | null
  currentUser: UserBadge | null
  isLoading: boolean
  error: string | null
  login: (username: string) => Promise<boolean>
  logout: () => void
  setToken: (token: string | null, user: UserBadge | null) => void
}

const STORAGE_KEY = 'carelens_jwt_token'
const USER_KEY = 'carelens_current_user'

export const useAuthStore = create<AuthState>((set) => {
  // Initialize from sessionStorage if present
  const storedToken = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null
  const storedUserJson = typeof window !== 'undefined' ? sessionStorage.getItem(USER_KEY) : null
  let initialUser: UserBadge | null = null

  if (storedUserJson) {
    try {
      initialUser = JSON.parse(storedUserJson)
    } catch {
      initialUser = null
    }
  }

  // Default to dr.rao if none stored
  if (!initialUser) {
    initialUser = BADGES[0]
  }

  return {
    token: storedToken,
    currentUser: initialUser,
    isLoading: false,
    error: null,

    login: async (username: string) => {
      set({ isLoading: true, error: null })
      const badge = BADGES.find((b) => b.username === username) || BADGES[0]

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: badge.username,
            password: DEMO_PASSWORD,
          }),
        })

        if (!response.ok) {
          throw new Error(`Authentication failed with status ${response.status}`)
        }

        const data = await response.json()
        const token = data.access_token

        // Persist token & user badge in memory & sessionStorage
        sessionStorage.setItem(STORAGE_KEY, token)
        sessionStorage.setItem(USER_KEY, JSON.stringify(badge))

        set({
          token,
          currentUser: badge,
          isLoading: false,
          error: null,
        })
        return true
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Login failed'
        set({ isLoading: false, error: message })
        return false
      }
    },

    logout: () => {
      sessionStorage.removeItem(STORAGE_KEY)
      sessionStorage.removeItem(USER_KEY)
      set({ token: null, currentUser: null, error: null })
    },

    setToken: (token: string | null, user: UserBadge | null) => {
      if (token) {
        sessionStorage.setItem(STORAGE_KEY, token)
      } else {
        sessionStorage.removeItem(STORAGE_KEY)
      }

      if (user) {
        sessionStorage.setItem(USER_KEY, JSON.stringify(user))
      } else {
        sessionStorage.removeItem(USER_KEY)
      }

      set({ token, currentUser: user })
    },
  }
})
