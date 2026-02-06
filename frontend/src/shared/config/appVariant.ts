export type NrAppVariant = 'app' | 'demo'

export const NR_APP_VARIANT: NrAppVariant =
  ((import.meta.env.VITE_NR_APP_VARIANT as string | undefined) as NrAppVariant | undefined) ?? 'app'

export const IS_DEMO_VARIANT = NR_APP_VARIANT === 'demo'

export function assertDemoFeature(featureName: string): void {
  if (!IS_DEMO_VARIANT) {
    throw new Error(`Feature "${featureName}" is only available in the demo variant.`)
  }
}
