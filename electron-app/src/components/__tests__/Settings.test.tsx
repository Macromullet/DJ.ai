import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Settings, type SettingsConfig } from '../Settings'

function makeConfig(overrides: Partial<SettingsConfig> = {}): SettingsConfig {
  return {
    currentProvider: 'spotify',
    providers: {
      spotify: { isConnected: false },
      apple: { isConnected: false },
    },
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

function renderSettings(configOverrides: Partial<SettingsConfig> = {}, props: Partial<Parameters<typeof Settings>[0]> = {}) {
  const config = makeConfig(configOverrides)
  const onSave = vi.fn()
  const onClose = vi.fn()
  const onConnectProvider = vi.fn()
  const onDisconnectProvider = vi.fn()

  const result = render(
    <Settings
      config={config}
      onSave={props.onSave ?? onSave}
      onClose={props.onClose ?? onClose}
      onConnectProvider={props.onConnectProvider ?? onConnectProvider}
      onDisconnectProvider={props.onDisconnectProvider ?? onDisconnectProvider}
    />
  )
  return { ...result, onSave, onClose, onConnectProvider, onDisconnectProvider, config }
}

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders provider radio options for Spotify and Apple Music', () => {
    renderSettings()

    expect(screen.getByRole('radio', { name: /spotify/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /apple music/i })).toBeInTheDocument()
  })

  it('does NOT render a YouTube provider option', () => {
    renderSettings()

    expect(screen.queryByRole('radio', { name: /youtube/i })).not.toBeInTheDocument()
  })

  it('reflects the current provider selection from config', () => {
    renderSettings({ currentProvider: 'apple' })

    expect(screen.getByRole('radio', { name: /apple music/i })).toBeChecked()
    expect(screen.getByRole('radio', { name: /spotify/i })).not.toBeChecked()
  })

  it('switches provider when clicking a different radio', async () => {
    const user = userEvent.setup()
    renderSettings({ currentProvider: 'spotify' })

    await user.click(screen.getByRole('radio', { name: /apple music/i }))

    expect(screen.getByRole('radio', { name: /apple music/i })).toBeChecked()
  })

  it('shows Spotify auth section when Spotify is selected', () => {
    renderSettings({ currentProvider: 'spotify' })

    expect(screen.getByText(/spotify authentication/i)).toBeInTheDocument()
  })

  it('shows Apple Music auth section when Apple is selected', () => {
    renderSettings({ currentProvider: 'apple' })

    expect(screen.getByText(/apple music authentication/i)).toBeInTheDocument()
  })

  it('shows Connect button for disconnected Spotify provider', () => {
    renderSettings({ currentProvider: 'spotify', providers: { spotify: { isConnected: false }, apple: { isConnected: false } } })

    expect(screen.getByRole('button', { name: /connect with spotify/i })).toBeInTheDocument()
  })

  it('shows connected status and Disconnect button for connected Spotify', () => {
    renderSettings({
      currentProvider: 'spotify',
      providers: { spotify: { isConnected: true }, apple: { isConnected: false } },
    })

    expect(screen.getByText(/connected to spotify/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /disconnect/i })).toBeInTheDocument()
  })

  it('calls onConnectProvider when Connect button is clicked', async () => {
    const user = userEvent.setup()
    const { onConnectProvider } = renderSettings({ currentProvider: 'spotify' })

    await user.click(screen.getByRole('button', { name: /connect with spotify/i }))

    expect(onConnectProvider).toHaveBeenCalledWith('spotify')
  })

  it('calls onDisconnectProvider when Disconnect button is clicked', async () => {
    const user = userEvent.setup()
    const { onDisconnectProvider } = renderSettings({
      currentProvider: 'apple',
      providers: { spotify: { isConnected: false }, apple: { isConnected: true } },
    })

    await user.click(screen.getByRole('button', { name: /disconnect/i }))

    expect(onDisconnectProvider).toHaveBeenCalledWith('apple')
  })

  it('renders API key inputs for AI providers', () => {
    renderSettings({ aiProvider: 'openai' })

    const passwordInputs = screen.getAllByPlaceholderText(/sk-/i)
    expect(passwordInputs.length).toBeGreaterThanOrEqual(1)
  })

  it('disables Anthropic API key input when OpenAI is selected', () => {
    renderSettings({ aiProvider: 'openai' })

    expect(screen.getByPlaceholderText('sk-ant-...')).toBeDisabled()
    expect(screen.getByPlaceholderText('sk-...')).not.toBeDisabled()
  })

  it('calls onSave with updated config and onClose when Save is clicked', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    const onClose = vi.fn()
    renderSettings({ autoDJMode: false }, { onSave, onClose })

    // Toggle auto-DJ mode
    await user.click(screen.getByRole('checkbox', { name: /auto-dj mode/i }))

    await user.click(screen.getByRole('button', { name: /save settings/i }))

    expect(onSave).toHaveBeenCalledTimes(1)
    const savedConfig = onSave.mock.calls[0][0] as SettingsConfig
    expect(savedConfig.autoDJMode).toBe(true)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when Cancel button is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSettings()

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when overlay backdrop is clicked', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSettings()

    // Click the overlay (the outermost div)
    const dialog = screen.getByRole('dialog')
    await user.click(dialog)

    expect(onClose).toHaveBeenCalled()
  })

  it('does NOT call onClose when clicking inside the panel', async () => {
    const user = userEvent.setup()
    const { onClose } = renderSettings()

    const panel = screen.getByLabelText('Settings')
    await user.click(panel)

    // onClose may be called from the overlay but the stopPropagation should prevent it
    // when clicking on the panel itself
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows TTS options when TTS is enabled', async () => {
    const user = userEvent.setup()
    renderSettings({ ttsEnabled: false })

    expect(screen.queryByText(/tts provider/i)).not.toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: /enable voice commentary/i }))

    expect(screen.getByText(/tts provider/i)).toBeInTheDocument()
  })

  it('shows ElevenLabs API key field when ElevenLabs TTS is selected', async () => {
    const user = userEvent.setup()
    renderSettings({ ttsEnabled: true, ttsProvider: 'web-speech' })

    const select = screen.getByRole('combobox')
    await user.selectOptions(select, 'elevenlabs')

    expect(screen.getByPlaceholderText(/elevenlabs api key/i)).toBeInTheDocument()
  })

  it('shows close button with accessible label', () => {
    renderSettings()

    expect(screen.getByRole('button', { name: /close settings/i })).toBeInTheDocument()
  })

  it('renders the settings as a modal dialog', () => {
    renderSettings()

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })
})
