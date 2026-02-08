import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './components/Toast'
import { ConfirmProvider } from './components/ConfirmModal'
import ErrorBoundary from './components/ErrorBoundary'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import SetupPage from './pages/SetupPage'
import UnlockPage from './pages/UnlockPage'
import DashboardPage from './pages/DashboardPage'
import HabitsPage from './pages/HabitsPage'
import HistoryPage from './pages/HistoryPage'
import GoalsPage from './pages/GoalsPage'
import Layout from './components/Layout'

function AppRoutes() {
    const { user, userSettings, encryptionKey, loading } = useAuth()

    // Show loading while checking auth
    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        )
    }

    // Not logged in - show auth pages
    if (!user) {
        return (
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
        )
    }

    // Logged in but no settings - needs setup
    if (!userSettings) {
        return (
            <Routes>
                <Route path="/setup" element={<SetupPage />} />
                <Route path="*" element={<Navigate to="/setup" />} />
            </Routes>
        )
    }

    // Logged in, has settings, but no key - needs unlock
    if (!encryptionKey) {
        return (
            <Routes>
                <Route path="/unlock" element={<UnlockPage />} />
                <Route path="*" element={<Navigate to="/unlock" />} />
            </Routes>
        )
    }

    // Fully authenticated - wrap decryption pages in error boundary
    return (
        <Layout>
            <ErrorBoundary>
                <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/history" element={<HistoryPage />} />
                    <Route path="/goals" element={<GoalsPage />} />
                    <Route path="/habits" element={<HabitsPage />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </ErrorBoundary>
        </Layout>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ToastProvider>
                    <ConfirmProvider>
                        <AppRoutes />
                    </ConfirmProvider>
                </ToastProvider>
            </AuthProvider>
        </BrowserRouter>
    )
}