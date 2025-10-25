
import React, { useState, useEffect, useRef } from 'react';
// FIX: Use Firebase v9 compat libraries to support v8 syntax, resolving property and type errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore'; // Added Firestore
import { 
    // getAuth, // v9
    // createUserWithEmailAndPassword, // v9
    // signInWithEmailAndPassword, // v9
    // sendPasswordResetEmail, // v9
    // onAuthStateChanged, // v9
    // signOut, // v9
    // updateProfile, // v9
    // sendEmailVerification, // v9
    // User // v9
} from 'firebase/auth';

// --- Global Declarations ---
declare const uploadcare: any; // To inform TypeScript about the global uploadcare object

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyAGgZmhJ_mMezlf7xElisvzJ8l9D758d4g",
    authDomain: "my-chat-app-daaf8.firebaseapp.com",
    projectId: "my-chat-app-daaf8",
    storageBucket: "my-chat-app-daaf8.firebasestorage.app",
    messagingSenderId: "789086064752",
    appId: "1:789086064752:web:d081f1b6832dabca1d64b5"
};

// FIX: Changed Firebase initialization to v8 style.
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore(); // Initialized Firestore

// --- Developer Configuration ---
// Add the Firebase UID(s) of developer accounts here.
// Only these users will see the option to change the counter background image.
const DEVELOPER_UIDS = ['sytCf4Ru91ZplxTeXYfvqGhDnn12'];


// --- Types and Interfaces ---
type View = 'main' | 'login' | 'signup' | 'forgot-password';
type LoggedInView = 'home' | 'settings' | 'counter-settings';

interface UserProfile {
    uid: string;
    displayName: string;
    photoURL: string | null;
    email?: string;
}

interface Conversation extends Omit<UserProfile, 'uid'> {
    uid: string;
}


interface Notification {
    id: string;
    title: string;
    message: string;
    timestamp: firebase.firestore.Timestamp;
}

interface Message {
    id: string;
    text: string;
    timestamp: firebase.firestore.Timestamp;
    uid: string;
    displayName: string;
    photoURL: string | null;
    reactions?: { [emoji: string]: string[] };
}

interface ViewProps {
    setView: React.Dispatch<React.SetStateAction<View>>;
    handleGuestLogin?: () => Promise<void>;
}

// --- Helper Functions ---
const getFirebaseErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
        case 'auth/invalid-email':
            return 'البريد الإلكتروني غير صالح.';
        case 'auth/user-not-found':
            return 'لا يوجد حساب بهذا البريد الإلكتروني.';
        case 'auth/wrong-password':
            return 'كلمة المرور غير صحيحة.';
        case 'auth/email-already-in-use':
            return 'هذا البريد الإلكتروني مستخدم بالفعل.';
        case 'auth/weak-password':
            return 'كلمة المرور ضعيفة جدًا. يجب أن تكون 6 أحرف على الأقل.';
        case 'auth/requires-recent-login':
            return 'هذه العملية حساسة وتتطلب مصادقة حديثة. يرجى تسجيل الخروج ثم الدخول مرة أخرى والمحاولة مجدداً.';
        default:
            return 'حدث خطأ ما. يرجى المحاولة مرة أخرى.';
    }
};

const formatDistanceToNow = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'الآن';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `قبل ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `قبل ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `قبل ${days} يوم`;
    const months = Math.floor(days / 30);
    if (months < 12) return `قبل ${months} شهر`;
    const years = Math.floor(months / 12);
    return `قبل ${years} سنة`;
};


// --- SVG Icons ---
const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);
const ChatIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);
const NotificationIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);

const StopwatchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 100 125" fill="currentColor">
        <path d="M50 10a40 40 0 1040 40 40 40 0 00-40-40zm0 72a32 32 0 1132-32 32 32 0 01-32 32z"/>
        <path d="M46 4h8v8h-8zM68.12 16.88l-5.66 5.66-5.65-5.66 5.65-5.66zM54 50a4 4 0 00-4-4h-4v-12a4 4 0 00-8 0v16a4 4 0 004 4h8a4 4 0 004-4z"/>
    </svg>
);

const ResetIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 4l16 16" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 4v5h-5M4 20v-5h5M4 20L20 4" />
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8z" transform="scale(0.8) translate(3,3)" />
      <path d="M12 7v5l3.5 2" transform="scale(0.8) translate(3,3)" />
    </svg>
);
const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const ImageIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);

const LockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

const BackArrowIcon: React.FC<{ className?: string }> = ({ className }) => (
     <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
);

const HouseIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
);

const SettingsIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const CameraIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2-2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const ShieldCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
);

const LogoutIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const EyeSlashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
);

const PencilIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
    </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

const XMarkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
);

const DotsVerticalIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
);

const FaceSmileIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const PaperAirplaneIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
);

const UserMinusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const UserPlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);


// --- UI Components ---
const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
    <p className="text-center text-red-400 bg-red-900/50 p-2 rounded-lg">{message}</p>
);

// --- Main View Component ---
const MainView: React.FC<ViewProps> = ({ setView, handleGuestLogin }) => {
    return (
        <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4 text-shadow">أهلاً بك في رحلتك نحو التعافي</h1>
            <p className="text-sky-200 mb-8 text-lg">اختر كيف تود المتابعة</p>
            <div className="space-y-4">
                <button
                    onClick={() => setView('login')}
                    className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-sky-400"
                >
                    تسجيل الدخول
                </button>
                <button
                    onClick={() => setView('signup')}
                    className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-teal-500 to-teal-700 hover:from-teal-400 hover:to-teal-600 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-teal-400"
                >
                    إنشاء حساب
                </button>
                 <button
                    onClick={handleGuestLogin}
                    className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-slate-500 to-slate-700 hover:from-slate-400 hover:to-slate-600 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-slate-400"
                >
                    دخول كضيف
                </button>
            </div>
        </div>
    );
};

// --- Login View Component ---
const LoginView: React.FC<ViewProps> = ({ setView }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            await auth.signInWithEmailAndPassword(email, password);
        } catch (err: any) {
            setError(getFirebaseErrorMessage(err.code));
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div>
            <div className="relative mb-8">
                <button 
                    onClick={() => setView('main')} 
                    className="absolute top-1/2 -translate-y-1/2 left-0 p-2 rounded-full text-sky-200 hover:text-white hover:bg-sky-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="العودة"
                >
                    <BackArrowIcon className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold text-center text-white text-shadow">تسجيل الدخول</h2>
            </div>
            <form className="space-y-8" onSubmit={handleSubmit}>
                {error && <ErrorMessage message={error} />}
                <div className="relative z-0">
                    <input
                        type="email"
                        id="login_email"
                        className="block py-2.5 px-0 w-full text-lg text-white bg-transparent border-0 border-b-2 border-sky-400/30 appearance-none focus:outline-none focus:ring-0 focus:border-sky-300 peer"
                        placeholder=" "
                        aria-label="البريد الإلكتروني"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                    <label
                        htmlFor="login_email"
                        className="absolute text-lg text-sky-200 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[100%] peer-focus:origin-[100%] peer-focus:right-0 peer-focus:text-sky-300 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                    >
                        البريد الإلكتروني
                    </label>
                </div>
                <div className="relative z-0">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        id="login_password"
                        className="block py-2.5 px-0 w-full text-lg text-white bg-transparent border-0 border-b-2 border-sky-400/30 appearance-none focus:outline-none focus:ring-0 focus:border-sky-300 peer"
                        placeholder=" "
                        aria-label="كلمة المرور"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                     <label
                        htmlFor="login_password"
                        className="absolute text-lg text-sky-200 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[100%] peer-focus:origin-[100%] peer-focus:right-0 peer-focus:text-sky-300 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                    >
                        كلمة المرور
                    </label>
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute top-1/2 -translate-y-1/2 left-0 p-2 text-sky-200 hover:text-white transition-colors focus:outline-none"
                        aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                        {showPassword ? <EyeSlashIcon className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
                    </button>
                </div>
                <div className="text-left -mt-4">
                     <button
                        type="button"
                        onClick={() => setView('forgot-password')}
                        className="text-sm text-sky-300 hover:text-sky-100 hover:underline focus:outline-none transition"
                    >
                        نسيت كلمة المرور؟
                    </button>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-sky-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale disabled:scale-100"
                >
                    {loading ? 'جارِ الدخول...' : 'تسجيل الدخول'}
                </button>
            </form>
        </div>
    );
};

