
import React, { useState, useEffect } from 'react';
// FIX: Removed modular 'onAuthStateChanged' and imported firebase to use compat SDK consistently.
import { auth, firebase } from './firebase';
import { LoggedInLayout } from './LoggedInLayout';
import { MainView, LoginView, SignupView, ForgotPasswordView } from './AuthViews';
import { LockScreen } from './LockScreen';
import { View } from './types';

// --- Main App Component ---
const App: React.FC = () => {
    // FIX: The type `firebase.User` is now available through the firebase import.
    const [user, setUser] = useState<firebase.User | null>(null);
    const [view, setView] = useState<View>('main');
    const [loading, setLoading] = useState(true);
    const [appLocked, setAppLocked] = useState(!!localStorage.getItem('appLockPin'));

    useEffect(() => {
        // FIX: Used auth.onAuthStateChanged (compat version) instead of the imported modular version.
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
            setLoading(false);
            if (!currentUser) {
                // If logged out, reset to main view and unlock app
                setView('main');
                setAppLocked(false);
            }
        });
        return unsubscribe;
    }, []);

    const handleGuestLogin = async () => {
        try {
            // FIX: Used firebase.auth.Auth.Persistence for compat SDK persistence constants.
            await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
            await auth.signInAnonymously();
        } catch (error) {
            console.error("Guest login failed:", error);
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen flex items-center justify-center p-4">
                <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-sky-400"></div>
            </main>
        );
    }
    
    if (appLocked) {
        return <LockScreen onUnlock={() => setAppLocked(false)} />;
    }

    return (
        <main 
            className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507400492013-162706c8c05e?q=80&w=2070&auto=format&fit=crop')" }}
        >
            <div className="w-full max-w-sm">
                {!user ? (
                    <>
                        {view === 'main' && <MainView setView={setView} handleGuestLogin={handleGuestLogin} />}
                        {view === 'login' && <LoginView setView={setView} />}
                        {view === 'signup' && <SignupView setView={setView} />}
                        {view === 'forgot-password' && <ForgotPasswordView setView={setView} />}
                    </>
                ) : (
                    <LoggedInLayout user={user} />
                )}
            </div>
        </main>
    );
};

export default App;
