
import React, { useState, useEffect } from 'react';
// FIX: Use Firebase v9 compat libraries to support v8 syntax, resolving property and type errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
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

// --- Types and Interfaces ---
type View = 'main' | 'login' | 'signup' | 'forgot-password' | 'guest';

interface ViewProps {
    setView: React.Dispatch<React.SetStateAction<View>>;
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

// --- UI Components ---
const inputClasses = "w-full px-4 py-3 pr-10 text-white bg-black/20 placeholder-sky-200 rounded-lg border border-sky-400/30 focus:outline-none focus:bg-black/30 focus:border-sky-300 focus:ring-2 focus:ring-sky-300/50 transition-all duration-300 ease-in-out shadow-sm focus:shadow-lg";
const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
    <p className="text-center text-red-400 bg-red-900/50 p-2 rounded-lg">{message}</p>
);

// --- Main View Component ---
const MainView: React.FC<ViewProps> = ({ setView }) => {
    return (
        <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">أهلاً بك في رحلتك نحو التعافي</h1>
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
                    onClick={() => setView('guest')}
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
            // FIX: Changed to v8 namespaced API call.
            await auth.signInWithEmailAndPassword(email, password);
            // onAuthStateChanged will handle the view change
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
                <h2 className="text-2xl font-bold text-center text-white">تسجيل الدخول</h2>
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
            // FIX: Changed to v8 namespaced API call.
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            if (userCredential.user) {
                // FIX: Changed to v8 namespaced API call.
                await userCredential.user.updateProfile({ displayName: name });
                // FIX: Changed to v8 namespaced API call.
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
                <h2 className="text-2xl font-bold text-center text-white">إنشاء حساب جديد</h2>
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
            // FIX: Changed to v8 namespaced API call.
            await auth.sendPasswordResetEmail(email);
            setSubmitted(true);
        } catch (err: any) {
            // Don't reveal if user exists for security
            if(err.code === 'auth/user-not-found') {
                 setSubmitted(true); // Pretend it was successful
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
                <h2 className="text-2xl font-bold text-center text-white">إعادة تعيين كلمة المرور</h2>
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

// --- Guest View Component ---
const GuestView: React.FC<ViewProps> = ({ setView }) => {
    return (
        <div className="text-center text-white">
            <h1 className="text-3xl font-bold mb-4">
                مرحباً بك كزائر
            </h1>
            <p className="text-sky-200 mb-8">أنت تتصفح التطبيق الآن كضيف.</p>
            <button
                onClick={() => setView('main')}
                className="w-full bg-sky-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-sky-500 transition-transform transform hover:scale-105"
            >
                العودة إلى الصفحة الرئيسية
            </button>
        </div>
    );
};


// --- Logged In View ---
const LoggedInView: React.FC<{ user: firebase.User }> = ({ user }) => {
    const [resendMessage, setResendMessage] = useState('');
    const [cooldownTime, setCooldownTime] = useState(0);

    useEffect(() => {
        if (cooldownTime <= 0) return;

        const timerId = setTimeout(() => {
            setCooldownTime(prevTime => prevTime - 1);
        }, 1000);

        return () => clearTimeout(timerId);
    }, [cooldownTime]);

    const handleSignOut = async () => {
        try {
            await auth.signOut();
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

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
    
    return (
        <div className="text-center text-white">
            <h1 className="text-3xl font-bold mb-4">
                مرحباً بك، {user.displayName || user.email}
            </h1>
            {!user.emailVerified && (
                 <div className="mb-4 p-3 bg-yellow-900/50 text-yellow-300 rounded-lg space-y-3">
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
            <p className="text-sky-200 mb-8">لقد تم تسجيل دخولك بنجاح.</p>
            <button
                onClick={handleSignOut}
                className="w-full bg-red-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-red-500 transition-transform transform hover:scale-105"
            >
                تسجيل الخروج
            </button>
        </div>
    );
};

// --- App Component ---
const App: React.FC = () => {
    const [view, setView] = useState<View>('main');
    // FIX: Changed User type to firebase.User for v8 compatibility.
    const [user, setUser] = useState<firebase.User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // FIX: Changed to v8 namespaced API call.
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const renderAuthViews = () => {
        switch (view) {
            case 'login':
                return <LoginView setView={setView} />;
            case 'signup':
                return <SignupView setView={setView} />;
            case 'forgot-password':
                return <ForgotPasswordView setView={setView} />;
            case 'guest':
                return <GuestView setView={setView} />;
            default:
                return <MainView setView={setView} />;
        }
    };
    
    const renderContent = () => {
        if (loading) {
            return (
                <div className="text-center text-white text-2xl">
                    جارِ التحميل...
                </div>
            );
        }
        if (user) {
            return <LoggedInView user={user} />;
        }
        return renderAuthViews();
    };

    return (
        <main 
            className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1948&auto=format&fit=crop')" }}
        >
            <div className="w-full max-w-md bg-sky-950/70 rounded-2xl shadow-xl p-8 space-y-8 relative backdrop-blur-xl border border-sky-300/30">
                <div className="relative z-10">
                    {renderContent()}
                </div>
            </div>
        </main>
    );
};

export default App;
