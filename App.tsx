import React, { useState, useEffect, useRef } from 'react';
// FIX: Use Firebase v9 compat libraries to support v8 syntax, resolving property and type errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
// import 'firebase/compat/storage'; // Removed Firebase Storage
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
// const storage = firebase.storage(); // Removed Firebase Storage

// --- Types and Interfaces ---
type View = 'main' | 'login' | 'signup' | 'forgot-password';
type LoggedInView = 'home' | 'settings';

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

// --- SVG Icons ---
const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
);

const LockIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
);

const EmailIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
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
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
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

// --- UI Components ---
const inputClasses = "w-full px-4 py-3 pr-10 text-white bg-black/20 placeholder-sky-200 rounded-lg border border-sky-400/30 focus:outline-none focus:bg-black/30 focus:border-sky-300 focus:ring-2 focus:ring-sky-300/50 transition-all duration-300 ease-in-out shadow-sm focus:shadow-lg";
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
                    className="w-full bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-sky-500 transition-transform transform hover:scale-105"
                >
                    تسجيل الدخول
                </button>
                <button
                    onClick={() => setView('signup')}
                    className="w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-teal-500 transition-transform transform hover:scale-105"
                >
                    إنشاء حساب
                </button>
                 <button
                    onClick={handleGuestLogin}
                    className="w-full bg-slate-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-slate-500 transition-transform transform hover:scale-105"
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
            <form className="space-y-6" onSubmit={handleSubmit}>
                {error && <ErrorMessage message={error} />}
                <div className="relative">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <EmailIcon className="h-5 w-5 text-sky-200" />
                    </span>
                    <input
                        type="email"
                        placeholder="البريد الإلكتروني"
                        className={inputClasses}
                        aria-label="البريد الإلكتروني"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="relative">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <LockIcon className="h-5 w-5 text-sky-200" />
                    </span>
                    <input
                        type="password"
                        placeholder="كلمة المرور"
                        className={inputClasses}
                        aria-label="كلمة المرور"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
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
                    className="w-full bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-sky-500 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="w-full bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-sky-500 transition-transform transform hover:scale-105"
                    >
                        الذهاب إلى صفحة الدخول
                    </button>
                </div>
            ) : (
                <form className="space-y-6" onSubmit={handleSubmit}>
                    {error && <ErrorMessage message={error} />}
                    <div className="relative">
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <UserIcon className="h-5 w-5 text-sky-200" />
                        </span>
                        <input
                            type="text"
                            placeholder="الاسم الكامل"
                            className={inputClasses}
                            aria-label="الاسم الكامل"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="relative">
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <EmailIcon className="h-5 w-5 text-sky-200" />
                        </span>
                        <input
                            type="email"
                            placeholder="البريد الإلكتروني"
                            className={inputClasses}
                            aria-label="البريد الإلكتروني"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="relative">
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <LockIcon className="h-5 w-5 text-sky-200" />
                        </span>
                        <input
                            type="password"
                            placeholder="كلمة المرور"
                            className={inputClasses}
                            aria-label="كلمة المرور"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                     <div className="relative">
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <LockIcon className="h-5 w-5 text-sky-200" />
                        </span>
                        <input
                            type="password"
                            placeholder="تأكيد كلمة المرور"
                            className={inputClasses}
                            aria-label="تأكيد كلمة المرور"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-teal-500 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="w-full bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-sky-500 transition-transform transform hover:scale-105"
                    >
                        العودة لتسجيل الدخول
                    </button>
                </div>
            ) : (
                <form className="space-y-6" onSubmit={handleSubmit}>
                    {error && <ErrorMessage message={error} />}
                    <p className="text-center text-sky-200 -mt-4 mb-4">أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطًا لإعادة تعيين كلمة المرور الخاصة بك.</p>
                    <div className="relative">
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <EmailIcon className="h-5 w-5 text-sky-200" />
                        </span>
                        <input
                            type="email"
                            placeholder="البريد الإلكتروني"
                            className={inputClasses}
                            aria-label="البريد الإلكتروني"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-orange-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-orange-500 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'جارِ الإرسال...' : 'إرسال رابط إعادة التعيين'}
                    </button>
                </form>
            )}
        </div>
    );
};