// --- Signup View Component ---
const SignupView: React.FC<ViewProps> = ({ setView }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('كلمتا المرور غير متطابقتين.');
            return;
        }
        setError('');
        setLoading(true);
        try {
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            if (userCredential.user) {
                await userCredential.user.updateProfile({ displayName: name });
                await userCredential.user.sendEmailVerification();
                // Create user document in Firestore
                await db.collection('users').doc(userCredential.user.uid).set({
                    displayName: name,
                    email: email,
                    photoURL: null,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                });
            }
            setSubmitted(true);
        } catch (err: any) {
            setError(getFirebaseErrorMessage(err.code));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="relative mb-8">
                 <button 
                    onClick={() => setView('main')} 
                    className="absolute top-1/2 -translate-y-1/2 left-0 p-2 rounded-full text-sky-200 hover:text-white hover:bg-sky-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="العودة"
                 >
                    <BackArrowIcon className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold text-center text-white text-shadow">إنشاء حساب جديد</h2>
            </div>
            {submitted ? (
                 <div className="text-center text-white">
                    <p className="mb-4">تم إنشاء حسابك بنجاح!</p>
                    <p className="mb-6 text-sky-200">تم إرسال رسالة التحقق إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد وخاصة مجلد الرسائل غير المرغوب فيها (السبام).</p>
                    <button
                        onClick={() => setView('login')}
                        className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-sky-400"
                    >
                        الذهاب إلى صفحة الدخول
                    </button>
                </div>
            ) : (
                <form className="space-y-8" onSubmit={handleSubmit}>
                    {error && <ErrorMessage message={error} />}
                    <div className="relative z-0">
                        <input
                            type="text"
                            id="signup_name"
                            className="block py-2.5 px-0 w-full text-lg text-white bg-transparent border-0 border-b-2 border-sky-400/30 appearance-none focus:outline-none focus:ring-0 focus:border-sky-300 peer"
                            placeholder=" "
                            aria-label="الاسم الكامل"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                         <label
                            htmlFor="signup_name"
                            className="absolute text-lg text-sky-200 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[100%] peer-focus:origin-[100%] peer-focus:right-0 peer-focus:text-sky-300 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                        >
                            الاسم الكامل
                        </label>
                    </div>
                    <div className="relative z-0">
                        <input
                            type="email"
                            id="signup_email"
                            className="block py-2.5 px-0 w-full text-lg text-white bg-transparent border-0 border-b-2 border-sky-400/30 appearance-none focus:outline-none focus:ring-0 focus:border-sky-300 peer"
                            placeholder=" "
                            aria-label="البريد الإلكتروني"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                         <label
                            htmlFor="signup_email"
                            className="absolute text-lg text-sky-200 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[100%] peer-focus:origin-[100%] peer-focus:right-0 peer-focus:text-sky-300 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                        >
                            البريد الإلكتروني
                        </label>
                    </div>
                    <div className="relative z-0">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="signup_password"
                            className="block py-2.5 px-0 w-full text-lg text-white bg-transparent border-0 border-b-2 border-sky-400/30 appearance-none focus:outline-none focus:ring-0 focus:border-sky-300 peer"
                            placeholder=" "
                            aria-label="كلمة المرور"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <label
                            htmlFor="signup_password"
                            className="absolute text-lg text-sky-200 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[100%] peer-focus:origin-[100%] peer-focus:right-0 peer-focus:text-sky-300 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                        >
                            كلمة المرور
                        </label>
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute top-1/2 -translate-y-1/2 left-0 p-2 text-sky-200 hover:text-white transition-colors focus:outline-none"
                            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                        >
                            {showPassword ? <EyeSlashIcon className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
                        </button>
                    </div>
                     <div className="relative z-0">
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            id="signup_confirm_password"
                            className="block py-2.5 px-0 w-full text-lg text-white bg-transparent border-0 border-b-2 border-sky-400/30 appearance-none focus:outline-none focus:ring-0 focus:border-sky-300 peer"
                            placeholder=" "
                            aria-label="تأكيد كلمة المرور"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                         <label
                            htmlFor="signup_confirm_password"
                            className="absolute text-lg text-sky-200 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[100%] peer-focus:origin-[100%] peer-focus:right-0 peer-focus:text-sky-300 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                        >
                            تأكيد كلمة المرور
                        </label>
                         <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute top-1/2 -translate-y-1/2 left-0 p-2 text-sky-200 hover:text-white transition-colors focus:outline-none"
                            aria-label={showConfirmPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                        >
                            {showConfirmPassword ? <EyeSlashIcon className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
                        </button>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-teal-500 to-teal-700 hover:from-teal-400 hover:to-teal-600 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-teal-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale disabled:scale-100"
                    >
                        {loading ? 'جارِ إنشاء الحساب...' : 'إنشاء الحساب'}
                    </button>
                </form>
            )}
        </div>
    );
};

// --- Forgot Password View Component ---
const ForgotPasswordView: React.FC<ViewProps> = ({ setView }) => {
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await auth.sendPasswordResetEmail(email);
            setSubmitted(true);
        } catch (err: any) {
            if(err.code === 'auth/user-not-found') {
                 setSubmitted(true);
            } else {
                setError(getFirebaseErrorMessage(err.code));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <div className="relative mb-8">
                <button 
                    onClick={() => setView('login')} 
                    className="absolute top-1/2 -translate-y-1/2 left-0 p-2 rounded-full text-sky-200 hover:text-white hover:bg-sky-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="العودة"
                >
                    <BackArrowIcon className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold text-center text-white text-shadow">إعادة تعيين كلمة المرور</h2>
            </div>
            
            {submitted ? (
                <div className="text-center text-white">
                    <p className="mb-4">إذا كان بريدك الإلكتروني مسجلاً لدينا، فسيتم إرسال رسالة إليه.</p>
                    <p className="mb-6 text-sky-200">يرجى التحقق من صندوق الوارد وخاصة مجلد الرسائل غير المرغوب فيها (السبام).</p>
                    <button
                        onClick={() => setView('login')}
                        className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-sky-400"
                    >
                        العودة لتسجيل الدخول
                    </button>
                </div>
            ) : (
                <form className="space-y-8" onSubmit={handleSubmit}>
                    {error && <ErrorMessage message={error} />}
                    <p className="text-center text-sky-200 -mt-4 mb-4">أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطًا لإعادة تعيين كلمة المرور الخاصة بك.</p>
                    <div className="relative z-0">
                        <input
                            type="email"
                            id="forgot_email"
                            className="block py-2.5 px-0 w-full text-lg text-white bg-transparent border-0 border-b-2 border-sky-400/30 appearance-none focus:outline-none focus:ring-0 focus:border-sky-300 peer"
                            placeholder=" "
                            aria-label="البريد الإلكتروني"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                         <label
                            htmlFor="forgot_email"
                            className="absolute text-lg text-sky-200 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[100%] peer-focus:origin-[100%] peer-focus:right-0 peer-focus:text-sky-300 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                        >
                            البريد الإلكتروني
                        </label>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-orange-500 to-orange-700 hover:from-orange-400 hover:to-orange-600 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-orange-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale disabled:scale-100"
                    >
                        {loading ? 'جارِ الإرسال...' : 'إرسال رابط إعادة التعيين'}
                    </button>
                </form>
            )}
        </div>
    );
};

// --- Home View (for logged-in users) ---
interface TimeDifference {
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}

const calculateTimeDifference = (startDate: Date, now: Date): TimeDifference => {
    let s = new Date(startDate);
    let n = new Date(now);

    if (s > n) {
      return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    let yearsDiff = n.getFullYear() - s.getFullYear();
    let monthsDiff = n.getMonth() - s.getMonth();
    let daysDiff = n.getDate() - s.getDate();
    let hoursDiff = n.getHours() - s.getHours();
    let minutesDiff = n.getMinutes() - s.getMinutes();
    let secondsDiff = n.getSeconds() - s.getSeconds();

    if (secondsDiff < 0) { minutesDiff--; secondsDiff += 60; }
    if (minutesDiff < 0) { hoursDiff--; minutesDiff += 60; }
    if (hoursDiff < 0) { daysDiff--; hoursDiff += 24; }
    if (daysDiff < 0) { 
        monthsDiff--;
        const daysInLastMonth = new Date(n.getFullYear(), n.getMonth(), 0).getDate();
        daysDiff += daysInLastMonth; 
    }
    if (monthsDiff < 0) { yearsDiff--; monthsDiff += 12; }

    const totalMonths = yearsDiff * 12 + monthsDiff;

    return { months: totalMonths, days: daysDiff, hours: hoursDiff, minutes: minutesDiff, seconds: secondsDiff };
};

const CounterBar: React.FC<{ label: string; progress: number; colorClass: string }> = ({ label, progress, colorClass }) => {
    return (
        <div className="flex-grow h-12 bg-black/40 rounded-lg p-1 relative">
            <div
                className={`${colorClass} h-full rounded-md transition-none`}
                style={{ width: `${progress}%` }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-lg text-shadow">{label}</span>
            </div>
        </div>
    );
};


const HomeView: React.FC<{ 
    user: firebase.User; 
    setActiveTab: (tab: LoggedInView) => void; 
    startDate: Date | null; 
    handleStartCounter: () => void;
    counterImage: string | null;
    setShowNotifications: (show: boolean) => void;
    setShowChat: (show: boolean) => void;
}> = ({ user, setActiveTab, startDate, handleStartCounter, counterImage, setShowNotifications, setShowChat }) => {
    const [now, setNow] = useState(() => new Date());
    const animationFrameId = useRef<number>();

    useEffect(() => {
        let frameId: number;
        const updateNow = () => {
            setNow(new Date());
            frameId = requestAnimationFrame(updateNow);
        };

        if (startDate) {
            frameId = requestAnimationFrame(updateNow);
            animationFrameId.current = frameId;
        }

        return () => {
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [startDate]);

    const timeDiff = startDate ? calculateTimeDifference(startDate, now) : { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
    const milliseconds = now.getMilliseconds();
    
    const currentDate = new Date().toLocaleDateString('ar-IQ', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const daysInCurrentMonth = startDate ? new Date(startDate.getFullYear(), startDate.getMonth() + timeDiff.months + 1, 0).getDate() : 30;

    const cardStyle = counterImage ? { backgroundImage: `url(${counterImage})` } : {};
    const cardClasses = `w-full max-w-sm mx-auto p-4 rounded-2xl border border-white/10 relative overflow-hidden transition-all duration-500 ${
        counterImage ? 'bg-cover bg-center' : 'bg-gradient-to-br from-teal-500/30 to-sky-600/30 backdrop-blur-sm'
    }`;

    if (!startDate) {
        return (
            <div className="text-white">
                <header className="flex justify-between items-center w-full pt-4">
                     <div>
                        <h1 className="text-xl font-bold text-shadow">
                            مرحباً، {user.displayName || 'زائر'}
                        </h1>
                        <p className="text-sm text-sky-300">{currentDate}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowNotifications(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors"><NotificationIcon className="w-6 h-6"/></button>
                        <button onClick={() => setShowChat(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors"><ChatIcon className="w-6 h-6"/></button>
                        <button onClick={() => setActiveTab('settings')} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                            <UserIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </header>
                
                <main className="pt-8">
                    <div style={cardStyle} className={cardClasses}>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <StopwatchIcon className="w-36 h-36 text-white/10" />
                        </div>
                       <div className="relative z-10">
                            <div className="space-y-3">
                                <div className="flex items-center justify-end pl-2">
                                    <button onClick={() => setActiveTab('counter-settings')} className="p-2 rounded-full hover:bg-white/10">
                                        <SettingsIcon className="w-6 h-6 text-white"/>
                                    </button>
                                </div>
                                <CounterBar label={`0 شهران`} progress={0} colorClass="bg-orange-500" />
                                <CounterBar label={`0 أيام`} progress={0} colorClass="bg-lime-500" />
                                <CounterBar label={`0 ساعات`} progress={0} colorClass="bg-blue-500" />
                                <CounterBar label={`0 دقائق`} progress={0} colorClass="bg-pink-500" />
                                <CounterBar label={`0 ثواني`} progress={0} colorClass="bg-yellow-500" />
                            </div>
                       </div>
                    </div>
                </main>

                <div className="mt-8 max-w-sm mx-auto">
                    <button 
                        onClick={handleStartCounter}
                        className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-sky-400"
                    >
                        هل تريد بدء حساب الأيام؟
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="text-white">
            <header className="flex justify-between items-center w-full pt-4">
                 <div>
                    <h1 className="text-xl font-bold text-shadow">
                        مرحباً، {user.displayName || 'زائر'}
                    </h1>
                    <p className="text-sm text-sky-300">{currentDate}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowNotifications(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors"><NotificationIcon className="w-6 h-6"/></button>
                    <button onClick={() => setShowChat(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors"><ChatIcon className="w-6 h-6"/></button>
                    <button onClick={() => setActiveTab('settings')} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <UserIcon className="w-6 h-6"/>
                    </button>
                </div>
            </header>
            
            <main className="pt-8">
                <div style={cardStyle} className={cardClasses}>
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <StopwatchIcon className="w-36 h-36 text-white/10" />
                    </div>
                   <div className="relative z-10">
                        <div className="space-y-3">
                            <div className="flex items-center justify-end pl-2">
                                <button onClick={() => setActiveTab('counter-settings')} className="p-2 rounded-full hover:bg-white/10">
                                    <SettingsIcon className="w-6 h-6 text-white"/>
                                </button>
                            </div>
                            <CounterBar label={`${timeDiff.months} شهران`} progress={(timeDiff.days / daysInCurrentMonth) * 100} colorClass="bg-orange-500" />
                            <CounterBar label={`${timeDiff.days} أيام`} progress={(timeDiff.hours / 24) * 100} colorClass="bg-lime-500" />
                            <CounterBar label={`${timeDiff.hours} ساعات`} progress={(timeDiff.minutes / 60) * 100} colorClass="bg-blue-500" />
                            <CounterBar label={`${timeDiff.minutes} دقائق`} progress={(timeDiff.minutes / 60) * 100} colorClass="bg-pink-500" />
                            <CounterBar label={`${timeDiff.seconds} ثواني`} progress={((timeDiff.seconds * 1000 + milliseconds) / 60000) * 100} colorClass="bg-yellow-500" />
                        </div>
                   </div>
                </div>
            </main>
        </div>
    );
};

// --- App Lock Components ---
const SetPinModal: React.FC<{ onPinSet: (pin: string) => void; onClose: () => void; }> = ({ onPinSet, onClose }) => {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        setError('');
        if (!pin || pin.length < 4) {
            setError('يجب أن يتكون الرمز من 4 أرقام على الأقل.');
            return;
        }
        if (pin !== confirmPin) {
            setError('الرمزان غير متطابقين.');
            return;
        }
        onPinSet(pin);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-sm bg-sky-950 border border-sky-500/50 rounded-lg p-6 space-y-4">
                <h3 className="text-xl font-bold text-sky-300">تعيين رمز قفل التطبيق</h3>
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                <input
                    type="password"
                    placeholder="أدخل الرمز الجديد"
                    className="w-full bg-black/30 border border-sky-400/50 rounded-md p-2 text-center text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={4}
                />
                <input
                    type="password"
                    placeholder="تأكيد الرمز الجديد"
                    className="w-full bg-black/30 border border-sky-400/50 rounded-md p-2 text-center text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    maxLength={4}
                />
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500">إلغاء</button>
                    <button onClick={handleSubmit} className="px-4 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-sky-600 to-sky-800 hover:from-sky-500 hover:to-sky-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-sky-500">تأكيد</button>
                </div>
            </div>
        </div>
    );
};

const LockScreen: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const storedPin = localStorage.getItem('appLockPin');
        if (pin === storedPin) {
            onUnlock();
        } else {
            setError('الرمز غير صحيح. حاول مرة أخرى.');
            setPin('');
        }
    };
    
    return (
        <main 
            className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop')" }}
        >
            <div className="w-full max-w-sm bg-sky-950/80 rounded-2xl shadow-xl p-8 space-y-6 relative backdrop-blur-xl border border-sky-300/30 text-white">
                <div className="text-center">
                    <LockIcon className="w-12 h-12 mx-auto text-sky-300 mb-4"/>
                    <h2 className="text-2xl font-bold">التطبيق مقفل</h2>
                    <p className="text-sky-300">الرجاء إدخال الرمز لفتح التطبيق</p>
                </div>
                {error && <p className="text-red-400 text-sm text-center -mb-2">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="password"
                        className="w-full bg-black/30 border border-sky-400/50 rounded-md p-3 text-center text-white tracking-[1em] text-2xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        maxLength={4}
                        autoFocus
                    />
                     <button
                        type="submit"
                        className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-sky-400"
                    >
                        فتح
                    </button>
                </form>
            </div>
        </main>
    );
};


// --- Settings View ---
const SetStartDateModal: React.FC<{ onClose: () => void; onSave: (date: string) => void; }> = ({ onClose, onSave }) => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    const handleSave = () => {
        onSave(selectedDate);
    };
    
    return (
         <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-sm bg-sky-950 border border-sky-500/50 rounded-lg p-6 space-y-4 text-white">
                 <h3 className="text-xl font-bold text-sky-300">تعيين تاريخ بداية جديد</h3>
                 <p className="text-sky-200">اختر التاريخ الذي تريد أن يبدأ العداد منه.</p>
                 <input
                    type="date"
                    className="w-full bg-black/30 border border-sky-400/50 rounded-md p-2 text-center text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                 />
                 <div className="flex justify-end gap-4 pt-2">
                    <button onClick={onClose} className="px-4 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500">إلغاء</button>
                    <button onClick={handleSave} className="px-4 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-sky-600 to-sky-800 hover:from-sky-500 hover:to-sky-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-sky-500">حفظ</button>
                </div>
            </div>
        </div>
    );
};

const BlockedUsersManager: React.FC<{ blockedUids: string[]; onUnblock: (uid: string) => void; }> = ({ blockedUids, onUnblock }) => {
    const [blockedProfiles, setBlockedProfiles] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (blockedUids.length === 0) {
            setBlockedProfiles([]);
            setLoading(false);
            return;
        }

        const fetchProfiles = async () => {
            setLoading(true);
            const profiles: UserProfile[] = [];
            for (const uid of blockedUids) {
                try {
                    const userDoc = await db.collection('users').doc(uid).get();
                    if (userDoc.exists) {
                        profiles.push({ uid, ...(userDoc.data() as Omit<UserProfile, 'uid'>) });
                    }
                } catch (error) {
                    console.error(`Failed to fetch profile for UID ${uid}`, error);
                }
            }
            setBlockedProfiles(profiles);
            setLoading(false);
        };

        fetchProfiles();
    }, [blockedUids]);

    return (
        <div className="p-4 bg-sky-900/30 rounded-lg space-y-2">
            <h3 className="text-lg font-semibold text-sky-200 px-2">المستخدمون المحظورون</h3>
            {loading ? (
                <p className="text-center text-sky-300">جارِ التحميل...</p>
            ) : blockedProfiles.length > 0 ? (
                <ul className="space-y-2">
                    {blockedProfiles.map(profile => (
                        <li key={profile.uid} className="flex justify-between items-center p-2 rounded-lg hover:bg-sky-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <img
                                    src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName || ' '}&background=0284c7&color=fff&size=128`}
                                    alt={profile.displayName}
                                    className="w-10 h-10 rounded-full object-cover"
                                />
                                <span>{profile.displayName}</span>
                            </div>
                            <button onClick={() => onUnblock(profile.uid)} className="px-3 py-1 text-sm bg-sky-600 hover:bg-sky-500 rounded-md transition-colors">إلغاء الحظر</button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-sky-400 p-2">لا يوجد مستخدمون محظورون.</p>
            )}
        </div>
    );
};


const SettingsView: React.FC<{ 
    user: firebase.User; 
    handleSignOut: () => void; 
    blockedUsers: string[];
    handleUnblockUser: (uid: string) => void;
}> = ({ user, handleSignOut, blockedUsers, handleUnblockUser }) => {
    const [displayName, setDisplayName] = useState(user.displayName || '');
    const [photoPreview, setPhotoPreview] = useState<string | null>(user.photoURL || null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    
    const [appLockEnabled, setAppLockEnabled] = useState(!!localStorage.getItem('appLockPin'));
    const [showSetPinModal, setShowSetPinModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');

    useEffect(() => {
        setDisplayName(user.displayName || '');
        setPhotoPreview(user.photoURL || null);
    }, [user]);

    const handleImageUpload = () => {
        const dialog = uploadcare.openDialog(null, {
            publicKey: 'e5cdcd97e0e41d6aa881',
            imagesOnly: true,
            crop: "1:1",
        });

        dialog.done((file: any) => {
            file.promise().done((fileInfo: any) => {
                setPhotoPreview(fileInfo.cdnUrl);
            });
        });
    };

    const handleSaveProfile = async () => {
        if (displayName === (user.displayName || '') && photoPreview === (user.photoURL || null)) {
            setMessage('لم يتم إجراء أي تغييرات.');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');
        try {
            await user.updateProfile({
                displayName: displayName,
                photoURL: photoPreview,
            });

            if (user.isAnonymous) {
                localStorage.setItem('guestProfile', JSON.stringify({
                    displayName: displayName,
                    photoURL: photoPreview,
                }));
            } else {
                await db.collection('users').doc(user.uid).update({
                    displayName: displayName,
                    photoURL: photoPreview,
                });
            }
            
            setMessage('تم تحديث الملف الشخصي بنجاح!');
            setTimeout(() => setMessage(''), 3000);

        } catch (error) {
            console.error("Error updating profile: ", error);
            setError('حدث خطأ أثناء تحديث الملف الشخصي.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleDeleteAccount = async () => {
        if (deleteConfirmation !== 'حذف') {
            setError('الرجاء كتابة "حذف" للتأكيد.');
            return;
        }
        setLoading(true);
        setError('');
        setMessage('');
        try {
            await user.delete();
            // Auth state change will handle redirect
        } catch (err: any) {
            setError(getFirebaseErrorMessage(err.code));
            setShowDeleteModal(false); // Close modal to show error on main settings page
        } finally {
            setLoading(false);
        }
    };
    
    const handleAppLockToggle = () => {
        if (appLockEnabled) {
            localStorage.removeItem('appLockPin');
            setAppLockEnabled(false);
        } else {
            setShowSetPinModal(true);
        }
    };
    
    const handlePinSet = (pin: string) => {
        localStorage.setItem('appLockPin', pin);
        setAppLockEnabled(true);
        setShowSetPinModal(false);
    };

    return (
        <div className="text-white space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-center text-white text-shadow">الإعدادات</h1>
            </header>
            
            {error && <ErrorMessage message={error} />}

            {/* Profile Section */}
            <div className="space-y-6 p-6 bg-sky-900/30 rounded-lg">
                <h2 className="text-xl font-semibold text-sky-200 border-b border-sky-400/30 pb-2">الملف الشخصي</h2>
                
                <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                        <img 
                            src={photoPreview || `https://ui-avatars.com/api/?name=${displayName || 'زائر'}&background=0ea5e9&color=fff&size=128`}
                            alt="الملف الشخصي"
                            className="w-32 h-32 rounded-full object-cover border-4 border-sky-400/50"
                        />
                        <button
                            onClick={handleImageUpload}
                            className="absolute bottom-0 right-0 bg-sky-600 p-2 rounded-full hover:bg-sky-500 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300"
                            aria-label="تغيير الصورة"
                        >
                            <CameraIcon className="w-6 h-6 text-white"/>
                        </button>
                    </div>
                </div>

                <div className="relative z-0 pt-4">
                     <input
                        id="displayName"
                        type="text"
                        className="block py-2.5 px-0 w-full text-lg text-white bg-transparent border-0 border-b-2 border-sky-400/30 appearance-none focus:outline-none focus:ring-0 focus:border-sky-300 peer"
                        placeholder=" "
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                    />
                    <label
                        htmlFor="displayName"
                        className="absolute text-lg text-sky-200 duration-300 transform -translate-y-6 scale-75 top-7 -z-10 origin-[100%] peer-focus:origin-[100%] peer-focus:right-0 peer-focus:text-sky-300 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                    >
                        الاسم
                    </label>
                </div>
                
                <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-teal-500 to-teal-700 hover:from-teal-400 hover:to-teal-600 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-teal-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale disabled:scale-100"
                >
                    {loading ? 'جارِ الحفظ...' : 'حفظ التغييرات'}
                </button>
                {message && <p className="text-center text-green-300 mt-2 text-sm">{message}</p>}
            </div>

            {/* Security Section */}
            <div className="p-4 bg-sky-900/30 rounded-lg space-y-2">
                <h3 className="text-lg font-semibold text-sky-200 px-2">الأمان</h3>
                <div className="flex justify-between items-center p-2 rounded-lg hover:bg-sky-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                        <ShieldCheckIcon className="w-6 h-6 text-sky-300"/>
                        <span>قفل التطبيق</span>
                    </div>
                    <label htmlFor="app-lock-toggle" className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="app-lock-toggle" className="sr-only peer" checked={appLockEnabled} onChange={handleAppLockToggle} />
                        <div className="w-11 h-6 bg-gray-500 rounded-full peer peer-focus:ring-2 peer-focus:ring-sky-400 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                </div>
                 <button onClick={handleSignOut} className="flex justify-between items-center w-full p-2 rounded-lg hover:bg-sky-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                        <LogoutIcon className="w-6 h-6 text-sky-300"/>
                        <span>تسجيل الخروج</span>
                    </div>
                </button>
            </div>
            
            {!user.isAnonymous && <BlockedUsersManager blockedUids={blockedUsers} onUnblock={handleUnblockUser} />}

            {/* Danger Zone */}
            <div className="p-4 bg-red-900/30 rounded-lg space-y-2">
                <h3 className="text-lg font-semibold text-red-300 px-2">منطقة الخطر</h3>
                <button onClick={() => setShowDeleteModal(true)} className="flex justify-between items-center w-full p-2 rounded-lg hover:bg-red-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                        <TrashIcon className="w-6 h-6 text-red-400"/>
                        <span className="text-red-400">حذف الحساب</span>
                    </div>
                </button>
            </div>

            {/* Modals */}
            {showSetPinModal && <SetPinModal onPinSet={handlePinSet} onClose={() => setShowSetPinModal(false)} />}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-sm bg-sky-950 border border-red-500/50 rounded-lg p-6 space-y-4">
                        <h3 className="text-xl font-bold text-red-400">تأكيد حذف الحساب</h3>
                        <p className="text-sky-200">
                            هل أنت متأكد من رغبتك في حذف حسابك؟ سيتم حذف جميع بياناتك بشكل دائم ولا يمكن التراجع عن هذا الإجراء.
                        </p>
                        <p className="text-sm text-sky-300">للتأكيد، يرجى كتابة <span className="font-bold text-red-400">حذف</span> في المربع أدناه.</p>
                        <input
                            type="text"
                            className="w-full bg-black/30 border border-red-400/50 rounded-md p-2 text-center text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                        />
                        <div className="flex justify-end gap-4">
                            <button 
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500"
                            >
                                إلغاء
                            </button>
                             <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmation !== 'حذف' || loading}
                                className="px-4 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale disabled:scale-100"
                            >
                                {loading ? 'جارِ الحذف...' : 'تأكيد الحذف'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- Counter Settings View ---
const CounterSettingsView: React.FC<{
    setActiveTab: (tab: LoggedInView) => void;
    handleResetCounter: () => void;
    setShowSetDateModal: (show: boolean) => void;
    handleSetCounterImage: (url: string) => void;
    handleDeleteCounterImage: () => void;
    hasCustomImage: boolean;
    isDeveloper: boolean;
}> = ({ setActiveTab, handleResetCounter, setShowSetDateModal, handleSetCounterImage, handleDeleteCounterImage, hasCustomImage, isDeveloper }) => {
    
    const handleUploadClick = () => {
        const dialog = uploadcare.openDialog(null, {
            publicKey: 'e5cdcd97e0e41d6aa881',
            imagesOnly: true,
            crop: "1:1.25",
        });

        dialog.done((file: any) => {
            file.promise().done((fileInfo: any) => {
                handleSetCounterImage(fileInfo.cdnUrl);
            });
        });
    };
    
    return (
        <div className="text-white pt-4">
             <header className="relative mb-6">
                 <button 
                    onClick={() => setActiveTab('home')} 
                    className="absolute top-1/2 -translate-y-1/2 left-0 p-2 rounded-full text-sky-200 hover:text-white hover:bg-sky-500/20 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500"
                    aria-label="العودة"
                 >
                    <BackArrowIcon className="w-6 h-6" />
                </button>
                <h1 className="text-2xl font-bold text-center text-white text-shadow">
                    اعدادات العداد
                </h1>
            </header>

            <div className="mt-8 p-4 bg-sky-900/30 rounded-lg space-y-2 max-w-sm mx-auto">
                <button onClick={handleResetCounter} className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-white/10 transition-colors">
                    <ResetIcon className="w-6 h-6 text-yellow-300"/>
                    <span>تصفير العداد</span>
                </button>
                <button onClick={() => setShowSetDateModal(true)} className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-white/10 transition-colors">
                    <CalendarIcon className="w-6 h-6 text-teal-300"/>
                    <span>تعيين تاريخ بداية جديد</span>
                </button>
                
                {isDeveloper && (
                    <>
                        <button onClick={handleUploadClick} className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-white/10 transition-colors">
                            <ImageIcon className="w-6 h-6 text-cyan-300"/>
                            <span>{hasCustomImage ? 'تغيير صورة العداد' : 'إضافة صورة للعداد'}</span>
                        </button>
                        {hasCustomImage && (
                             <button onClick={handleDeleteCounterImage} className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-white/10 transition-colors">
                                <TrashIcon className="w-6 h-6 text-red-400"/>
                                <span className="text-red-400">حذف صورة العداد</span>
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

// --- Bottom Navigation Bar ---
const BottomNavBar: React.FC<{ activeTab: LoggedInView; setActiveTab: (tab: LoggedInView) => void; }> = ({ activeTab, setActiveTab }) => {
    const navItems = [
        { id: 'home', label: 'الرئيسية', icon: HouseIcon },
        { id: 'settings', label: 'الإعدادات', icon: SettingsIcon },
    ];
    
    if (activeTab === 'counter-settings') {
        return null; // Hide nav bar on counter settings page
    }

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-sky-950/90 border-t border-sky-300/30 backdrop-blur-lg z-20">
            <div className="flex justify-around items-center h-16 max-w-md mx-auto">
                {navItems.map(item => (
                    <button 
                        key={item.id}
                        onClick={() => setActiveTab(item.id as LoggedInView)}
                        className={`flex flex-col items-center justify-center space-y-1 w-full text-sm transition-colors duration-200 ${
                            activeTab === item.id ? 'text-sky-300' : 'text-sky-500 hover:text-sky-300'
                        }`}
                        aria-current={activeTab === item.id ? 'page' : undefined}
                    >
                        <item.icon className="w-7 h-7" />
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
};

const ResetConfirmationModal: React.FC<{ onConfirm: () => void; onClose: () => void; }> = ({ onConfirm, onClose }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-sm bg-sky-950 border border-yellow-500/50 rounded-lg p-6 space-y-4 text-white">
            <h3 className="text-xl font-bold text-yellow-300 text-center">تأكيد تصفير العداد</h3>
            <p className="text-sky-200 text-center">
                هل أنت متأكد من رغبتك في تصفير العداد؟ سيبدأ العد من اللحظة الحالية.
            </p>
            <div className="flex justify-center gap-4 pt-4">
                <button 
                    onClick={onClose}
                    className="px-6 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500"
                >
                    لا
                </button>
                 <button
                    onClick={onConfirm}
                    className="px-6 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-yellow-600 to-yellow-800 hover:from-yellow-500 hover:to-yellow-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-yellow-500"
                >
                    نعم، قم بالتصفير
                </button>
            </div>
        </div>
    </div>
);

const DeleteImageConfirmationModal: React.FC<{ onConfirm: () => void; onClose: () => void; }> = ({ onConfirm, onClose }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-sm bg-sky-950 border border-red-500/50 rounded-lg p-6 space-y-4 text-white">
            <h3 className="text-xl font-bold text-red-400 text-center">تأكيد حذف الصورة</h3>
            <p className="text-sky-200 text-center">
                هل أنت متأكد من رغبتك في حذف صورة العداد المخصصة؟
            </p>
            <div className="flex justify-center gap-4 pt-4">
                <button 
                    onClick={onClose}
                    className="px-6 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500"
                >
                    إلغاء
                </button>
                 <button
                    onClick={onConfirm}
                    className="px-6 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-red-500"
                >
                    نعم، قم بالحذف
                </button>
            </div>
        </div>
    </div>
);

// --- Notification Components ---
const DeleteNotificationConfirmationModal: React.FC<{ onConfirm: () => void; onClose: () => void; }> = ({ onConfirm, onClose }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="w-full max-w-sm bg-sky-950 border border-red-500/50 rounded-lg p-6 space-y-4 text-white">
            <h3 className="text-xl font-bold text-red-400 text-center">تأكيد حذف الإشعار</h3>
            <p className="text-sky-200 text-center">هل أنت متأكد من رغبتك في حذف هذا الإشعار بشكل دائم؟</p>
            <div className="flex justify-center gap-4 pt-4">
                <button onClick={onClose} className="px-6 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500">
                    إلغاء
                </button>
                <button onClick={onConfirm} className="px-6 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-red-500">
                    حذف
                </button>
            </div>
        </div>
    </div>
);

const NotificationsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    notifications: Notification[];
    isDeveloper: boolean;
}> = ({ isOpen, onClose, notifications, isDeveloper }) => {
    const [isFormVisible, setFormVisible] = useState(false);
    const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notificationToDelete, setNotificationToDelete] = useState<Notification | null>(null);

    useEffect(() => {
        if (!isOpen) {
            // Reset state when modal is closed
            setFormVisible(false);
            setEditingNotification(null);
            setError('');
            setTitle('');
            setMessage('');
        }
    }, [isOpen]);

    const handleShowFormForNew = () => {
        setEditingNotification(null);
        setTitle('');
        setMessage('');
        setFormVisible(true);
    };

    const handleShowFormForEdit = (notification: Notification) => {
        setEditingNotification(notification);
        setTitle(notification.title);
        setMessage(notification.message);
        setFormVisible(true);
    };

    const handleCancelForm = () => {
        setFormVisible(false);
        setEditingNotification(null);
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) {
            setError('يجب ملء حقل العنوان والرسالة.');
            return;
        }
        setLoading(true);
        setError('');

        try {
            if (editingNotification) {
                // Update existing notification
                await db.collection('notifications').doc(editingNotification.id).update({ title, message });
            } else {
                // Create new notification
                await db.collection('notifications').add({
                    title,
                    message,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            handleCancelForm();
        } catch (err) {
            console.error("Error saving notification:", err);
            setError('حدث خطأ أثناء حفظ الإشعار.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!notificationToDelete) return;
        setLoading(true);
        try {
            await db.collection('notifications').doc(notificationToDelete.id).delete();
            setNotificationToDelete(null);
        } catch (err) {
            console.error("Error deleting notification:", err);
            setError('حدث خطأ أثناء حذف الإشعار.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const ViewComponent = (
        <div className="p-4 space-y-4">
            {isDeveloper && (
                <button onClick={handleShowFormForNew} className="w-full flex items-center justify-center gap-2 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-teal-500 to-teal-700 hover:from-teal-400 hover:to-teal-600 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-teal-400">
                    <PlusIcon className="w-6 h-6" />
                    <span>إشعار جديد</span>
                </button>
            )}
            {notifications.length > 0 ? (
                notifications.map(notification => (
                    <div key={notification.id} className="bg-sky-900/50 p-4 rounded-lg border border-sky-400/20">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-sky-200">{notification.title}</h3>
                                <p className="text-sm text-sky-400 mt-1 mb-2 whitespace-pre-wrap">{notification.message}</p>
                                <p className="text-xs text-sky-500">{notification.timestamp ? formatDistanceToNow(notification.timestamp.toDate()) : '...'}</p>
                            </div>
                            {isDeveloper && (
                                <div className="flex gap-2 flex-shrink-0">
                                    <button onClick={() => handleShowFormForEdit(notification)} className="p-2 text-yellow-300 hover:text-yellow-100 hover:bg-white/10 rounded-full transition-colors"><PencilIcon className="w-5 h-5"/></button>
                                    <button onClick={() => setNotificationToDelete(notification)} className="p-2 text-red-400 hover:text-red-200 hover:bg-white/10 rounded-full transition-colors"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            )}
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-center text-sky-400 py-8">لا توجد إشعارات حالياً.</p>
            )}
        </div>
    );

    const FormComponent = (
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
            {error && <ErrorMessage message={error} />}
            <div className="relative z-0">
                <input id="notif_title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="block py-2.5 px-0 w-full text-lg text-white bg-transparent border-0 border-b-2 border-sky-400/30 appearance-none focus:outline-none focus:ring-0 focus:border-sky-300 peer" placeholder=" " required />
                <label htmlFor="notif_title" className="absolute text-lg text-sky-200 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[100%] peer-focus:origin-[100%] peer-focus:right-0 peer-focus:text-sky-300 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">العنوان</label>
            </div>
            <div className="relative z-0">
                <textarea id="notif_message" value={message} onChange={(e) => setMessage(e.target.value)} className="block py-2.5 px-0 w-full h-32 text-lg text-white bg-transparent border-0 border-b-2 border-sky-400/30 appearance-none focus:outline-none focus:ring-0 focus:border-sky-300 peer" placeholder=" " required />
                <label htmlFor="notif_message" className="absolute text-lg text-sky-200 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[100%] peer-focus:origin-[100%] peer-focus:right-0 peer-focus:text-sky-300 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">الرسالة</label>
            </div>
            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={handleCancelForm} className="px-4 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500">إلغاء</button>
                <button type="submit" disabled={loading} className="px-4 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-sky-600 to-sky-800 hover:from-sky-500 hover:to-sky-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? 'جارِ الحفظ...' : 'حفظ'}
                </button>
            </div>
        </form>
    );

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
            <div className="w-full h-full max-w-md bg-sky-950/90 text-white flex flex-col">
                <header className="flex items-center justify-between p-4 border-b border-sky-400/30 flex-shrink-0">
                    <h2 className="text-xl font-bold text-sky-200 text-shadow">
                        {isFormVisible ? (editingNotification ? 'تعديل الإشعار' : 'إشعار جديد') : 'الإشعارات'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </header>
                <main className="flex-grow overflow-y-auto">
                    {isFormVisible ? FormComponent : ViewComponent}
                </main>
            </div>
            {notificationToDelete && <DeleteNotificationConfirmationModal onConfirm={handleDelete} onClose={() => setNotificationToDelete(null)} />}
        </div>
    );
};

// --- Chat Component ---
const MessageActionModal: React.FC<{
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ onClose, onEdit, onDelete }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
        <div className="w-full max-w-sm bg-sky-950/90 border border-sky-500/50 rounded-lg p-6 space-y-4 text-white" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-sky-300 text-center">إجراءات الرسالة</h3>
            <div className="flex flex-col gap-4 pt-4">
                <button onClick={onEdit} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-sky-800/50 hover:bg-sky-700/70">
                    <PencilIcon className="w-6 h-6 text-yellow-300"/>
                    <span>تعديل</span>
                </button>
                <button onClick={onDelete} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-red-800/50 hover:bg-red-700/70">
                    <TrashIcon className="w-6 h-6 text-red-400"/>
                    <span className="text-red-400">حذف</span>
                </button>
            </div>
        </div>
    </div>
);

const UserActionModal: React.FC<{
    userProfile: UserProfile;
    onClose: () => void;
    onStartPrivateChat: () => void;
    onBlockUser: () => void;
    onUnblockUser: () => void;
    isBlocked: boolean;
}> = ({ userProfile, onClose, onStartPrivateChat, onBlockUser, onUnblockUser, isBlocked }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
        <div className="w-full max-w-sm bg-sky-950/90 border border-sky-500/50 rounded-lg p-6 space-y-4 text-white" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-sky-300 text-center truncate">خيارات لـ {userProfile.displayName}</h3>
            <div className="flex flex-col gap-4 pt-4">
                <button onClick={onStartPrivateChat} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-sky-800/50 hover:bg-sky-700/70">
                    <PaperAirplaneIcon className="w-6 h-6 text-sky-300"/>
                    <span>إرسال رسالة خاصة</span>
                </button>
                {!isBlocked ? (
                    <button onClick={onBlockUser} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-red-800/50 hover:bg-red-700/70">
                        <UserMinusIcon className="w-6 h-6 text-red-400"/>
                        <span className="text-red-400">حظر المستخدم</span>
                    </button>
                ) : (
                     <button onClick={onUnblockUser} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-green-800/50 hover:bg-green-700/70">
                        <UserPlusIcon className="w-6 h-6 text-green-400"/>
                        <span className="text-green-400">إلغاء حظر المستخدم</span>
                    </button>
                )}
            </div>
        </div>
    </div>
);

const DeleteMessageConfirmationModal: React.FC<{ onConfirm: () => void; onClose: () => void; }> = ({ onConfirm, onClose }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="w-full max-w-sm bg-sky-950 border border-red-500/50 rounded-lg p-6 space-y-4 text-white">
            <h3 className="text-xl font-bold text-red-400 text-center">تأكيد حذف الرسالة</h3>
            <p className="text-sky-200 text-center">هل أنت متأكد من رغبتك في حذف هذه الرسالة بشكل دائم؟</p>
            <div className="flex justify-center gap-4 pt-4">
                <button onClick={onClose} className="px-6 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500">
                    إلغاء
                </button>
                <button onClick={onConfirm} className="px-6 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-red-500">
                    حذف
                </button>
            </div>
        </div>
    </div>
);

const BlockUserConfirmationModal: React.FC<{ userName: string; onConfirm: () => void; onClose: () => void; }> = ({ userName, onConfirm, onClose }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="w-full max-w-sm bg-sky-950 border border-red-500/50 rounded-lg p-6 space-y-4 text-white">
            <h3 className="text-xl font-bold text-red-400 text-center">تأكيد حظر المستخدم</h3>
            <p className="text-sky-200 text-center">
                هل أنت متأكد أنك تريد حظر {userName}؟ لن ترى رسائلهم بعد الآن.
            </p>
            <div className="flex justify-center gap-4 pt-4">
                <button onClick={onClose} className="px-6 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500">
                    إلغاء
                </button>
                <button onClick={onConfirm} className="px-6 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-red-500">
                    حظر
                </button>
            </div>
        </div>
    </div>
);

const DeleteConversationConfirmationModal: React.FC<{ onConfirm: () => void; onClose: () => void; }> = ({ onConfirm, onClose }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="w-full max-w-sm bg-sky-950 border border-red-500/50 rounded-lg p-6 space-y-4 text-white">
            <h3 className="text-xl font-bold text-red-400 text-center">تأكيد حذف المحادثة</h3>
            <p className="text-sky-200 text-center">هل أنت متأكد من رغبتك في حذف هذه المحادثة من قائمتك؟</p>
            <div className="flex justify-center gap-4 pt-4">
                <button onClick={onClose} className="px-6 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500">
                    إلغاء
                </button>
                <button onClick={onConfirm} className="px-6 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-red-500">
                    حذف
                </button>
            </div>
        </div>
    </div>
);


const PrivateConversationsList: React.FC<{
    user: firebase.User;
    onConversationSelect: (user: UserProfile) => void;
}> = ({ user, onConversationSelect }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);

    useEffect(() => {
        const conversationsRef = db.collection('users').doc(user.uid).collection('conversations').orderBy('lastMessageTimestamp', 'desc');
        const unsubscribe = conversationsRef.onSnapshot(snapshot => {
            const convos = snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data(),
            } as Conversation));
            setConversations(convos);
            setLoading(false);
        }, err => {
            console.error("Error fetching conversations:", err);
            setLoading(false);
        });
        return unsubscribe;
    }, [user.uid]);

    const handleDelete = async () => {
        if (!conversationToDelete) return;
        try {
            await db.collection('users').doc(user.uid).collection('conversations').doc(conversationToDelete.uid).delete();
            setConversationToDelete(null);
        } catch (error) {
            console.error("Error deleting conversation:", error);
        }
    };
    
    if(loading) {
        return <p className="text-center text-sky-400 py-8">جارِ تحميل المحادثات...</p>
    }

    if(conversations.length === 0) {
        return <p className="text-center text-sky-400 py-8">لا توجد محادثات خاصة.</p>
    }

    return (
        <div className="p-2 space-y-2">
            {conversations.map(convo => (
                <div key={convo.uid} className="flex items-center justify-between p-2 rounded-lg hover:bg-sky-800/50 group">
                    <button onClick={() => onConversationSelect(convo)} className="flex-grow flex items-center gap-3 text-right">
                         <img
                            src={convo.photoURL || `https://ui-avatars.com/api/?name=${convo.displayName || ' '}&background=0284c7&color=fff&size=128`}
                            alt={convo.displayName}
                            className="w-12 h-12 rounded-full object-cover"
                        />
                        <span className="font-semibold">{convo.displayName}</span>
                    </button>
                    <button onClick={() => setConversationToDelete(convo)} className="p-2 text-red-500 hover:text-red-300 hover:bg-white/10 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                        <TrashIcon className="w-5 h-5"/>
                    </button>
                </div>
            ))}
            {conversationToDelete && (
                <DeleteConversationConfirmationModal 
                    onConfirm={handleDelete}
                    onClose={() => setConversationToDelete(null)}
                />
            )}
        </div>
    );
};

const EMOJI_REACTIONS = ['❤', '👍', '😪', '😞', '😧', '💯'];

const ChatModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    user: firebase.User;
    blockedUsers: string[];
    onStartPrivateChat: (user: UserProfile) => void;
    onBlockUser: (user: UserProfile) => void;
    onUnblockUser: (uid: string) => void;
}> = ({ isOpen, onClose, user, blockedUsers, onStartPrivateChat, onBlockUser, onUnblockUser }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [editText, setEditText] = useState('');
    const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
    const [messageForAction, setMessageForAction] = useState<Message | null>(null);
    
    const [reactingToMessageId, setReactingToMessageId] = useState<string | null>(null);
    const reactionMenuRef = useRef<HTMLDivElement>(null);
    
    const [userForAction, setUserForAction] = useState<UserProfile | null>(null);
    const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');


    useEffect(() => {
        if (!isOpen) {
            setActiveTab('public'); // Reset to public tab when closed
            return;
        }

        const unsubscribe = db.collection('messages').orderBy('timestamp', 'asc').limit(100)
            .onSnapshot(snapshot => {
                const fetchedMessages = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Message));
                setMessages(fetchedMessages);
            }, err => {
                console.error("Error fetching messages: ", err);
            });
            
        const handleClickOutside = (event: MouseEvent) => {
            if (reactionMenuRef.current && !reactionMenuRef.current.contains(event.target as Node)) {
                setReactingToMessageId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
             unsubscribe();
             document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    useEffect(() => {
        if (!editingMessage) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, editingMessage]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const { uid, displayName, photoURL } = user;
        setLoading(true);

        try {
            await db.collection('messages').add({
                text: newMessage,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                uid,
                displayName,
                photoURL
            });
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setLoading(false);
        }
    };
    
    const handleReaction = async (messageId: string, emoji: string) => {
        const messageRef = db.collection('messages').doc(messageId);
        const currentUserUid = user.uid;

        try {
            await db.runTransaction(async (transaction) => {
                const messageDoc = await transaction.get(messageRef);
                if (!messageDoc.exists) return;

                const data = messageDoc.data() as Message;
                const reactions = data.reactions ? { ...data.reactions } : {};
                const uidsForEmoji = reactions[emoji] ? [...reactions[emoji]] : [];
                const userIndex = uidsForEmoji.indexOf(currentUserUid);

                if (userIndex > -1) {
                    uidsForEmoji.splice(userIndex, 1);
                } else {
                    uidsForEmoji.push(currentUserUid);
                }

                if (uidsForEmoji.length > 0) {
                    reactions[emoji] = uidsForEmoji;
                } else {
                    delete reactions[emoji];
                }
                
                transaction.update(messageRef, { reactions });
            });
        } catch (error) {
            console.error("Reaction transaction failed: ", error);
        }
        setReactingToMessageId(null);
    };

    const handleEdit = (msg: Message) => {
        setEditingMessage(msg);
        setEditText(msg.text);
    };

    const handleSaveEdit = async () => {
        if (!editingMessage || !editText.trim()) return;
        setLoading(true);
        try {
            await db.collection('messages').doc(editingMessage.id).update({ text: editText });
            setEditingMessage(null);
            setEditText('');
        } catch(e) {
            console.error("Error saving edit:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingMessage(null);
        setEditText('');
    };

    const confirmDelete = async () => {
        if (!messageToDelete) return;
        try {
            await db.collection('messages').doc(messageToDelete.id).delete();
            setMessageToDelete(null);
        } catch(e) {
            console.error("Error deleting message:", e);
        }
    };

    if (!isOpen) return null;
    
    const filteredMessages = messages.filter(msg => !blockedUsers.includes(msg.uid));

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
            <div className="w-full h-full max-w-md bg-sky-950/90 text-white flex flex-col">
                <header className="p-4 border-b border-sky-400/30 flex-shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-sky-200 text-shadow">الدردشة</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                            <XMarkIcon className="w-6 h-6"/>
                        </button>
                    </div>
                    <div className="flex border border-sky-600 rounded-lg p-1">
                        <button 
                            onClick={() => setActiveTab('public')}
                            className={`w-1/2 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'public' ? 'bg-sky-600 text-white' : 'text-sky-300 hover:bg-sky-700/50'}`}
                        >
                            الدردشة العامة
                        </button>
                         <button 
                            onClick={() => setActiveTab('private')}
                            className={`w-1/2 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'private' ? 'bg-sky-600 text-white' : 'text-sky-300 hover:bg-sky-700/50'}`}
                        >
                            المحادثات الخاصة
                        </button>
                    </div>
                </header>
                <main className="flex-grow overflow-y-auto">
                   {activeTab === 'public' ? (
                     <div className="p-4 space-y-4">
                        {filteredMessages.map(msg => {
                            const isMyMessage = msg.uid === user.uid;
                            const targetUser: UserProfile = { uid: msg.uid, displayName: msg.displayName, photoURL: msg.photoURL };
                            return (
                                <div key={msg.id} className={`flex items-start gap-3 group ${isMyMessage ? 'flex-row-reverse' : ''}`}>
                                     <div className="relative">
                                        <button
                                            onClick={() => !isMyMessage && setUserForAction(targetUser)}
                                            disabled={isMyMessage}
                                            className={!isMyMessage ? 'cursor-pointer' : 'cursor-default'}
                                         >
                                            <img 
                                                src={msg.photoURL || `https://ui-avatars.com/api/?name=${msg.displayName || ' '}&background=0284c7&color=fff&size=128`} 
                                                alt={msg.displayName || 'avatar'} 
                                                className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                            />
                                        </button>
                                    </div>
                                    <div className={`flex flex-col w-full ${isMyMessage ? 'items-end' : 'items-start'}`}>
                                        {editingMessage?.id === msg.id ? (
                                            <div className="w-full max-w-xs md:max-w-md p-2 bg-sky-800 rounded-lg">
                                                <textarea 
                                                    value={editText}
                                                    onChange={(e) => setEditText(e.target.value)}
                                                    className="w-full bg-sky-900/80 rounded-md p-2 text-white resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
                                                    rows={3}
                                                    autoFocus
                                                />
                                                <div className="flex justify-end gap-2 mt-2">
                                                    <button onClick={handleCancelEdit} className="text-xs px-3 py-1 rounded-md text-white hover:bg-white/10">إلغاء</button>
                                                    <button onClick={handleSaveEdit} disabled={loading || !editText.trim()} className="text-xs px-3 py-1 rounded-md bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50">
                                                        {loading ? 'جارِ الحفظ...' : 'حفظ'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={`relative p-3 rounded-2xl max-w-xs md:max-w-md ${isMyMessage ? 'bg-sky-600 rounded-br-none' : 'bg-slate-700 rounded-bl-none'}`}>
                                                <div className={`absolute -top-3 flex items-center gap-1 ${isMyMessage ? 'left-0' : 'right-0'}`}>
                                                    <button onClick={() => setReactingToMessageId(reactingToMessageId === msg.id ? null : msg.id)} className="p-1 rounded-full text-sky-200 opacity-0 group-hover:opacity-100 focus:opacity-100 bg-black/20 hover:bg-black/40 transition-opacity">
                                                        <FaceSmileIcon className="w-4 h-4" />
                                                    </button>
                                                    {isMyMessage && (
                                                        <button onClick={() => setMessageForAction(msg)} className="p-1 rounded-full text-sky-200 opacity-0 group-hover:opacity-100 focus:opacity-100 bg-black/20 hover:bg-black/40 transition-opacity">
                                                            <DotsVerticalIcon className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                {reactingToMessageId === msg.id && (
                                                    <div ref={reactionMenuRef} className={`absolute top-[-40px] bg-slate-800 border border-slate-600 rounded-full shadow-lg z-10 p-1 flex gap-1 ${isMyMessage ? 'left-0' : 'right-0'}`}>
                                                        {EMOJI_REACTIONS.map(emoji => (
                                                            <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="p-1 rounded-full hover:bg-slate-700 transition-colors text-xl">
                                                                {emoji}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                <p className="text-sm font-bold text-sky-200 mb-1">{msg.displayName}</p>
                                                <p className="text-white whitespace-pre-wrap">{msg.text}</p>
                                            </div>
                                        )}
                                        {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                            <div className={`flex flex-wrap gap-1 mt-1 px-1 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                                                {/* FIX: Add Array.isArray check to ensure 'uids' is an array before accessing its properties, resolving type errors on properties like 'length' and 'includes'. */}
                                                {Object.entries(msg.reactions).map(([emoji, uids]) => Array.isArray(uids) && uids.length > 0 && (
                                                    <button 
                                                        key={emoji}
                                                        onClick={() => handleReaction(msg.id, emoji)}
                                                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                                                            uids.includes(user.uid) 
                                                            ? 'bg-sky-500 border border-sky-300 text-white' 
                                                            : 'bg-slate-600/50 border border-transparent hover:bg-slate-600 text-sky-200'
                                                        }`}
                                                    >
                                                        <span>{emoji}</span>
                                                        <span className="font-semibold">{uids.length}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                        <p className="text-xs text-sky-500 mt-1 px-1">
                                            {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit'}) : '...'}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                        <div ref={messagesEndRef} />
                    </div>
                   ) : (
                       <PrivateConversationsList user={user} onConversationSelect={onStartPrivateChat}/>
                   )}
                </main>
                {activeTab === 'public' && (
                    <footer className="p-4 border-t border-sky-400/30 flex-shrink-0">
                        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="اكتب رسالتك..."
                                className="flex-grow bg-sky-900/50 border border-sky-400/30 rounded-full py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                                disabled={loading || !!editingMessage}
                            />
                            <button type="submit" className="bg-sky-600 text-white p-3 rounded-full hover:bg-sky-500 disabled:bg-sky-800 transition-colors" disabled={loading || !newMessage.trim() || !!editingMessage}>
                                <SendIcon className="w-6 h-6"/>
                            </button>
                        </form>
                    </footer>
                )}
            </div>
             {messageToDelete && <DeleteMessageConfirmationModal onConfirm={confirmDelete} onClose={() => setMessageToDelete(null)} />}
             {messageForAction && (
                <MessageActionModal
                    onClose={() => setMessageForAction(null)}
                    onEdit={() => {
                        handleEdit(messageForAction);
                        setMessageForAction(null);
                    }}
                    onDelete={() => {
                        setMessageToDelete(messageForAction);
                        setMessageForAction(null);
                    }}
                />
            )}
            {userForAction && (
                <UserActionModal
                    userProfile={userForAction}
                    onClose={() => setUserForAction(null)}
                    isBlocked={blockedUsers.includes(userForAction.uid)}
                    onStartPrivateChat={() => {
                        onStartPrivateChat(userForAction);
                        setUserForAction(null);
                    }}
                    onBlockUser={() => {
                        onBlockUser(userForAction);
                        setUserForAction(null);
                    }}
                    onUnblockUser={() => {
                        onUnblockUser(userForAction.uid);
                        setUserForAction(null);
                    }}
                />
            )}
        </div>
    );
};

// --- Private Chat Component ---
const PrivateChatModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    user: firebase.User;
    otherUser: UserProfile;
    isBlocked: boolean;
    onBlockUser: (user: UserProfile) => void;
    onUnblockUser: (uid: string) => void;
}> = ({ isOpen, onClose, user, otherUser, isBlocked, onBlockUser, onUnblockUser }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatId = [user.uid, otherUser.uid].sort().join('_');
    const messagesCollection = db.collection('private_chats').doc(chatId).collection('messages');

    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [editText, setEditText] = useState('');
    const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
    const [messageForAction, setMessageForAction] = useState<Message | null>(null);
    
    const [reactingToMessageId, setReactingToMessageId] = useState<string | null>(null);
    const reactionMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;

        const unsubscribe = messagesCollection.orderBy('timestamp', 'asc').limit(100)
            .onSnapshot(snapshot => {
                const fetchedMessages = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Message));
                setMessages(fetchedMessages);
            }, err => {
                console.error("Error fetching private messages: ", err);
            });
            
        const handleClickOutside = (event: MouseEvent) => {
            if (reactionMenuRef.current && !reactionMenuRef.current.contains(event.target as Node)) {
                setReactingToMessageId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
             unsubscribe();
             document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, chatId]);

    useEffect(() => {
        if (!editingMessage) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, editingMessage]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isBlocked) return;

        const { uid, displayName, photoURL, email } = user;
        setLoading(true);

        try {
            // 1. Add the message to the collection
            await messagesCollection.add({
                text: newMessage,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                uid,
                displayName,
                photoURL
            });
             setNewMessage('');

            // 2. Update conversation metadata for both users
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            
            const myProfileForOther = {
                displayName: displayName || `مستخدم ${uid.substring(0,5)}`,
                photoURL: photoURL,
                lastMessageTimestamp: timestamp,
                ...(email && { email }),
            };

            const otherProfileForMe = {
                displayName: otherUser.displayName,
                photoURL: otherUser.photoURL,
                lastMessageTimestamp: timestamp,
                ...(otherUser.email && { email: otherUser.email }),
            };
            
            const userConversationsRef = db.collection('users').doc(uid).collection('conversations').doc(otherUser.uid);
            const otherUserConversationsRef = db.collection('users').doc(otherUser.uid).collection('conversations').doc(uid);

            await userConversationsRef.set(otherProfileForMe, { merge: true });
            await otherUserConversationsRef.set(myProfileForOther, { merge: true });

        } catch (error) {
            console.error("Error sending private message:", error);
        } finally {
            setLoading(false);
        }
    };
    
    const handleReaction = async (messageId: string, emoji: string) => {
        const messageRef = messagesCollection.doc(messageId);
        const currentUserUid = user.uid;

        try {
            await db.runTransaction(async (transaction) => {
                const messageDoc = await transaction.get(messageRef);
                if (!messageDoc.exists) return;

                const data = messageDoc.data() as Message;
                const reactions = data.reactions ? { ...data.reactions } : {};
                const uidsForEmoji = reactions[emoji] ? [...reactions[emoji]] : [];
                const userIndex = uidsForEmoji.indexOf(currentUserUid);

                if (userIndex > -1) {
                    uidsForEmoji.splice(userIndex, 1);
                } else {
                    uidsForEmoji.push(currentUserUid);
                }

                if (uidsForEmoji.length > 0) {
                    reactions[emoji] = uidsForEmoji;
                } else {
                    delete reactions[emoji];
                }
                
                transaction.update(messageRef, { reactions });
            });
        } catch (error) {
            console.error("Reaction transaction failed: ", error);
        }
        setReactingToMessageId(null);
    };

    const handleEdit = (msg: Message) => {
        setEditingMessage(msg);
        setEditText(msg.text);
    };

    const handleSaveEdit = async () => {
        if (!editingMessage || !editText.trim()) return;
        setLoading(true);
        try {
            await messagesCollection.doc(editingMessage.id).update({ text: editText });
            setEditingMessage(null);
            setEditText('');
        } catch(e) {
            console.error("Error saving edit:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelEdit = () => {
        setEditingMessage(null);
        setEditText('');
    };

    const confirmDelete = async () => {
        if (!messageToDelete) return;
        try {
            await messagesCollection.doc(messageToDelete.id).delete();
            setMessageToDelete(null);
        } catch(e) {
            console.error("Error deleting message:", e);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[55] transition-opacity duration-300">
            <div className="w-full h-full max-w-md bg-sky-950/90 text-white flex flex-col">
                <header className="flex items-center justify-between p-4 border-b border-sky-400/30 flex-shrink-0">
                    <div className="flex items-center gap-3">
                         <img 
                            src={otherUser.photoURL || `https://ui-avatars.com/api/?name=${otherUser.displayName || ' '}&background=0284c7&color=fff&size=128`} 
                            alt={otherUser.displayName || 'avatar'} 
                            className="w-10 h-10 rounded-full object-cover"
                        />
                        <h2 className="text-lg font-bold text-sky-200 text-shadow truncate">
                            {otherUser.displayName}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                         {isBlocked ? (
                            <button onClick={() => onUnblockUser(otherUser.uid)} className="p-2 rounded-full hover:bg-white/10 text-green-400 transition-colors" title="إلغاء حظر المستخدم">
                                <UserPlusIcon className="w-6 h-6"/>
                            </button>
                        ) : (
                            <button onClick={() => onBlockUser(otherUser)} className="p-2 rounded-full hover:bg-white/10 text-red-400 transition-colors" title="حظر المستخدم">
                                <UserMinusIcon className="w-6 h-6"/>
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                            <XMarkIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </header>
                <main className="flex-grow overflow-y-auto p-4 space-y-4">
                    {messages.map(msg => {
                        const isMyMessage = msg.uid === user.uid;
                        return (
                             <div key={msg.id} className={`flex items-start gap-3 group ${isMyMessage ? 'flex-row-reverse' : ''}`}>
                                <img 
                                    src={msg.photoURL || `https://ui-avatars.com/api/?name=${msg.displayName || ' '}&background=0284c7&color=fff&size=128`} 
                                    alt={msg.displayName || 'avatar'} 
                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                />
                                <div className={`flex flex-col w-full ${isMyMessage ? 'items-end' : 'items-start'}`}>
                                    {editingMessage?.id === msg.id ? (
                                        <div className="w-full max-w-xs md:max-w-md p-2 bg-sky-800 rounded-lg">
                                            <textarea 
                                                value={editText}
                                                onChange={(e) => setEditText(e.target.value)}
                                                className="w-full bg-sky-900/80 rounded-md p-2 text-white resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
                                                rows={3}
                                                autoFocus
                                            />
                                            <div className="flex justify-end gap-2 mt-2">
                                                <button onClick={handleCancelEdit} className="text-xs px-3 py-1 rounded-md text-white hover:bg-white/10">إلغاء</button>
                                                <button onClick={handleSaveEdit} disabled={loading || !editText.trim()} className="text-xs px-3 py-1 rounded-md bg-sky-600 text-white hover:bg-sky-500 disabled:opacity-50">
                                                    {loading ? 'جارِ الحفظ...' : 'حفظ'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`relative p-3 rounded-2xl max-w-xs md:max-w-md ${isMyMessage ? 'bg-sky-600 rounded-br-none' : 'bg-slate-700 rounded-bl-none'}`}>
                                            <div className={`absolute -top-3 flex items-center gap-1 ${isMyMessage ? 'left-0' : 'right-0'}`}>
                                                <button onClick={() => setReactingToMessageId(reactingToMessageId === msg.id ? null : msg.id)} className="p-1 rounded-full text-sky-200 opacity-0 group-hover:opacity-100 focus:opacity-100 bg-black/20 hover:bg-black/40 transition-opacity">
                                                    <FaceSmileIcon className="w-4 h-4" />
                                                </button>
                                                {isMyMessage && (
                                                    <button onClick={() => setMessageForAction(msg)} className="p-1 rounded-full text-sky-200 opacity-0 group-hover:opacity-100 focus:opacity-100 bg-black/20 hover:bg-black/40 transition-opacity">
                                                        <DotsVerticalIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                            
                                            {reactingToMessageId === msg.id && (
                                                <div ref={reactionMenuRef} className={`absolute top-[-40px] bg-slate-800 border border-slate-600 rounded-full shadow-lg z-10 p-1 flex gap-1 ${isMyMessage ? 'left-0' : 'right-0'}`}>
                                                    {EMOJI_REACTIONS.map(emoji => (
                                                        <button key={emoji} onClick={() => handleReaction(msg.id, emoji)} className="p-1 rounded-full hover:bg-slate-700 transition-colors text-xl">
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="text-white whitespace-pre-wrap">{msg.text}</p>
                                        </div>
                                    )}
                                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                        <div className={`flex flex-wrap gap-1 mt-1 px-1 ${isMyMessage ? 'justify-end' : 'justify-start'}`}>
                                            {Object.entries(msg.reactions).map(([emoji, uids]) => Array.isArray(uids) && uids.length > 0 && (
                                                <button 
                                                    key={emoji}
                                                    onClick={() => handleReaction(msg.id, emoji)}
                                                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                                                        Array.isArray(uids) && uids.includes(user.uid) 
                                                        ? 'bg-sky-500 border border-sky-300 text-white' 
                                                        : 'bg-slate-600/50 border border-transparent hover:bg-slate-600 text-sky-200'
                                                    }`}
                                                >
                                                    <span>{emoji}</span>
                                                    <span className="font-semibold">{uids.length}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-xs text-sky-500 mt-1 px-1">
                                        {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit'}) : '...'}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                    <div ref={messagesEndRef} />
                </main>
                <footer className="p-4 border-t border-sky-400/30 flex-shrink-0">
                    {isBlocked ? (
                        <div className="text-center text-red-400 bg-red-900/50 p-3 rounded-lg flex items-center justify-center gap-4">
                            <span>لقد حظرت هذا المستخدم.</span>
                            <button onClick={() => onUnblockUser(otherUser.uid)} className="font-bold text-green-300 hover:underline">إلغاء الحظر</button>
                        </div>
                    ) : (
                        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="اكتب رسالتك..."
                                className="flex-grow bg-sky-900/50 border border-sky-400/30 rounded-full py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 transition"
                                disabled={loading}
                            />
                            <button type="submit" className="bg-sky-600 text-white p-3 rounded-full hover:bg-sky-500 disabled:bg-sky-800 transition-colors" disabled={loading || !newMessage.trim()}>
                                <SendIcon className="w-6 h-6"/>
                            </button>
                        </form>
                    )}
                </footer>
            </div>
             {messageToDelete && <DeleteMessageConfirmationModal onConfirm={confirmDelete} onClose={() => setMessageToDelete(null)} />}
             {messageForAction && (
                <MessageActionModal
                    onClose={() => setMessageForAction(null)}
                    onEdit={() => {
                        handleEdit(messageForAction);
                        setMessageForAction(null);
                    }}
                    onDelete={() => {
                        setMessageToDelete(messageForAction);
                        setMessageForAction(null);
                    }}
                />
            )}
        </div>
    );
};

// --- Logged In Layout ---
const LoggedInLayout: React.FC<{ user: firebase.User }> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<LoggedInView>('home');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [counterImage, setCounterImage] = useState<string | null>(null);
    const [showSetDateModal, setShowSetDateModal] = useState(false);
    const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
    const [showDeleteImageConfirmModal, setShowDeleteImageConfirmModal] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showChat, setShowChat] = useState(false);
    
    const [privateChatTargetUser, setPrivateChatTargetUser] = useState<UserProfile | null>(null);
    const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
    const [userToBlock, setUserToBlock] = useState<UserProfile | null>(null);

    const isDeveloper = DEVELOPER_UIDS.includes(user.uid);

    useEffect(() => {
        let unsubscribeCounterImage: () => void;
        let unsubscribeStartDate: () => void;
        let unsubscribeUser: () => void;
    
        unsubscribeCounterImage = db.collection('app_config').doc('main')
            .onSnapshot(doc => {
                const data = doc.data();
                setCounterImage(data?.imageUrl || null);
            }, err => console.error("Error fetching counter image: ", err));
    
        if (user.isAnonymous) {
            const storedDate = localStorage.getItem('counterStartDate');
            if (storedDate) setStartDate(new Date(storedDate));
        } else {
            const userRef = db.collection('users').doc(user.uid);
            unsubscribeStartDate = userRef.onSnapshot(doc => {
                const data = doc.data();
                if (data?.counterStartDate) {
                    setStartDate(new Date(data.counterStartDate));
                } else {
                    setStartDate(null);
                }
            }, err => console.error("Error fetching start date: ", err));
            
            unsubscribeUser = userRef.onSnapshot(doc => {
                setBlockedUsers(doc.data()?.blockedUsers || []);
            }, err => console.error("Error fetching user data: ", err));
        }
        
        const unsubscribeNotifications = db.collection('notifications').orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                const fetchedNotifications = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Notification));
                setNotifications(fetchedNotifications);
            }, err => console.error("Error fetching notifications: ", err));
    
        return () => {
            if (unsubscribeCounterImage) unsubscribeCounterImage();
            if (unsubscribeStartDate) unsubscribeStartDate();
            if (unsubscribeUser) unsubscribeUser();
            unsubscribeNotifications();
        };
    }, [user]);

    const handleSignOut = async () => {
        try {
            await auth.signOut();
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };
    
    const handleBlockUser = async () => {
        if (!userToBlock) return;
        const targetUid = userToBlock.uid;
        setUserToBlock(null);
        await db.collection('users').doc(user.uid).update({
            blockedUsers: firebase.firestore.FieldValue.arrayUnion(targetUid)
        });
    };
    
    const handleUnblockUser = async (targetUid: string) => {
        await db.collection('users').doc(user.uid).update({
            blockedUsers: firebase.firestore.FieldValue.arrayRemove(targetUid)
        });
    };

    const updateStartDate = async (newDate: Date) => {
        setStartDate(newDate);

        if (user.isAnonymous) {
            localStorage.setItem('counterStartDate', newDate.toISOString());
        } else {
            try {
                await db.collection('users').doc(user.uid).set(
                    { counterStartDate: newDate.toISOString() },
                    { merge: true }
                );
            } catch (error) {
                console.error("Error updating start date in Firestore: ", error);
            }
        }
    };

    const handleResetCounter = () => setShowResetConfirmModal(true);

    const confirmResetCounter = () => {
        updateStartDate(new Date());
        setShowResetConfirmModal(false);
        setActiveTab('home');
    };

    const handleStartCounter = () => updateStartDate(new Date());

    const handleSetNewDate = (dateString: string) => {
        const [year, month, day] = dateString.split('-').map(Number);
        const now = new Date();
        const localDate = new Date(year, month - 1, day, now.getHours(), now.getMinutes(), now.getSeconds());
        
        updateStartDate(localDate);
        setShowSetDateModal(false);
        setActiveTab('home');
    };

    const handleSetCounterImage = async (url: string) => {
        try {
            await db.collection('app_config').doc('main').set({ imageUrl: url }, { merge: true });
        } catch (error) {
            console.error("Error setting counter image in Firestore: ", error);
        }
    };

    const confirmDeleteCounterImage = async () => {
        setShowDeleteImageConfirmModal(false);
        try {
            await db.collection('app_config').doc('main').update({
                imageUrl: firebase.firestore.FieldValue.delete()
            });
        } catch (error) {
            console.error("Error deleting counter image from Firestore: ", error);
        }
    };

    const renderActiveView = () => {
        switch (activeTab) {
            case 'home':
                return <HomeView user={user} setActiveTab={setActiveTab} startDate={startDate} handleStartCounter={handleStartCounter} counterImage={counterImage} setShowNotifications={setShowNotifications} setShowChat={setShowChat} />;
            case 'settings':
                return <SettingsView user={user} handleSignOut={handleSignOut} blockedUsers={blockedUsers} handleUnblockUser={handleUnblockUser} />;
            case 'counter-settings':
                return <CounterSettingsView 
                    setActiveTab={setActiveTab} 
                    handleResetCounter={handleResetCounter} 
                    setShowSetDateModal={setShowSetDateModal}
                    handleSetCounterImage={handleSetCounterImage}
                    handleDeleteCounterImage={() => setShowDeleteImageConfirmModal(true)}
                    hasCustomImage={!!counterImage}
                    isDeveloper={isDeveloper}
                />;
            default:
                return <HomeView user={user} setActiveTab={setActiveTab} startDate={startDate} handleStartCounter={handleStartCounter} counterImage={counterImage} setShowNotifications={setShowNotifications} setShowChat={setShowChat} />;
        }
    };

    return (
        <div className="w-full min-h-screen">
            <div className="w-full max-w-md mx-auto px-4 pb-20">
                 {renderActiveView()}
            </div>
            {showSetDateModal && <SetStartDateModal onClose={() => setShowSetDateModal(false)} onSave={handleSetNewDate}/>}
            {showResetConfirmModal && <ResetConfirmationModal onConfirm={confirmResetCounter} onClose={() => setShowResetConfirmModal(false)} />}
            {showDeleteImageConfirmModal && <DeleteImageConfirmationModal onConfirm={confirmDeleteCounterImage} onClose={() => setShowDeleteImageConfirmModal(false)} />}
            <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} notifications={notifications} isDeveloper={isDeveloper} />
            <ChatModal 
                isOpen={showChat} 
                onClose={() => setShowChat(false)} 
                user={user} 
                blockedUsers={blockedUsers}
                onStartPrivateChat={(targetUser) => { setPrivateChatTargetUser(targetUser); setShowChat(false); }}
                onBlockUser={(targetUser) => setUserToBlock(targetUser)}
                onUnblockUser={handleUnblockUser}
            />
            {privateChatTargetUser && (
                <PrivateChatModal
                    isOpen={!!privateChatTargetUser}
                    onClose={() => setPrivateChatTargetUser(null)}
                    user={user}
                    otherUser={privateChatTargetUser}
                    isBlocked={blockedUsers.includes(privateChatTargetUser.uid)}
                    onBlockUser={(targetUser) => setUserToBlock(targetUser)}
                    onUnblockUser={handleUnblockUser}
                />
            )}
            {userToBlock && (
                <BlockUserConfirmationModal 
                    userName={userToBlock.displayName}
                    onConfirm={handleBlockUser}
                    onClose={() => setUserToBlock(null)}
                />
            )}
            <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
    );
};


// --- App Component ---
const App: React.FC = () => {
    const [view, setView] = useState<View>('main');
    const [user, setUser] = useState<firebase.User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLocked, setIsLocked] = useState(false);

    useEffect(() => {
        const checkLockStatus = () => {
            const pin = localStorage.getItem('appLockPin');
            if (!pin) return;

            const hiddenTimestamp = localStorage.getItem('appHiddenTimestamp');
            if (hiddenTimestamp) {
                const timeElapsed = Date.now() - parseInt(hiddenTimestamp, 10);
                if (timeElapsed > 30000) { // 30 seconds
                    setIsLocked(true);
                }
                // Always remove timestamp after checking
                localStorage.removeItem('appHiddenTimestamp');
            }
        };

        checkLockStatus(); // Check on initial load

        const handleVisibilityChange = () => {
            const pin = localStorage.getItem('appLockPin');
            if (!pin) return;

            if (document.hidden) {
                localStorage.setItem('appHiddenTimestamp', String(Date.now()));
            } else {
                checkLockStatus();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser && currentUser.isAnonymous) {
                let profileUpdated = false;

                // If guest has no display name, they are new. Assign a numbered name.
                if (!currentUser.displayName) {
                    const counterRef = db.collection('app_config').doc('guest_counter');
                    try {
                        const newGuestName = await db.runTransaction(async (transaction) => {
                            const counterDoc = await transaction.get(counterRef);
                            const newCount = (counterDoc.data()?.count || 0) + 1;
                            transaction.set(counterRef, { count: newCount });
                            return `زائر ${newCount}`;
                        });
                        await currentUser.updateProfile({ displayName: newGuestName });
                        await db.collection('users').doc(currentUser.uid).set({
                            displayName: newGuestName,
                            photoURL: null,
                            isAnonymous: true,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        });
                        localStorage.setItem('guestProfile', JSON.stringify({ displayName: newGuestName, photoURL: null }));
                        profileUpdated = true;
                    } catch (e) {
                        console.error("Guest name transaction failed:", e);
                        // Assign a generic name as a fallback
                        await currentUser.updateProfile({ displayName: 'زائر' });
                        profileUpdated = true;
                    }
                } else {
                    // Existing guest, sync with localStorage which is updated from settings
                    const savedProfileJSON = localStorage.getItem('guestProfile');
                    if (savedProfileJSON) {
                        try {
                            const savedProfile = JSON.parse(savedProfileJSON);
                            if (currentUser.displayName !== savedProfile.displayName || currentUser.photoURL !== savedProfile.photoURL) {
                                await currentUser.updateProfile({
                                    displayName: savedProfile.displayName,
                                    photoURL: savedProfile.photoURL,
                                });
                                profileUpdated = true;
                            }
                        } catch (e) {
                            console.error("Error processing guest profile from localStorage:", e);
                        }
                    }
                }
                
                if (profileUpdated) {
                    await currentUser.reload();
                }
            }

            // Use auth.currentUser because `currentUser` from callback might be stale after a reload
            setUser(auth.currentUser);
            setLoading(false);
        });

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            unsubscribe();
        };
    }, []);

    const handleGuestLogin = async () => {
        setLoading(true);
        try {
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            await auth.signInAnonymously();
        } catch (error) {
            console.error("Error signing in as guest:", error);
            setLoading(false);
        }
    };

    const renderAuthViews = () => {
        switch (view) {
            case 'login':
                return <LoginView setView={setView} />;
            case 'signup':
                return <SignupView setView={setView} />;
            case 'forgot-password':
                return <ForgotPasswordView setView={setView} />;
            default:
                return <MainView setView={setView} handleGuestLogin={handleGuestLogin} />;
        }
    };
    
    if (loading) {
        return (
            <main 
                className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
                style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop')" }}
            >
                <div className="text-center text-white text-2xl">
                    جارِ التحميل...
                </div>
            </main>
        );
    }

    if (user && isLocked) {
        return <LockScreen onUnlock={() => setIsLocked(false)} />;
    }

    return (
        <main 
            className="min-h-screen bg-cover bg-center bg-fixed"
            style={{ 
                backgroundImage: "url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop')",
                backgroundColor: '#0c4a6e'
            }}
        >
            <div className="min-h-screen bg-sky-900/50">
                {user ? (
                    <LoggedInLayout user={user} />
                ) : (
                    <div className="flex items-center justify-center min-h-screen p-4">
                        <div className="w-full max-w-md bg-sky-950/80 rounded-2xl shadow-xl p-8 space-y-8 relative backdrop-blur-xl border border-sky-300/30">
                            <div className="relative z-10">
                                {renderAuthViews()}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
};

export default App;
