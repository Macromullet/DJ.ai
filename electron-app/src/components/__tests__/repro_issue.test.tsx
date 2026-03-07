
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Settings, type SettingsConfig } from '../Settings'

function makeConfig(overrides: Partial<SettingsConfig> = {}): SettingsConfig {
  return {
    currentProvider: 'spotify',
    providers: { spotify: { isConnected: false }, apple: { isConnected: false } },
    aiProvider: 'openai',
    openaiApiKey: '',
    anthropicApiKey: '',
    elevenLabsApiKey: '',
    geminiApiKey: '',
    ttsEnabled: false,
    ttsProvider: 'web-speech',
    ttsVoice: 'alloy',
    autoDJMode: false,
    ...overrides,
  }
}

describe('Settings Key Deletion', () => {
  it('allows user to clear a configured API key', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    
    // Start with a configured key
    const config = makeConfig({ openaiApiKey: 'configured' })
    
    render(<Settings config={config} onSave={onSave} onClose={vi.fn()} onConnectProvider={vi.fn()} onDisconnectProvider={vi.fn()} />)
    
    // The input should be empty (placeholder shown)
    const input = screen.getByPlaceholderText(/Key configured/i)
    expect(input).toHaveValue('')
    
    // User types something then clears it, intending to remove the key
    await user.type(input, 'a')
    await user.clear(input)
    expect(input).toHaveValue('')
    
    // User clicks save
    await user.click(screen.getByRole('button', { name: /save settings/i }))
    
    // The saved config should have '' — user explicitly cleared the field
    const savedConfig = onSave.mock.calls[0][0] as SettingsConfig
    expect(savedConfig.openaiApiKey).toBe('')
  })

  it('preserves configured key when user does not touch the field', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    
    const config = makeConfig({ openaiApiKey: 'configured' })
    render(<Settings config={config} onSave={onSave} onClose={vi.fn()} onConnectProvider={vi.fn()} onDisconnectProvider={vi.fn()} />)
    
    // User saves without touching the key field
    await user.click(screen.getByRole('button', { name: /save settings/i }))
    
    const savedConfig = onSave.mock.calls[0][0] as SettingsConfig
    expect(savedConfig.openaiApiKey).toBe('configured')
  })
})
