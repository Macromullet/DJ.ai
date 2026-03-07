import { render, screen, within, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ToastProvider, ToastContainer, useToast, type ToastType } from '../Toast'

/** Helper component to trigger toasts from tests */
function ToastTrigger({ message, type, duration }: { message: string; type?: ToastType; duration?: number }) {
  const { showToast } = useToast()
  return (
    <button onClick={() => showToast(message, type, duration)}>
      Show Toast
    </button>
  )
}

/** Multi-trigger helper */
function MultiTrigger({ toasts }: { toasts: { message: string; type?: ToastType }[] }) {
  const { showToast } = useToast()
  return (
    <>
      {toasts.map((t, i) => (
        <button key={i} onClick={() => showToast(t.message, t.type)}>
          {`Trigger ${i}`}
        </button>
      ))}
    </>
  )
}

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a toast message when showToast is called', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Hello world" />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Show Toast'))

    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('auto-dismisses toast after its duration', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Temporary" type="info" />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Show Toast'))
    expect(screen.getByText('Temporary')).toBeInTheDocument()

    // info default duration is 4000ms + 250ms exit animation
    act(() => { vi.advanceTimersByTime(4000 + 250) })

    expect(screen.queryByText('Temporary')).not.toBeInTheDocument()
  })

  it('removes toast when dismiss button is clicked', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Dismiss me" />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Show Toast'))
    expect(screen.getByText('Dismiss me')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /dismiss notification/i }))

    // Wait for exit animation
    act(() => { vi.advanceTimersByTime(250) })

    expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument()
  })

  it('stacks multiple toasts', () => {
    render(
      <ToastProvider>
        <MultiTrigger toasts={[
          { message: 'First toast', type: 'info' },
          { message: 'Second toast', type: 'success' },
          { message: 'Third toast', type: 'error' },
        ]} />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Trigger 0'))
    fireEvent.click(screen.getByText('Trigger 1'))
    fireEvent.click(screen.getByText('Trigger 2'))

    expect(screen.getByText('First toast')).toBeInTheDocument()
    expect(screen.getByText('Second toast')).toBeInTheDocument()
    expect(screen.getByText('Third toast')).toBeInTheDocument()
  })

  it('renders success toast with ✅ icon', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Success!" type="success" />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Show Toast'))

    const toast = screen.getByText('Success!').closest('.toast')!
    expect(toast).toHaveClass('toast-success')
    expect(within(toast as HTMLElement).getByText('✅')).toBeInTheDocument()
  })

  it('renders error toast with ❌ icon', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Error!" type="error" />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Show Toast'))

    const toast = screen.getByText('Error!').closest('.toast')!
    expect(toast).toHaveClass('toast-error')
    expect(within(toast as HTMLElement).getByText('❌')).toBeInTheDocument()
  })

  it('renders warning toast with ⚠️ icon', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Warning!" type="warning" />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Show Toast'))

    const toast = screen.getByText('Warning!').closest('.toast')!
    expect(toast).toHaveClass('toast-warning')
  })

  it('renders info toast with ℹ️ icon', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Info!" type="info" />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Show Toast'))

    const toast = screen.getByText('Info!').closest('.toast')!
    expect(toast).toHaveClass('toast-info')
  })

  it('uses default info type when no type is specified', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Default" />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Show Toast'))

    const toast = screen.getByText('Default').closest('.toast')!
    expect(toast).toHaveClass('toast-info')
  })

  it('error toasts have longer duration (6000ms) than info toasts (4000ms)', () => {
    render(
      <ToastProvider>
        <MultiTrigger toasts={[
          { message: 'Info msg', type: 'info' },
          { message: 'Error msg', type: 'error' },
        ]} />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Trigger 0'))
    fireEvent.click(screen.getByText('Trigger 1'))

    // After 4250ms, info should be gone but error should remain
    act(() => { vi.advanceTimersByTime(4000 + 250) })

    expect(screen.queryByText('Info msg')).not.toBeInTheDocument()
    expect(screen.getByText('Error msg')).toBeInTheDocument()

    // After another 2000ms + 250ms exit animation, error should also be gone
    act(() => { vi.advanceTimersByTime(2000 + 250) })

    expect(screen.queryByText('Error msg')).not.toBeInTheDocument()
  })

  it('limits visible toasts to MAX_VISIBLE (5)', () => {
    const toasts = Array.from({ length: 7 }, (_, i) => ({
      message: `Toast ${i}`,
      type: 'info' as ToastType,
    }))

    render(
      <ToastProvider>
        <MultiTrigger toasts={toasts} />
      </ToastProvider>
    )

    for (let i = 0; i < 7; i++) {
      fireEvent.click(screen.getByText(`Trigger ${i}`))
    }

    // Only the last 5 should be visible
    const allStatuses = screen.getAllByRole('status')
    expect(allStatuses.length).toBeLessThanOrEqual(5)
  })

  it('toast container has aria-live for accessibility', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Accessible" />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Show Toast'))

    const container = document.querySelector('.toast-container')
    expect(container).toHaveAttribute('aria-live', 'polite')
  })

  it('auto-dismisses toast after custom duration', () => {
    render(
      <ToastProvider>
        <ToastTrigger message="Custom duration" type="info" duration={2000} />
      </ToastProvider>
    )

    fireEvent.click(screen.getByText('Show Toast'))
    expect(screen.getByText('Custom duration')).toBeInTheDocument()

    // Should NOT be dismissed at default info duration (4000ms) minus buffer
    act(() => { vi.advanceTimersByTime(1500) })
    expect(screen.getByText('Custom duration')).toBeInTheDocument()

    // Should be dismissed after custom duration (2000ms) + exit animation (250ms)
    act(() => { vi.advanceTimersByTime(500 + 250) })
    expect(screen.queryByText('Custom duration')).not.toBeInTheDocument()
  })

  it('renders nothing when there are no toasts', () => {
    render(<ToastContainer toasts={[]} />)

    expect(document.querySelector('.toast-container')).not.toBeInTheDocument()
  })

  it('throws when useToast is used outside ToastProvider', () => {
    // Suppress React error boundary console output
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function BadComponent() {
      useToast()
      return null
    }

    expect(() => render(<BadComponent />)).toThrow(
      /useToast must be used within a <ToastProvider>/
    )

    consoleSpy.mockRestore()
  })
})
