
import React, { useState, useEffect } from 'react';
// FIX: Removed modular 'onAuthStateChanged' and imported firebase to use compat SDK consistently.
import { auth, firebase } from './firebase';
import { LoggedInLayout, BottomNavBar } from './LoggedInLayout';
import { MainView, LoginView, SignupView, ForgotPasswordView } from './AuthViews';
import { LockScreen } from './LockScreen';
import { View, LoggedInView, JournalEntry } from './types';
import { AddJournalEntryModal } from './Journal';
import { PlusIcon } from './icons';

// --- Main App Component ---
const App: React.FC = () => {
    // FIX: The type `firebase.User` is now available through the firebase import.
    const [user, setUser] = useState<firebase.User | null>(null);
    const [view, setView] = useState<View>('main');
    const [loading, setLoading] = useState(true);
    const [appLocked, setAppLocked] = useState(!!localStorage.getItem('appLockPin'));
    const [activeTab, setActiveTab] = useState<LoggedInView>('home');
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<JournalEntry | null>(null);
    const [isChatOpen, setIsChatOpen] = useState(false);


    useEffect(() => {
        // FIX: Used auth.onAuthStateChanged (compat version) instead of the imported modular version.
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
            setLoading(false);
            if (!currentUser) {
                // If logged out, reset to main view and unlock app
                setView('main');
                setAppLocked(false);
                setActiveTab('home');
            }
        });
        return unsubscribe;
    }, []);

    const handleGuestLogin = async () => {
        try {
            // FIX: Used firebase.auth.Auth.Persistence for compat SDK persistence constants.
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            await auth.signInAnonymously();
        } catch (error) {
            console.error("Guest login failed:", error);
        }
    };
    
    const handleOpenAddJournalModal = () => {
        setEntryToEdit(null);
        setShowAddEditModal(true);
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
        <>
            <main 
                className={`min-h-screen flex items-center justify-center p-4 bg-cover bg-center ${user && !isChatOpen ? 'pb-16' : ''}`}
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1472552944129-b035e9ea3744?q=80&w=2070&auto=format&fit=crop')" }}
            >
                <div className="w-full max-w-sm animate-fadeInUp">
                    {!user ? (
                        <>
                            {view === 'main' && <MainView setView={setView} handleGuestLogin={handleGuestLogin} />}
                            {view === 'login' && <LoginView setView={setView} />}
                            {view === 'signup' && <SignupView setView={setView} />}
                            {view === 'forgot-password' && <ForgotPasswordView setView={setView} />}
                        </>
                    ) : (
                        <LoggedInLayout 
                            user={user} 
                            activeTab={activeTab} 
                            setActiveTab={setActiveTab}
                            setShowAddEditModal={setShowAddEditModal}
                            setEntryToEdit={setEntryToEdit}
                            onChatStateChange={setIsChatOpen}
                        />
                    )}
                </div>
            </main>
            {user && activeTab === 'journal' && (
                <button
                    onClick={handleOpenAddJournalModal}
                    className="fixed z-40 left-6 bottom-20 w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-teal-500 to-sky-600 text-white shadow-lg hover:scale-110 transition-transform duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950/50 focus:ring-teal-400"
                    aria-label="إضافة يومية جديدة"
                >
                    <PlusIcon className="w-8 h-8" />
                </button>
            )}
            {showAddEditModal && user && (
                <AddJournalEntryModal
                    onClose={() => setShowAddEditModal(false)}
                    user={user}
                    entryToEdit={entryToEdit}
                />
            )}
            {user && !isChatOpen && <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} />}
        </>
    );
};

export default App;
