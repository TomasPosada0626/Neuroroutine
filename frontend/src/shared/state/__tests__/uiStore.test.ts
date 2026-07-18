async function freshStore() {
  vi.resetModules()
  vi.clearAllMocks()
  localStorage.clear()
  const mod = await import('../uiStore')
  return mod
}

describe('useUiStore', () => {
  it('starts with night theme and toggles day/night', async () => {
    const { useUiStore } = await freshStore()

    expect(useUiStore.getState().theme).toBe('night')

    useUiStore.getState().toggleTheme()
    expect(useUiStore.getState().theme).toBe('day')

    useUiStore.getState().toggleTheme()
    expect(useUiStore.getState().theme).toBe('night')
  })

  it('setTheme updates theme and persists it', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem')
    const { useUiStore } = await freshStore()

    useUiStore.getState().setTheme('day')

    expect(useUiStore.getState().theme).toBe('day')
    expect(spy).toHaveBeenCalled()
    expect(spy.mock.calls.some(([key]) => key === 'nr-ui')).toBe(true)
  })

  it('hydrates persisted theme from localStorage', async () => {
    localStorage.setItem('nr-ui', JSON.stringify({ state: { theme: 'day' }, version: 1 }))

    vi.resetModules()
    const { useUiStore } = await import('../uiStore')

    expect(useUiStore.getState().theme).toBe('day')
  })
})
