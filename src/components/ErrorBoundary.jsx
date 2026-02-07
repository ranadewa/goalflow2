import { Component } from 'react'

/**
 * React Error Boundary for catching decryption and rendering failures.
 * Wraps pages that decrypt data so a corrupt record doesn't crash the app.
 */
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary] Caught error:', error, errorInfo)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
    }

    render() {
        if (this.state.hasError) {
            // Allow a custom fallback via props
            if (this.props.fallback) {
                return this.props.fallback({
                    error: this.state.error,
                    reset: this.handleReset
                })
            }

            const isDecryptionError =
                this.state.error?.name === 'OperationError' ||
                this.state.error?.message?.toLowerCase().includes('decrypt')

            return (
                <div className="error-container">
                    <h2>{isDecryptionError ? '🔐 Decryption Failed' : 'Something went wrong'}</h2>
                    <p>
                        {isDecryptionError
                            ? 'Your data could not be decrypted. This may mean your passphrase is incorrect or some data has been corrupted.'
                            : this.state.error?.message || 'An unexpected error occurred.'}
                    </p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        <button onClick={this.handleReset} className="btn btn-primary">
                            Try Again
                        </button>
                        <button
                            onClick={() => window.location.reload()}
                            className="btn btn-secondary"
                        >
                            Reload App
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}