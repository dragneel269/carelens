export interface HealthStatus {
  status: string
  service: string
  version: string
  timestamp: string
  environment?: string
}

export async function fetchHealth(): Promise<HealthStatus> {
  const response = await fetch('/api/health')
  if (!response.ok) {
    throw new Error(`Health check failed with status: ${response.status}`)
  }
  return response.json()
}
