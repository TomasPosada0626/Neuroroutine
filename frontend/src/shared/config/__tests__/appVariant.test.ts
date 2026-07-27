import { IS_DEMO_VARIANT, NR_APP_VARIANT, assertDemoFeature } from '../appVariant';

describe('appVariant', () => {
  it('is forced to app mode, not demo', () => {
    expect(NR_APP_VARIANT).toBe('app');
    expect(IS_DEMO_VARIANT).toBe(false);
  });

  it('assertDemoFeature throws outside the demo variant', () => {
    expect(() => assertDemoFeature('demo seeding')).toThrow(
      'Feature "demo seeding" is only available in the demo variant.',
    );
  });
});
