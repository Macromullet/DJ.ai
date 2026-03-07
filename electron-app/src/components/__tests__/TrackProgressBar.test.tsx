import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TrackProgressBar } from '../TrackProgressBar'

/** Helper to mock getBoundingClientRect on the progress bar container */
function mockProgressBarRect(container: HTMLElement, rect: Partial<DOMRect> = {}) {
  vi.spyOn(container, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    right: 400,
    width: 400,
    top: 0,
    bottom: 10,
    height: 10,
    x: 0,
    y: 0,
    toJSON: () => {},
    ...rect,
  })
}

describe('TrackProgressBar', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders current time and duration', () => {
    render(
      <TrackProgressBar
        currentTimeMs={65000}
        durationMs={210000}
        isPlaying={false}
      />
    )

    // 65000ms = 1:05, 210000ms = 3:30
    expect(screen.getByText('1:05')).toBeInTheDocument()
    expect(screen.getByText('3:30')).toBeInTheDocument()
  })

  it('formats time as mm:ss with zero-padded seconds', () => {
    render(
      <TrackProgressBar
        currentTimeMs={5000}
        durationMs={60000}
        isPlaying={false}
      />
    )

    expect(screen.getByText('0:05')).toBeInTheDocument()
    expect(screen.getByText('1:00')).toBeInTheDocument()
  })

  it('displays 0:00 for zero/undefined values', () => {
    render(
      <TrackProgressBar
        currentTimeMs={0}
        durationMs={0}
        isPlaying={false}
      />
    )

    const timeElements = screen.getAllByText('0:00')
    expect(timeElements).toHaveLength(2)
  })

  it('sets progress bar fill width based on progress percentage', () => {
    render(
      <TrackProgressBar
        currentTimeMs={50000}
        durationMs={200000}
        isPlaying={false}
      />
    )

    // 50000/200000 = 25%
    const fill = document.querySelector('.progress-bar-fill') as HTMLElement
    expect(fill).toBeTruthy()
    expect(fill.style.width).toBe('25%')
  })

  it('sets progress bar fill to 0% when duration is 0', () => {
    render(
      <TrackProgressBar
        currentTimeMs={5000}
        durationMs={0}
        isPlaying={false}
      />
    )

    const fill = document.querySelector('.progress-bar-fill') as HTMLElement
    expect(fill).toBeTruthy()
    expect(fill.style.width).toBe('0%')
  })

  it('renders the slider with correct ARIA attributes', () => {
    render(
      <TrackProgressBar
        currentTimeMs={90000}
        durationMs={180000}
        isPlaying={false}
      />
    )

    const slider = screen.getByRole('slider', { name: /track progress/i })
    expect(slider).toHaveAttribute('aria-valuenow', '90')
    expect(slider).toHaveAttribute('aria-valuemin', '0')
    expect(slider).toHaveAttribute('aria-valuemax', '180')
    expect(slider).toHaveAttribute('aria-valuetext', '1:30 of 3:00')
  })

  it('calls onSeek with correct position when progress bar is clicked', () => {
    const onSeek = vi.fn()
    render(
      <TrackProgressBar
        currentTimeMs={0}
        durationMs={200000}
        isPlaying={false}
        onSeek={onSeek}
      />
    )

    const container = document.querySelector('.progress-bar-container') as HTMLElement
    mockProgressBarRect(container)

    // Click at 50% (clientX = 200 out of 400)
    fireEvent.mouseDown(container, { clientX: 200 })

    expect(onSeek).toHaveBeenCalledTimes(1)
    expect(onSeek.mock.calls[0][0]).toBeCloseTo(100000, -2) // 50% of 200000ms
  })

  it('does not call onSeek when duration is 0', () => {
    const onSeek = vi.fn()
    render(
      <TrackProgressBar
        currentTimeMs={0}
        durationMs={0}
        isPlaying={false}
        onSeek={onSeek}
      />
    )

    const container = document.querySelector('.progress-bar-container') as HTMLElement
    mockProgressBarRect(container)

    fireEvent.mouseDown(container, { clientX: 200 })
    expect(onSeek).not.toHaveBeenCalled()
  })

  it('updates display when currentTimeMs prop changes', () => {
    const { rerender } = render(
      <TrackProgressBar
        currentTimeMs={10000}
        durationMs={60000}
        isPlaying={false}
      />
    )

    expect(screen.getByText('0:10')).toBeInTheDocument()

    rerender(
      <TrackProgressBar
        currentTimeMs={30000}
        durationMs={60000}
        isPlaying={false}
      />
    )

    expect(screen.getByText('0:30')).toBeInTheDocument()
  })

  it('increments time locally while playing', () => {
    render(
      <TrackProgressBar
        currentTimeMs={0}
        durationMs={60000}
        isPlaying={true}
      />
    )

    // After 1 second (10 intervals of 100ms)
    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // Should show roughly 0:01
    expect(screen.getByText('0:01')).toBeInTheDocument()
  })

  it('stops local increment when not playing', () => {
    const { rerender } = render(
      <TrackProgressBar
        currentTimeMs={5000}
        durationMs={60000}
        isPlaying={true}
      />
    )

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    // Pause
    rerender(
      <TrackProgressBar
        currentTimeMs={6000}
        durationMs={60000}
        isPlaying={false}
      />
    )

    const timeAfterPause = screen.getAllByText(/\d+:\d+/)[0].textContent

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    // Time should not have changed after pausing
    expect(screen.getAllByText(/\d+:\d+/)[0].textContent).toBe(timeAfterPause)
  })

  it('supports keyboard navigation with ArrowRight to seek forward', () => {
    const onSeek = vi.fn()
    render(
      <TrackProgressBar
        currentTimeMs={10000}
        durationMs={60000}
        isPlaying={false}
        onSeek={onSeek}
      />
    )

    const slider = screen.getByRole('slider', { name: /track progress/i })
    fireEvent.keyDown(slider, { key: 'ArrowRight' })

    // Should seek forward 5000ms
    expect(onSeek).toHaveBeenCalledWith(15000)
  })

  it('supports keyboard navigation with ArrowLeft to seek backward', () => {
    const onSeek = vi.fn()
    render(
      <TrackProgressBar
        currentTimeMs={10000}
        durationMs={60000}
        isPlaying={false}
        onSeek={onSeek}
      />
    )

    const slider = screen.getByRole('slider', { name: /track progress/i })
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })

    // Should seek backward 5000ms
    expect(onSeek).toHaveBeenCalledWith(5000)
  })

  it('clamps seek at 0 when seeking backward past the start', () => {
    const onSeek = vi.fn()
    render(
      <TrackProgressBar
        currentTimeMs={2000}
        durationMs={60000}
        isPlaying={false}
        onSeek={onSeek}
      />
    )

    const slider = screen.getByRole('slider', { name: /track progress/i })
    fireEvent.keyDown(slider, { key: 'ArrowLeft' })

    expect(onSeek).toHaveBeenCalledWith(0)
  })

  describe('drag-to-seek', () => {
    it('mousedown starts drag mode and calls onSeek at click position', () => {
      const onSeek = vi.fn()
      render(
        <TrackProgressBar
          currentTimeMs={0}
          durationMs={200000}
          isPlaying={false}
          onSeek={onSeek}
        />
      )

      const progressContainer = document.querySelector('.progress-bar-container') as HTMLElement
      mockProgressBarRect(progressContainer)

      fireEvent.mouseDown(progressContainer, { clientX: 100 })

      // 100/400 = 25% of 200000 = 50000ms
      expect(onSeek).toHaveBeenCalledTimes(1)
      expect(onSeek.mock.calls[0][0]).toBeCloseTo(50000, -2)
    })

    it('mousemove during drag updates visual position', () => {
      const onSeek = vi.fn()
      render(
        <TrackProgressBar
          currentTimeMs={0}
          durationMs={200000}
          isPlaying={false}
          onSeek={onSeek}
        />
      )

      const progressContainer = document.querySelector('.progress-bar-container') as HTMLElement
      mockProgressBarRect(progressContainer)

      // Start drag
      fireEvent.mouseDown(progressContainer, { clientX: 100 })
      onSeek.mockClear()

      // Move to 75% (300/400)
      act(() => {
        fireEvent(window, new MouseEvent('mousemove', { clientX: 300, bubbles: true }))
      })

      // onSeek called during drag
      expect(onSeek).toHaveBeenCalled()
      // 300/400 = 75% of 200000 = 150000ms
      expect(onSeek.mock.calls[0][0]).toBeCloseTo(150000, -2)

      // Visual position should update
      const fill = document.querySelector('.progress-bar-fill') as HTMLElement
      expect(fill).toBeTruthy()
      expect(parseFloat(fill.style.width)).toBeCloseTo(75, 0)
    })

    it('mouseup ends drag mode', () => {
      const onSeek = vi.fn()
      const { rerender } = render(
        <TrackProgressBar
          currentTimeMs={0}
          durationMs={200000}
          isPlaying={false}
          onSeek={onSeek}
        />
      )

      const progressContainer = document.querySelector('.progress-bar-container') as HTMLElement
      mockProgressBarRect(progressContainer)

      // Start drag
      fireEvent.mouseDown(progressContainer, { clientX: 200 })

      // End drag
      act(() => {
        fireEvent(window, new MouseEvent('mouseup', { bubbles: true }))
      })

      // After mouseup, prop changes should update visual position again
      rerender(
        <TrackProgressBar
          currentTimeMs={10000}
          durationMs={200000}
          isPlaying={false}
          onSeek={onSeek}
        />
      )

      // 10000/200000 = 5%
      const fill = document.querySelector('.progress-bar-fill') as HTMLElement
      expect(parseFloat(fill.style.width)).toBeCloseTo(5, 0)
    })

    it('clamps drag position to track boundaries', () => {
      const onSeek = vi.fn()
      render(
        <TrackProgressBar
          currentTimeMs={0}
          durationMs={200000}
          isPlaying={false}
          onSeek={onSeek}
        />
      )

      const progressContainer = document.querySelector('.progress-bar-container') as HTMLElement
      mockProgressBarRect(progressContainer)

      // Start drag
      fireEvent.mouseDown(progressContainer, { clientX: 200 })
      onSeek.mockClear()

      // Drag past right edge (clientX > rect.right)
      act(() => {
        fireEvent(window, new MouseEvent('mousemove', { clientX: 600, bubbles: true }))
      })

      // Should clamp to duration (200000ms)
      expect(onSeek).toHaveBeenCalled()
      expect(onSeek.mock.calls[0][0]).toBeCloseTo(200000, -2)

      onSeek.mockClear()

      // Drag past left edge (clientX < rect.left)
      act(() => {
        fireEvent(window, new MouseEvent('mousemove', { clientX: -50, bubbles: true }))
      })

      // Should clamp to 0
      expect(onSeek).toHaveBeenCalled()
      expect(onSeek.mock.calls[0][0]).toBe(0)
    })

    it('does not update visual position from props during active drag', () => {
      const onSeek = vi.fn()
      const { rerender } = render(
        <TrackProgressBar
          currentTimeMs={0}
          durationMs={200000}
          isPlaying={false}
          onSeek={onSeek}
        />
      )

      const progressContainer = document.querySelector('.progress-bar-container') as HTMLElement
      mockProgressBarRect(progressContainer)

      // Start drag at 50%
      fireEvent.mouseDown(progressContainer, { clientX: 200 })

      const fill = document.querySelector('.progress-bar-fill') as HTMLElement
      const widthDuringDrag = fill.style.width

      // Prop changes while dragging should NOT override drag position
      rerender(
        <TrackProgressBar
          currentTimeMs={10000}
          durationMs={200000}
          isPlaying={false}
          onSeek={onSeek}
        />
      )

      expect(fill.style.width).toBe(widthDuringDrag)
    })
  })
})
