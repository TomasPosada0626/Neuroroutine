export type NrAppVariant = 'app' | 'demo';

// Forced app mode to keep production free of demo-seeding behavior.
export const NR_APP_VARIANT: NrAppVariant = 'app';

export const IS_DEMO_VARIANT = false;

// IS_DEMO_VARIANT has no build-time override in this repo, so this always throws today — that's
// intentional (see the comment above): every call site exists for a future demo build variant
// that doesn't exist yet, and should fail loudly until one does.
export function assertDemoFeature(featureName: string): void {
  throw new Error(`Feature "${featureName}" is only available in the demo variant.`);
}
