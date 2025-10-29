
import React, { useState } from 'react';
import { auth, db, firebase } from './firebase';
import { ViewProps } from './types';
import { getFirebaseErrorMessage } from './utils';
import { EnvelopeIcon, LockClosedIcon, UserIcon, BackArrowIcon, ShieldCheckIcon, EyeIcon, EyeSlashIcon } from './icons';
import { ErrorMessage } from './common';


// --- Main View Component ---
export const MainView: React.FC<ViewProps> = ({ setView, handleGuestLogin }) => {
    return (
        <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4 text-shadow">أهلاً بك في رحلتك نحو التعافي</h1>
            <p className="text-sky-200 mb-8 text-lg">اختر كيف تود المتابعة</p>
            <div className="space-y-4">
                <button
                    onClick={() => setView('login')}
                    className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-md focus:outline-none bg-gradient-to-br from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-indigo-400"
                >
                    تسجيل الدخول
                </button>
                <button
                    onClick={() => setView('signup')}
                    className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-md focus:outline-none bg-gradient-to-br from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-indigo-400"
                >
                    إنشاء حساب
                </button>
                 <button
                    onClick={handleGuestLogin}
                    className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-md focus:outline-none bg-gradient-to-br from-slate-600 to-slate-800 hover:from-slate-500 hover:to-slate-700 hover:shadow-lg hover:shadow-slate-500/20 hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-slate-400"
                >
                    دخول كضيف
                </button>
            </div>
        </div>
    );
};

// --- Login View Component ---
export const LoginView: React.FC<ViewProps> = ({ setView }) => {
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
            await auth.signInWithEmailAndPassword(email, password);
        } catch (err: any) {
            setError(getFirebaseErrorMessage(err.code));
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="w-full bg-slate-900/70 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 shadow-2xl relative">
            <button 
                onClick={() => setView('main')} 
                className="absolute top-4 left-4 p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="العودة"
            >
                <BackArrowIcon className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-indigo-300 mb-8">
                تسجيل الدخول
            </h2>
            <form className="space-y-6" onSubmit={handleSubmit}>
                {error && <ErrorMessage message={error} />}
                <div className="relative">
                    <EnvelopeIcon className="w-5 h-5 text-slate-400 absolute top-1/2 -translate-y-1/2 right-4" />
                    <input
                        type="email"
                        className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-3 pr-12 pl-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition"
                        placeholder="البريد الإلكتروني"
                        aria-label="البريد الإلكتروني"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="relative">
                     <LockClosedIcon className="w-5 h-5 text-slate-400 absolute top-1/2 -translate-y-1/2 right-4" />
                    <input
                        type={showPassword ? 'text' : 'password'}
                        className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-3 pr-12 pl-12 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition"
                        placeholder="كلمة المرور"
                        aria-label="كلمة المرور"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute top-1/2 -translate-y-1/2 left-4 p-1 text-slate-400 hover:text-white transition-colors focus:outline-none"
                        aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                        {showPassword ? <EyeSlashIcon className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
                    </button>
                </div>
                <div className="text-left">
                     <button
                        type="button"
                        onClick={() => setView('forgot-password')}
                        className="text-sm font-semibold text-indigo-300 hover:text-indigo-200 hover:underline focus:outline-none transition"
                    >
                        نسيت كلمة المرور؟
                    </button>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg focus:outline-none bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
                >
                    {loading ? 'جارِ الدخول...' : 'تسجيل الدخول'}
                </button>
                 <p className="text-center text-sm text-slate-400 pt-4">
                    ليس لديك حساب؟{' '}
                    <button type="button" onClick={() => setView('signup')} className="font-semibold text-indigo-300 hover:text-indigo-200 hover:underline">
                        إنشاء حساب
                    </button>
                </p>
            </form>
        </div>
    );
};

