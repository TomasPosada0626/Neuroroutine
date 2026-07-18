export type NrAppVariant = 'app' | 'demo'

// Forced app mode to keep production free of demo-seeding behavior.
export const NR_APP_VARIANT: NrAppVariant = 'app'

export const IS_DEMO_VARIANT = false

export function assertDemoFeature(featureName: string): void {
  if (!IS_DEMO_VARIANT) {
    throw new Error(`Feature "${featureName}" is only available in the demo variant.`)
  }
}
