import { useState, useCallback, createContext, useContext } from 'react'

const ConfirmContext = createContext(null)

/**
 * ConfirmProvider - Manages a global confirmation modal.
 *
 * Usage:
 *   const confirm = useConfirm()
 *   const ok = await confirm('Delete this item?')
 *   const ok = await confirm('Are you sure?', { title: 'Delete', confirmText: 'Delete', danger: true })
 */
export function ConfirmProvider({ children }) {
    const [state, setState] = useState(null) // { message, options, resolve }

    const confirm = useCallback((message, options = {}) => {
        return new Promise((resolve) => {
            setState({ message, options, resolve })
        })
    }, [])

    function handleConfirm() {
        state?.resolve(true)
        setState(null)
    }

    function handleCancel() {
        state?.resolve(false)
        setState(null)
    }

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {state && (
                <div className="modal-backdrop" onClick={handleCancel}>
                    <div className="modal confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{state.options.title || 'Confirm'}</h2>
                            <button className="modal-close" onClick={handleCancel}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>{state.message}</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={handleCancel}>
                                {state.options.cancelText || 'Cancel'}
                            </button>
                            <button
                                className={`btn ${state.options.danger ? 'btn-danger' : 'btn-primary'}`}
                                onClick={handleConfirm}
                            >
                                {state.options.confirmText || 'OK'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    )
}

export function useConfirm() {
    const context = useContext(ConfirmContext)
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider')
    }
    return context
}