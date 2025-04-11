declare module 'reown' {
  interface ReownConfig {
    chains: { id: number; name: string }[]
    projectId: string
  }

  interface ReownInstance {
    connect: () => Promise<{ address: string }>
    disconnect: () => void
  }

  export function createReown(config: ReownConfig): ReownInstance
} 