// --- Signup View Component ---
export const SignupView: React.FC<ViewProps> = ({ setView }) => {
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
                    isAdmin: false,
                    isMuted: false,
                    commitmentDocument: '',
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
        <div className="w-full bg-slate-900/70 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 shadow-2xl relative">
             <button 
                onClick={() => setView('main')} 
                className="absolute top-4 left-4 p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="العودة"
             >
                <BackArrowIcon className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-indigo-300 mb-8">إنشاء حساب جديد</h2>
            {submitted ? (
                 <div className="text-center text-white">
                    <ShieldCheckIcon className="w-16 h-16 mx-auto text-teal-400 mb-4" />
                    <h3 className="text-xl font-bold mb-2">تم إنشاء حسابك بنجاح!</h3>
                    <p className="mb-6 text-slate-300">
                        تم إرسال رسالة التحقق إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد ومجلد الرسائل غير المرغوب فيها.
                    </p>
                    <button
                        onClick={() => setView('login')}
                        className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg focus:outline-none bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-400"
                    >
                        الذهاب إلى صفحة الدخول
                    </button>
                </div>
            ) : (
                <form className="space-y-6" onSubmit={handleSubmit}>
                    {error && <ErrorMessage message={error} />}
                     <div className="relative">
                        <UserIcon className="w-5 h-5 text-slate-400 absolute top-1/2 -translate-y-1/2 right-4" />
                        <input
                            type="text"
                            className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-3 pr-12 pl-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition"
                            placeholder="الاسم الكامل"
                            aria-label="الاسم الكامل"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="relative">
                        <EnvelopeIcon className="w-5 h-5 text-slate-400 absolute top-1/2 -translate-y-1/2 right-4" />
                        <input
                            type="email"
                             className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-3 pr-12 pl-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition"
                            placeholder="البريد الإلكتروني"
                            aria-label="البريد الإلكتروني"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="relative">
                        <LockClosedIcon className="w-5 h-5 text-slate-400 absolute top-1/2 -translate-y-1/2 right-4" />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-3 pr-12 pl-12 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition"
                            placeholder="كلمة المرور"
                            aria-label="كلمة المرور"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute top-1/2 -translate-y-1/2 left-4 p-1 text-slate-400 hover:text-white transition-colors focus:outline-none"
                            aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                        >
                            {showPassword ? <EyeSlashIcon className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
                        </button>
                    </div>
                     <div className="relative">
                        <LockClosedIcon className="w-5 h-5 text-slate-400 absolute top-1/2 -translate-y-1/2 right-4" />
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-3 pr-12 pl-12 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition"
                            placeholder="تأكيد كلمة المرور"
                            aria-label="تأكيد كلمة المرور"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                         <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                             className="absolute top-1/2 -translate-y-1/2 left-4 p-1 text-slate-400 hover:text-white transition-colors focus:outline-none"
                            aria-label={showConfirmPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                        >
                            {showConfirmPassword ? <EyeSlashIcon className="w-6 h-6" /> : <EyeIcon className="w-6 h-6" />}
                        </button>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg focus:outline-none bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
                    >
                        {loading ? 'جارِ إنشاء الحساب...' : 'إنشاء الحساب'}
                    </button>
                    <p className="text-center text-sm text-slate-400 pt-4">
                        لديك حساب بالفعل؟{' '}
                        <button type="button" onClick={() => setView('login')} className="font-semibold text-indigo-300 hover:text-indigo-200 hover:underline">
                            تسجيل الدخول
                        </button>
                    </p>
                </form>
            )}
        </div>
    );
};

// --- Forgot Password View Component ---
export const ForgotPasswordView: React.FC<ViewProps> = ({ setView }) => {
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
        <div className="w-full bg-slate-900/70 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 shadow-2xl relative">
            <button 
                onClick={() => setView('login')} 
                className="absolute top-4 left-4 p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="العودة"
            >
                <BackArrowIcon className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-indigo-300 mb-6">
                إعادة تعيين كلمة المرور
            </h2>
            
            {submitted ? (
                <div className="text-center text-white">
                    <ShieldCheckIcon className="w-16 h-16 mx-auto text-teal-400 mb-4" />
                    <h3 className="text-xl font-bold mb-2">تم إرسال الرابط</h3>
                    <p className="mb-6 text-slate-300">إذا كان بريدك الإلكتروني مسجلاً لدينا، فستصلك رسالة لإعادة التعيين. يرجى التحقق من صندوق الوارد والرسائل غير المرغوب فيها.</p>
                    <button
                        onClick={() => setView('login')}
                        className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg focus:outline-none bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-400"
                    >
                        العودة لتسجيل الدخول
                    </button>
                </div>
            ) : (
                <form className="space-y-6" onSubmit={handleSubmit}>
                    {error && <ErrorMessage message={error} />}
                    <p className="text-center text-slate-300">أدخل بريدك الإلكتروني المسجل وسنرسل لك رابطًا لإعادة تعيين كلمة المرور.</p>
                    <div className="relative">
                         <EnvelopeIcon className="w-5 h-5 text-slate-400 absolute top-1/2 -translate-y-1/2 right-4" />
                        <input
                            type="email"
                            className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-3 pr-12 pl-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 transition"
                            placeholder="البريد الإلكتروني"
                            aria-label="البريد الإلكتروني"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg focus:outline-none bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
                    >
                        {loading ? 'جارِ الإرسال...' : 'إرسال رابط إعادة التعيين'}
                    </button>
                </form>
            )}
        </div>
    );
};