// --- Home View (for logged-in users) ---
const HomeView: React.FC<{ user: firebase.User }> = ({ user }) => {
    const [resendMessage, setResendMessage] = useState('');
    const [cooldownTime, setCooldownTime] = useState(0);

    useEffect(() => {
        if (cooldownTime <= 0) return;

        const timerId = setTimeout(() => {
            setCooldownTime(prevTime => prevTime - 1);
        }, 1000);

        return () => clearTimeout(timerId);
    }, [cooldownTime]);

    const handleResendVerification = async () => {
        if (cooldownTime > 0) return;

        setResendMessage('');
        setCooldownTime(60);

        try {
            await user.sendEmailVerification();
            setResendMessage('تم إرسال بريد التحقق. يرجى التحقق من مجلد الرسائل غير المرغوب فيها (السبام).');
        } catch (error) {
            console.error("Error resending verification email: ", error);
            setResendMessage('حدث خطأ أثناء إعادة إرسال البريد. يرجى المحاولة مرة أخرى.');
        }
    };
    
    const currentDate = new Date().toLocaleDateString('ar-IQ', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="text-white space-y-8">
            <header className="flex justify-between items-center w-full">
                <div className="flex items-center gap-4">
                    <img 
                        src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'زائر'}&background=0ea5e9&color=fff&size=64`}
                        alt="Profile"
                        className="w-12 h-12 rounded-full object-cover border-2 border-sky-400/50"
                    />
                    <div>
                        <h1 className="text-lg font-semibold text-shadow">
                            مرحبا، {user.displayName || 'زائر'}
                        </h1>
                        <p className="text-xs text-sky-300">{currentDate}</p>
                    </div>
                </div>
            </header>
            
            {user.email && !user.emailVerified && (
                 <div className="p-3 bg-yellow-900/50 text-yellow-300 rounded-lg space-y-3 text-center">
                    <p>
                        يرجى تفعيل حسابك عبر الرابط الذي أرسلناه إلى بريدك الإلكتروني.
                    </p>
                    <p className="text-xs text-yellow-400">
                        ملاحظة: قد تجد البريد في مجلد الرسائل غير المرغوب فيها (السبام).
                    </p>
                    <button
                        onClick={handleResendVerification}
                        disabled={cooldownTime > 0}
                        className="text-sm font-bold text-yellow-200 hover:text-white underline disabled:opacity-50 disabled:cursor-wait focus:outline-none focus:ring-2 focus:ring-yellow-400 rounded"
                    >
                        {cooldownTime > 0 
                            ? `حاول مرة أخرى بعد ${cooldownTime} ثانية` 
                            : 'إعادة إرسال بريد التحقق'}
                    </button>
                    {resendMessage && <p className="text-sm mt-2">{resendMessage}</p>}
                </div>
            )}
            
            <div className="text-center p-8 bg-sky-900/30 rounded-lg">
                <p className="text-sky-200">هنا سيتم عرض محتوى الصفحة الرئيسية.</p>
            </div>
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
                    <button onClick={onClose} className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-500 transition-colors">إلغاء</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-sky-600 rounded-md hover:bg-sky-500 transition-colors">تأكيد</button>
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
                        className="w-full bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-sky-500 transition-transform transform hover:scale-105"
                    >
                        فتح
                    </button>
                </form>
            </div>
        </main>
    );
};


// --- Settings View ---
const SettingsView: React.FC<{ user: firebase.User; handleSignOut: () => void; }> = ({ user, handleSignOut }) => {
    const [displayName, setDisplayName] = useState(user.displayName || '');
    const [photoPreview, setPhotoPreview] = useState<string | null>(user.photoURL || null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    
    // State for new features
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
                <h1 className="text-2xl font-bold text-center text-white text-shadow">الضبط</h1>
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

                <div className="relative">
                    <label htmlFor="displayName" className="block mb-2 text-sm font-medium text-sky-200">الاسم</label>
                    <span className="absolute inset-y-0 right-0 top-8 flex items-center pr-3">
                        <UserIcon className="h-5 w-5 text-sky-200" />
                    </span>
                    <input
                        id="displayName"
                        type="text"
                        placeholder="الاسم"
                        className={inputClasses}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                    />
                </div>
                
                <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="w-full bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-teal-500 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                className="px-4 py-2 bg-gray-600 rounded-md hover:bg-gray-500 transition-colors"
                            >
                                إلغاء
                            </button>
                             <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmation !== 'حذف' || loading}
                                className="px-4 py-2 bg-red-600 rounded-md hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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


// --- Bottom Navigation Bar ---
const BottomNavBar: React.FC<{ activeTab: LoggedInView; setActiveTab: (tab: LoggedInView) => void; }> = ({ activeTab, setActiveTab }) => {
    const navItems = [
        { id: 'home', label: 'الرئيسية', icon: HouseIcon },
        { id: 'settings', label: 'الضبط', icon: SettingsIcon },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-sky-950/90 border-t border-sky-300/30 backdrop-blur-lg">
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


// --- Logged In Layout ---
const LoggedInLayout: React.FC<{ user: firebase.User }> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<LoggedInView>('home');

    const handleSignOut = async () => {
        try {
            await auth.signOut();
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

    const renderActiveView = () => {
        switch (activeTab) {
            case 'home':
                return <HomeView user={user} />;
            case 'settings':
                return <SettingsView user={user} handleSignOut={handleSignOut} />;
            default:
                return <HomeView user={user} />;
        }
    };

    return (
        <div className="w-full min-h-screen">
            <main className="w-full max-w-md mx-auto pt-8 px-4 pb-24">
                 {renderActiveView()}
            </main>
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
                const savedProfileJSON = localStorage.getItem('guestProfile');
                if (savedProfileJSON) {
                    try {
                        const savedProfile = JSON.parse(savedProfileJSON);
                        if (currentUser.displayName !== savedProfile.displayName || currentUser.photoURL !== savedProfile.photoURL) {
                            await currentUser.updateProfile({
                                displayName: savedProfile.displayName,
                                photoURL: savedProfile.photoURL,
                            });
                            // Reload the user to get the updated profile data immediately
                            await currentUser.reload();
                        }
                    } catch (e) {
                        console.error("Error processing guest profile from localStorage:", e);
                    }
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
            className="min-h-screen bg-cover bg-center"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2070&auto=format&fit=crop')" }}
        >
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
        </main>
    );
};

export default App;
