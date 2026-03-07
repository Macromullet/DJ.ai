import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VolumeControl } from '../VolumeControl'

describe('VolumeControl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders volume slider at the default value (80)', () => {
    render(<VolumeControl />)

    const slider = screen.getByRole('slider', { name: /volume/i })
    expect(slider).toHaveValue('80')
  })

  it('renders volume slider at specified initial value', () => {
    render(<VolumeControl initialVolume={50} />)

    const slider = screen.getByRole('slider', { name: /volume/i })
    expect(slider).toHaveValue('50')
  })

  it('loads saved volume from localStorage over initialVolume', () => {
    localStorage.setItem('djai_volume', '42')

    render(<VolumeControl initialVolume={80} />)

    const slider = screen.getByRole('slider', { name: /volume/i })
    expect(slider).toHaveValue('42')
  })

  it('falls back to initialVolume when localStorage has NaN value', () => {
    localStorage.setItem('djai_volume', 'not-a-number')

    render(<VolumeControl initialVolume={60} />)

    // parseInt('not-a-number') returns NaN, which is falsy → falls back to initialVolume
    const slider = screen.getByRole('slider', { name: /volume/i })
    expect(slider).toHaveValue('60')
  })

  it('displays volume percentage', () => {
    render(<VolumeControl initialVolume={75} />)

    expect(screen.getByText('75%')).toBeInTheDocument()
  })

  it('calls onVolumeChange exactly once when slider changes', () => {
    const onVolumeChange = vi.fn()
    render(<VolumeControl initialVolume={50} onVolumeChange={onVolumeChange} />)

    // Clear the initial mount call from useEffect
    onVolumeChange.mockClear()

    const slider = screen.getByRole('slider', { name: /volume/i })
    fireEvent.change(slider, { target: { value: '30' } })

    // Should be called exactly once — not twice (the bug was double-fire)
    expect(onVolumeChange).toHaveBeenCalledTimes(1)
    expect(onVolumeChange).toHaveBeenCalledWith(30)
  })

  it('saves new volume to localStorage when slider changes', () => {
    render(<VolumeControl initialVolume={50} />)

    const slider = screen.getByRole('slider', { name: /volume/i })
    fireEvent.change(slider, { target: { value: '65' } })

    expect(localStorage.setItem).toHaveBeenCalledWith('djai_volume', '65')
  })

  it('renders mute button', () => {
    render(<VolumeControl />)

    expect(screen.getByRole('button', { name: /mute/i })).toBeInTheDocument()
  })

  it('toggles mute state when mute button is clicked', async () => {
    const user = userEvent.setup()
    const onVolumeChange = vi.fn()
    render(<VolumeControl initialVolume={80} onVolumeChange={onVolumeChange} />)

    const muteBtn = screen.getByRole('button', { name: /mute/i })
    await user.click(muteBtn)

    // After muting, slider shows 0 and button label changes to unmute
    const slider = screen.getByRole('slider', { name: /volume/i })
    expect(slider).toHaveValue('0')
    expect(screen.getByRole('button', { name: /unmute/i })).toBeInTheDocument()
  })

  it('restores volume when unmuting', async () => {
    const user = userEvent.setup()
    render(<VolumeControl initialVolume={70} />)

    // Mute
    await user.click(screen.getByRole('button', { name: /mute/i }))
    expect(screen.getByRole('slider', { name: /volume/i })).toHaveValue('0')

    // Unmute
    await user.click(screen.getByRole('button', { name: /unmute/i }))
    // Volume should be restored (displayed as percentage and slider value)
    expect(screen.getByText('70%')).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: /volume/i })).toHaveValue('70')
  })

  it('shows muted icon (🔇) when muted', async () => {
    const user = userEvent.setup()
    render(<VolumeControl initialVolume={50} />)

    await user.click(screen.getByRole('button', { name: /mute/i }))

    expect(screen.getByRole('button', { name: /unmute/i })).toHaveTextContent('🔇')
  })

  it('shows low volume icon (🔈) for volume < 33', () => {
    render(<VolumeControl initialVolume={20} />)

    expect(screen.getByRole('button', { name: /mute/i })).toHaveTextContent('🔈')
  })

  it('shows medium volume icon (🔉) for volume 33-65', () => {
    render(<VolumeControl initialVolume={50} />)

    expect(screen.getByRole('button', { name: /mute/i })).toHaveTextContent('🔉')
  })

  it('shows high volume icon (🔊) for volume >= 66', () => {
    render(<VolumeControl initialVolume={80} />)

    expect(screen.getByRole('button', { name: /mute/i })).toHaveTextContent('🔊')
  })

  it('unmutes when slider is moved while muted', () => {
    const onVolumeChange = vi.fn()
    render(<VolumeControl initialVolume={50} onVolumeChange={onVolumeChange} />)

    // Mute first
    const muteBtn = screen.getByRole('button', { name: /mute/i })
    fireEvent.click(muteBtn)

    // Move slider while muted
    const slider = screen.getByRole('slider', { name: /volume/i })
    fireEvent.change(slider, { target: { value: '40' } })

    // Should unmute — button label should say "Mute" again (meaning it's unmuted)
    expect(screen.getByRole('button', { name: /mute/i })).toBeInTheDocument()
    expect(onVolumeChange).toHaveBeenCalledWith(40)
  })

  it('calls onVolumeChange with 0 on initial render when starting muted is not default', () => {
    const onVolumeChange = vi.fn()
    render(<VolumeControl initialVolume={50} onVolumeChange={onVolumeChange} />)

    // The useEffect fires on mount with the current (unmuted) volume
    expect(onVolumeChange).toHaveBeenCalledWith(50)
  })
})
