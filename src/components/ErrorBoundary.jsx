import React from 'react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service here (e.g. Sentry)
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // If a reset prop is passed, call it
    if (this.props.onReset) {
      this.props.onReset();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          width: '100%',
          padding: '2rem',
          backgroundColor: 'var(--surface-dark)',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          borderRadius: '12px',
          border: '1px solid var(--border-color)'
        }}>
          <FiAlertTriangle size={48} color="var(--error-color)" style={{ marginBottom: '1rem' }} />
          <h2 style={{ color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Something went wrong</h2>
          <p style={{ marginBottom: '1.5rem', maxWidth: '400px' }}>
            A component crashed while trying to render this view. We've caught the error to keep the rest of the app running.
          </p>
          {this.state.error && (
            <div style={{
              background: 'rgba(0,0,0,0.2)',
              padding: '1rem',
              borderRadius: '8px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: 'var(--error-color)',
              marginBottom: '1.5rem',
              maxWidth: '600px',
              overflowX: 'auto',
              textAlign: 'left'
            }}>
              {this.state.error.toString()}
            </div>
          )}
          <button className="btn btn--primary" onClick={this.handleReset}>
            <FiRefreshCw style={{ marginRight: '8px' }} /> Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
