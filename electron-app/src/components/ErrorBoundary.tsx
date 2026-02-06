import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error Boundary caught error:', error, errorInfo);
    
    // Log to analytics if available
    if ((window as any).appInsights) {
      (window as any).appInsights.trackException({ exception: error });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    
    // Reload the page to reset state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d1f3f 100%)',
          color: '#FFD700',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>😔</div>
          <h1 style={{ fontSize: '32px', marginBottom: '16px' }}>Oops! Something went wrong</h1>
          <p style={{ 
            fontSize: '18px', 
            marginBottom: '32px',
            maxWidth: '600px',
            color: '#ccc'
          }}>
            DJ.ai encountered an unexpected error. Don't worry, your music preferences are safe!
          </p>
          
          {this.state.error && (
            <details style={{
              marginBottom: '32px',
              padding: '16px',
              background: 'rgba(255, 215, 0, 0.1)',
              borderRadius: '8px',
              maxWidth: '600px',
              textAlign: 'left'
            }}>
              <summary style={{ 
                cursor: 'pointer',
                fontSize: '14px',
                color: '#FFD700',
                marginBottom: '8px'
              }}>
                Technical Details
              </summary>
              <code style={{ 
                fontSize: '12px',
                color: '#ff6b6b',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {this.state.error.toString()}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </code>
            </details>
          )}
          
          <button
            onClick={this.handleReset}
            style={{
              padding: '12px 32px',
              fontSize: '16px',
              background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
              color: '#000',
              border: 'none',
              borderRadius: '25px',
              cursor: 'pointer',
              fontWeight: 'bold',
              boxShadow: '0 4px 15px rgba(255, 215, 0, 0.3)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            🔄 Reload DJ.ai
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
