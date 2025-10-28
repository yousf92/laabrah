
// FIX: Correctly import React hooks and replace 'aistate' with 'useState'.
import React, { useState, useEffect, useRef } from 'react';
// FIX: Use Firebase v9 compat libraries to support v8 syntax, resolving property and type errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore'; // Added Firestore
import { 
    onAuthStateChanged,
} from 'firebase/auth';
import { GoogleGenAI, Chat } from "@google/genai";

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
    isAdmin?: boolean;
    isMuted?: boolean;
    commitmentDocument?: string;
}

interface Conversation extends Omit<UserProfile, 'uid'> {
    uid: string;
    hasUnread?: boolean;
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
    replyTo?: {
        id: string;
        text: string;
        displayName: string;
    };
}

interface PinnedMessage {
    id: string;
    text: string;
    uid: string;
    displayName: string;
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

const getArabicUnitLabel = (count: number, unit: 'month' | 'day' | 'hour' | 'minute' | 'second'): string => {
    const units = {
        month: { single: 'شهر', dual: 'شهران', plural: 'أشهر' },
        day: { single: 'يوم', dual: 'يومان', plural: 'أيام' },
        hour: { single: 'ساعة', dual: 'ساعتان', plural: 'ساعات' },
        minute: { single: 'دقيقة', dual: 'دقيقتان', plural: 'دقائق' },
        second: { single: 'ثانية', dual: 'ثانيتان', plural: 'ثواني' },
    };

    const u = units[unit];

    if (count === 1) return u.single;
    if (count === 2) return u.dual;
    return u.plural;
};


// --- SVG Icons ---
const FireIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 00-1.071 1.071L12 4.429l-1.106 1.107a.75.75 0 001.07 1.071L12 6.57l1.107-1.106a.75.75 0 00-1.072-1.071L12 4.429 10.894 3.322a.75.75 0 00-1.07 1.071L12 6.57l1.106 1.107a.75.75 0 001.071-1.07L12 6.57l1.106-1.107a.75.75 0 00-1.07-1.071L12 4.429 12.963 2.286zM8.39 8.25a.75.75 0 00-1.07 1.07l1.106 1.106a.75.75 0 001.07-1.07L8.39 8.25zM12 12.75a.75.75 0 00-.75.75v3.75a.75.75 0 001.5 0V13.5a.75.75 0 00-.75-.75zM15.61 8.25a.75.75 0 00-1.07-1.07L13.434 8.25a.75.75 0 001.07 1.07l1.106-1.106z" clipRule="evenodd" />
        <path d="M10.152 16.354a.75.75 0 01-1.06 1.06l-2.01-2.011a3 3 0 01-1.252-2.122 3 3 0 011.396-2.628l2.929-1.709a.75.75 0 011.23.838l-.94 2.057a.75.75 0 01-1.353-.62l.711-1.545-2.071 1.2a1.5 1.5 0 00-.698 1.314 1.5 1.5 0 00.626 1.06l1.458 1.458zM16.5 18c.95 0 1.848-.394 2.5-1.088l-1.026-1.026a.75.75 0 011.06-1.06l1.027 1.026c.42-.803.54-1.738.332-2.652a.75.75 0 01-1.482.223 2.769 2.769 0 00-.312 1.405 2.75 2.75 0 00-2.094 2.162.75.75 0 01-1.472-.294 4.25 4.25 0 013.998-3.998.75.75 0 01.294 1.472A2.75 2.75 0 0016.5 18z" />
    </svg>
);

const EnvelopeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
);

const LockClosedIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 00-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);

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
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542 7z" />
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

const PinIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M16,12V4H17V2H7V4H8V12L6,14V16H11.5V22H12.5V16H18V14L16,12Z" />
    </svg>
);

const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const ShieldExclamationIcon: React.FC<{ className?: string }> = ({ className }) => ( 
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
);

const SpeakerXMarkIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-3l4.707-4.707C10.923 3.663 12 4.108 12 5v14c0 .892-1.077 1.337-1.707.707L5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l2.121-2.121" />
    </svg>
);

const ReplyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
);

const ArrowUpCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11.25l-3-3m0 0l-3 3m3-3v7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ArrowDownCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75l3 3m0 0l3-3m-3 3v-7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
);

const ArrowLeftOnRectangleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
);

const BookOpenIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
);

const SealIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className={className} fill="currentColor">
      <path d="M50 5c24.85 0 45 20.15 45 45s-20.15 45-45 45S5 74.85 5 50 25.15 5 50 5zm-3.5 1.5c-2.3.4-4.5 1-6.6 1.8-11.4 4.5-19.4 15.3-20.7 27.6-.3 2.7-.3 5.5 0 8.2 2 17.8 15.7 31.5 33.5 33.5 2.7.3 5.5.3 8.2 0 17.8-2 31.5-15.7 33.5-33.5.3-2.7.3-5.5 0-8.2-1.3-12.3-9.3-23.1-20.7-27.6-2.1-.8-4.3-1.4-6.6-1.8-1.1-.2-2.3-.2-3.4 0z" opacity=".5"/>
      <path d="M50 10c22.09 0 40 17.91 40 40s-17.91 40-40 40S10 72.09 10 50 27.91 10 50 10zm-2.9 1.2c-1.9.3-3.8.8-5.6 1.5C29.2 17.2 20.8 27 19.3 38.9c-.3 2.3-.3 4.6 0 6.9 1.7 15 13.2 26.5 28.2 28.2 2.3.3 4.6.3 6.9 0 15-1.7 26.5-13.2 28.2-28.2.3-2.3.3-4.6 0-6.9-1.5-11.9-9.9-21.7-22.2-26.2-1.8-.7-3.7-1.2-5.6-1.5-.9-.2-1.9-.2-2.8 0z" opacity=".7"/>
      <path d="M50 15c19.33 0 35 15.67 35 35s-15.67 35-35 35S15 69.33 15 50 30.67 15 50 15z"/>
      <path fill="#fff" d="M50 26.25l5.87 11.89 13.13 1.91-9.5 9.26 2.24 13.08L50 56.63l-11.74 6.17 2.24-13.08-9.5-9.26 13.13-1.91z"/>
    </svg>
);


// --- UI Components ---
const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
    <p className="text-center text-red-400 bg-red-900/50 p-3 rounded-lg text-sm">{message}</p>
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
        <div className="w-full bg-slate-900/50 backdrop-blur-md border border-slate-700 rounded-2xl p-8 shadow-2xl relative">
            <button 
                onClick={() => setView('main')} 
                className="absolute top-4 left-4 p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
                aria-label="العودة"
            >
                <BackArrowIcon className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-sky-400 mb-8">
                تسجيل الدخول
            </h2>
            <form className="space-y-6" onSubmit={handleSubmit}>
                {error && <ErrorMessage message={error} />}
                <div className="relative">
                    <EnvelopeIcon className="w-5 h-5 text-slate-400 absolute top-1/2 -translate-y-1/2 right-4" />
                    <input
                        type="email"
                        className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-3 pr-12 pl-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
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
                        className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-3 pr-12 pl-12 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
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
                        className="text-sm font-semibold text-teal-300 hover:text-teal-200 hover:underline focus:outline-none transition"
                    >
                        نسيت كلمة المرور؟
                    </button>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg focus:outline-none bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-400 hover:to-sky-500 hover:shadow-teal-500/30 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-teal-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
                >
                    {loading ? 'جارِ الدخول...' : 'تسجيل الدخول'}
                </button>
                 <p className="text-center text-sm text-slate-400 pt-4">
                    ليس لديك حساب؟{' '}
                    <button type="button" onClick={() => setView('signup')} className="font-semibold text-teal-300 hover:text-teal-200 hover:underline">
                        إنشاء حساب
                    </button>
                </p>
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
        <div className="w-full bg-slate-900/50 backdrop-blur-md border border-slate-700 rounded-2xl p-8 shadow-2xl relative">
             <button 
                onClick={() => setView('main')} 
                className="absolute top-4 left-4 p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
                aria-label="العودة"
             >
                <BackArrowIcon className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-sky-400 mb-8">إنشاء حساب جديد</h2>
            {submitted ? (
                 <div className="text-center text-white">
                    <ShieldCheckIcon className="w-16 h-16 mx-auto text-teal-400 mb-4" />
                    <h3 className="text-xl font-bold mb-2">تم إنشاء حسابك بنجاح!</h3>
                    <p className="mb-6 text-slate-300">
                        تم إرسال رسالة التحقق إلى بريدك الإلكتروني. يرجى التحقق من صندوق الوارد ومجلد الرسائل غير المرغوب فيها.
                    </p>
                    <button
                        onClick={() => setView('login')}
                        className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg focus:outline-none bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-400 hover:to-sky-500 hover:shadow-teal-500/30 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-teal-400"
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
                            className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-3 pr-12 pl-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
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
                             className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-3 pr-12 pl-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
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
                            className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-3 pr-12 pl-12 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
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
                            className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-3 pr-12 pl-12 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
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
                        className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg focus:outline-none bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-400 hover:to-sky-500 hover:shadow-teal-500/30 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-teal-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
                    >
                        {loading ? 'جارِ إنشاء الحساب...' : 'إنشاء الحساب'}
                    </button>
                    <p className="text-center text-sm text-slate-400 pt-4">
                        لديك حساب بالفعل؟{' '}
                        <button type="button" onClick={() => setView('login')} className="font-semibold text-teal-300 hover:text-teal-200 hover:underline">
                            تسجيل الدخول
                        </button>
                    </p>
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
        <div className="w-full bg-slate-900/50 backdrop-blur-md border border-slate-700 rounded-2xl p-8 shadow-2xl relative">
            <button 
                onClick={() => setView('login')} 
                className="absolute top-4 left-4 p-2 rounded-full text-slate-300 hover:text-white hover:bg-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
                aria-label="العودة"
            >
                <BackArrowIcon className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-bold text-center text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-sky-400 mb-6">
                إعادة تعيين كلمة المرور
            </h2>
            
            {submitted ? (
                <div className="text-center text-white">
                    <ShieldCheckIcon className="w-16 h-16 mx-auto text-teal-400 mb-4" />
                    <h3 className="text-xl font-bold mb-2">تم إرسال الرابط</h3>
                    <p className="mb-6 text-slate-300">إذا كان بريدك الإلكتروني مسجلاً لدينا، فستصلك رسالة لإعادة التعيين. يرجى التحقق من صندوق الوارد والرسائل غير المرغوب فيها.</p>
                    <button
                        onClick={() => setView('login')}
                        className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg focus:outline-none bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-400 hover:to-sky-500 hover:shadow-teal-500/30 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-teal-400"
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
                            className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-3 pr-12 pl-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition"
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
                        className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg focus:outline-none bg-gradient-to-r from-teal-500 to-sky-600 hover:from-teal-400 hover:to-sky-500 hover:shadow-teal-500/30 hover:scale-105 active:scale-95 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-teal-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none"
                    >
                        {loading ? 'جارِ الإرسال...' : 'إرسال رابط إعادة التعيين'}
                    </button>
                </form>
            )}
        </div>
    );
};

// --- Najda (Help) Feature ---
const NajdaFeature: React.FC = () => {
    type NajdaView = 'home' | 'breathing' | 'advice';
    const [view, setView] = useState<NajdaView>('home');
    const [breathingText, setBreathingText] = useState('استعد...');
    const [countdown, setCountdown] = useState(57);
    const [advice, setAdvice] = useState('');
    const [adviceLoading, setAdviceLoading] = useState(false);

    // Refs for API key rotation
    const apiKeysRef = useRef<string[]>([]);
    const currentKeyIndexRef = useRef(0);

    // Effect for the 57s countdown and transitioning to advice view
    useEffect(() => {
        if (view !== 'breathing') return;

        setCountdown(57); // Reset countdown on view change
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setView('advice');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [view]);

    // Effect for the breathing text cycle (19 seconds)
    useEffect(() => {
        if (view !== 'breathing') return;

        setBreathingText('شهيق'); // Inhale
        const t1 = setTimeout(() => setBreathingText('حبس النفس'), 4000); // Hold
        const t2 = setTimeout(() => setBreathingText('زفير'), 11000); // Exhale (4+7)
        
        const interval = setInterval(() => {
            setBreathingText('شهيق');
            setTimeout(() => setBreathingText('حبس النفس'), 4000);
            setTimeout(() => setBreathingText('زفير'), 11000);
        }, 19000);

        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
            clearInterval(interval);
        };
    }, [view]);

    // Effect for fetching the advice from Gemini
    useEffect(() => {
        if (view !== 'advice') return;

        const fetchAdvice = async () => {
            setAdviceLoading(true);
            setAdvice('');

            if (apiKeysRef.current.length === 0) {
                 apiKeysRef.current = (process.env.API_KEY || '')
                    .split(',')
                    .map(k => k.trim())
                    .filter(Boolean);
            }
        
            if (apiKeysRef.current.length === 0) {
                console.error("Gemini API key not found in process.env.API_KEY");
                setAdvice('لا تستسلم، فبداية الأشياء دائماً هي الأصعب.');
                setAdviceLoading(false);
                return;
            }
            
            const prompt = "كلمني";
            const systemInstruction = "بصفتك ناصح أمين على منهج السلف الصالح خاطب شخص على وشك يطيح في معصية العادة السرية أو مشاهدة الإباحية عطه كلام قوي ومباشر يجمع بين العقل والترهيب والتذكير بعواقب الفعل عشان يتراجع فورا تكلم باللهجة السعودية العامية وردك لازم يكون بدون تشكيل وبدون أي علامات ترقيم نهائيا وخليه قصير ومختصر وطبيعي كأنك تكلم خوي";
            let success = false;
            const totalKeys = apiKeysRef.current.length;

            for (let i = 0; i < totalKeys; i++) {
                const keyIndex = (currentKeyIndexRef.current + i) % totalKeys;
                const apiKey = apiKeysRef.current[keyIndex];

                try {
                    const ai = new GoogleGenAI({ apiKey });
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: prompt,
                        config: { systemInstruction }
                    });

                    setAdvice(response.text);
                    currentKeyIndexRef.current = keyIndex;
                    success = true;
                    break; 

                } catch (error: any) {
                    console.error(`Gemini API error with key index ${keyIndex}:`, error);
                    const isQuotaError = error.toString().includes('429');
                    if (isQuotaError) {
                        console.warn(`Key index ${keyIndex} has reached its quota. Trying next key.`);
                        continue;
                    } else {
                        break;
                    }
                }
            }
            
            if (!success) {
                setAdvice('لا تستسلم، فبداية الأشياء دائماً هي الأصعب.');
            }

            setAdviceLoading(false);
        };
        
        fetchAdvice();
    }, [view]);

    const handleClose = () => {
        setView('home');
        setAdvice('');
        setAdviceLoading(false);
    };

    if (view === 'home') {
        return (
            <div className="mt-8 max-w-sm mx-auto">
                <button
                    onClick={() => setView('breathing')}
                    className="w-full flex items-center justify-center gap-3 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-orange-500 to-red-700 hover:from-orange-400 hover:to-red-600 hover:shadow-xl hover:shadow-red-500/30 hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-red-400"
                >
                    <FireIcon className="w-6 h-6 animate-flicker" />
                    <span>النجدة!</span>
                </button>
            </div>
        );
    }
    
    // The Modal part
    return (
        <div className="fixed inset-0 bg-sky-950/90 backdrop-blur-lg flex flex-col items-center justify-center z-50 p-4 text-white text-center">
            {view === 'breathing' && (
                <>
                    <div className="relative w-64 h-64 flex items-center justify-center">
                        <div className="absolute inset-0 bg-sky-400/20 rounded-full breathing-circle"></div>
                        <div className="relative z-10">
                            <h2 className="text-4xl font-bold text-shadow">{breathingText}</h2>
                        </div>
                    </div>
                    <p className="mt-8 text-6xl font-mono font-bold text-shadow">{countdown}</p>
                </>
            )}

            {view === 'advice' && (
                <div className="max-w-md flex flex-col items-center">
                    {adviceLoading ? (
                         <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-400 mx-auto"></div>
                    ) : (
                        <>
                            <p className="text-2xl font-semibold leading-relaxed text-shadow mb-2">"</p>
                            <p className="text-2xl font-semibold leading-relaxed text-shadow">{advice}</p>
                            <p className="text-2xl font-semibold leading-relaxed text-shadow mt-2">"</p>
                        </>
                    )}
                </div>
            )}
            
            <button
                onClick={handleClose}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 px-8 py-3 font-semibold rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500"
            >
                إغلاق
            </button>
        </div>
    );
};

// --- Desire Solver Feature ---
const DesireSolverFeature: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [chat, setChat] = useState<Chat | null>(null);
    const [currentResponse, setCurrentResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const apiKeysRef = useRef<string[]>([]);
    const currentKeyIndexRef = useRef(0);

    const initializeApiKeys = () => {
        if (apiKeysRef.current.length === 0) {
             apiKeysRef.current = (process.env.API_KEY || '')
                .split(',')
                .map(k => k.trim())
                .filter(Boolean);
        }
    };

    const getNewSolution = async (isFirstRequest = false) => {
        setIsLoading(true);
        setError('');
        setCurrentResponse('');
        initializeApiKeys();

        if (apiKeysRef.current.length === 0) {
            console.error("Gemini API key not found in process.env.API_KEY");
            setError('حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى.');
            setIsLoading(false);
            return;
        }

        const systemInstruction = "بصفتك ناصح أمين وفاهم على منهج السلف الصالح خاطب شخص على وشك يطيح في معصية العادة السرية أو مشاهدة الإباحية عطه كلام قوي ومباشر يجمع بين العقل والترهيب والتذكير بعواقب الفعل عشان يتراجع فورا تكلم باللهجة السعودية العامية وكأنك تسولف مع خويك في أزمة لا تكلمني كأنك آلة أو خطيب.. لا تستخدم أي تشكيل أو علامات ترقيم نهائيا لا فاصلة ولا نقطة ولا شي.. عطني كلام طويل ومفصل وخش في صلب الموضوع على طول.. الأهم من هذا كله (شرط أساسي): التنوع الكامل وعدم التكرار. كل مرة أقول لك 'أبغى حل ثاني' لازم تعطيني حل جديد ومختلف تماما عن כל الحلول اللي عطيتني إياها قبل. لا تعيد صياغة نفس الفكرة ولا تكرر أي نصيحة. إذا حسيت إنك بتكرر وقف وقول لي ما عندي شي جديد. لازم כל حل يكون فكرة مستقلة وجديدة.";
        const initialPrompt = "اسمع يا صاحبي أنا فيني بلا وأحس إني على وشك أطيح في مشاهدة المقاطع الإباحية والرغبة قوية مرة أبغاك بصفتك ناصح أمين وفاهم على منهج السلف الصالح تعطيني حل عملي وفوري أقدر أسويه الحين عشان أطفي هذي النار";
        const followUpPrompt = "أبغى حل ثاني";
        
        let localChat = chat;
        let success = false;
        
        for (let i = 0; i < apiKeysRef.current.length; i++) {
            const keyIndex = (currentKeyIndexRef.current + i) % apiKeysRef.current.length;
            const apiKey = apiKeysRef.current[keyIndex];

            try {
                const ai = new GoogleGenAI({ apiKey });

                if (!localChat) {
                    const newChat = ai.chats.create({
                        model: 'gemini-2.5-flash',
                        config: { 
                            systemInstruction,
                            maxOutputTokens: 8192,
                            thinkingConfig: { thinkingBudget: 1024 },
                        },
                    });
                    setChat(newChat);
                    localChat = newChat;
                }

                const prompt = isFirstRequest ? initialPrompt : followUpPrompt;
                const response = await localChat.sendMessage({ message: prompt });
                
                setCurrentResponse(response.text);
                currentKeyIndexRef.current = keyIndex;
                success = true;
                break;

            } catch (err: any) {
                console.error(`Gemini API error with key index ${keyIndex}:`, err);
                const isQuotaError = err.toString().includes('429');
                if (isQuotaError) {
                    console.warn(`Key index ${keyIndex} has reached its quota. Trying next key.`);
                    setChat(null); // Reset chat session if key fails
                    localChat = null;
                    continue;
                } else {
                    setError('حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.');
                    break;
                }
            }
        }
        
        if (!success && !error) {
            setError('فشلت جميع محاولات الاتصال، حاول مرة أخرى.');
        }

        setIsLoading(false);
    };
    
    const handleOpen = () => {
        setIsOpen(true);
        getNewSolution(true);
    };

    const handleClose = () => {
        setIsOpen(false);
        setChat(null);
        setCurrentResponse('');
        setError('');
    };

    if (!isOpen) {
        return (
            <div className="mt-8 max-w-sm mx-auto">
                <button
                    onClick={handleOpen}
                    className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-indigo-500 to-purple-700 hover:from-indigo-400 hover:to-purple-600 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-purple-400"
                >
                    <span>عندي رغبة شديدة، اعطني حلاً</span>
                </button>
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-sky-950/90 backdrop-blur-lg flex flex-col items-center justify-center z-50 p-4 text-white text-center">
            <div className="max-w-md w-full flex-grow flex flex-col items-center justify-start overflow-y-auto py-4 min-h-0">
                {isLoading && (
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-400 mx-auto"></div>
                )}
                {error && <ErrorMessage message={error} />}
                {!isLoading && currentResponse && (
                     <p className="text-xl font-semibold leading-relaxed text-shadow">{currentResponse}</p>
                )}
            </div>
            
            <div className="w-full max-w-sm flex flex-col gap-4 pb-10 flex-shrink-0">
                 {!isLoading && (
                    <button
                        onClick={() => getNewSolution(false)}
                        className="w-full px-8 py-3 font-semibold rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-sky-500"
                    >
                        أبغى حل ثاني
                    </button>
                 )}
                 <button
                    onClick={handleClose}
                    className="w-full px-8 py-3 font-semibold rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500"
                >
                    إغلاق
                </button>
            </div>
        </div>
    );
};

// --- Faith Dose Feature ---
const FaithDoseFeature: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [chat, setChat] = useState<Chat | null>(null);
    const [currentStory, setCurrentStory] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const apiKeysRef = useRef<string[]>([]);
    const currentKeyIndexRef = useRef(0);

    const initializeApiKeys = () => {
        if (apiKeysRef.current.length === 0) {
             apiKeysRef.current = (process.env.API_KEY || '')
                .split(',')
                .map(k => k.trim())
                .filter(Boolean);
        }
    };

    const getNewStory = async (isFirstRequest = false) => {
        setIsLoading(true);
        setError('');
        setCurrentStory('');
        initializeApiKeys();

        if (apiKeysRef.current.length === 0) {
            console.error("Gemini API key not found in process.env.API_KEY");
            setError('حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى.');
            setIsLoading(false);
            return;
        }

        const systemInstruction = "بصفتك ناصح امين وفاهم على منهج السلف الصالح اسمع يا صاحبي أبغاك تسولف لي سالفة عن واحد من الصالحين وكيف كان خوفه من الله وتقواه وكيف كان يجاهد نفسه عشان يترك المعاصي وكيف لقى لذة الإيمان الحقيقية واربط لي هالكلام بموضوع التعافي من الإدمان وكيف إن لذة الطاعة أحلى وأبقى من لذة المعصية الزايلة. الشخصيات: لا تجيب لي سيرة الخلفاء الراشدين الأربعة (أبو بكر وعمر وعثمان وعلي) لأني أعرف قصصهم. أبغاك تجيب لي قصص عشوائية وجديدة كل مرة من حياة التابعين وتابعي التابعين والعلماء والصالحين والعباد والزهاد من כל العصور. يعني كل مرة أطلب منك عطني قصة لشخصية مختلفة تماما ولا تكرر لي نفس الشخصية أبدا. المنهج: لا تطلع عن منهج السلف الصالح في طريقة سردك للقصص والمعلومات.. اللهجة: تكلم باللهجة السعودية العامية وخلك طبيعي كأنك تسولف مع خويك في استراحة.. التنسيق: لا تستخدم أي علامات ترقيم (لا فاصلة ولا نقطة) ولا أي تشكيل (فتحة ضمة كسرة) نهائيا.. الطول: عطني كلام طويل ومفصل وسولف من قلبك. ركز معي زين: كل قصة لازم تبدأ بذكر اسم صاحبها بوضوح. مثلا تقول 'بأسولف لك عن فلان...' وبعدها تبدأ القصة من أولها مو من نصها. هذا شرط أساسي ومهم جدا. أكرر مرة ثانية: بداية ردك لازم تكون بالصيغة هذي 'اسمع سالفة فلان بن فلان' وبعدها تبدأ القصة مباشرة بدون أي مقدمات ثانية.";
        const initialPrompt = "عطني اول قصة";
        const followUpPrompt = "أبغى قصة ثانية";
        
        let localChat = chat;
        let success = false;
        
        for (let i = 0; i < apiKeysRef.current.length; i++) {
            const keyIndex = (currentKeyIndexRef.current + i) % apiKeysRef.current.length;
            const apiKey = apiKeysRef.current[keyIndex];

            try {
                const ai = new GoogleGenAI({ apiKey });

                if (!localChat) {
                    const newChat = ai.chats.create({
                        model: 'gemini-2.5-flash',
                        config: { 
                            systemInstruction,
                            maxOutputTokens: 8192,
                            thinkingConfig: { thinkingBudget: 1024 },
                        },
                    });
                    setChat(newChat);
                    localChat = newChat;
                }

                const prompt = isFirstRequest ? initialPrompt : followUpPrompt;
                const response = await localChat.sendMessage({ message: prompt });
                
                setCurrentStory(response.text);
                currentKeyIndexRef.current = keyIndex;
                success = true;
                break;

            } catch (err: any) {
                console.error(`Gemini API error with key index ${keyIndex}:`, err);
                const isQuotaError = err.toString().includes('429');
                if (isQuotaError) {
                    console.warn(`Key index ${keyIndex} has reached its quota. Trying next key.`);
                    setChat(null); 
                    localChat = null;
                    continue;
                } else {
                    setError('حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.');
                    break;
                }
            }
        }
        
        if (!success && !error) {
            setError('فشلت جميع محاولات الاتصال، حاول مرة أخرى.');
        }

        setIsLoading(false);
    };
    
    const handleOpen = () => {
        setIsOpen(true);
        getNewStory(true);
    };

    const handleClose = () => {
        setIsOpen(false);
        setChat(null);
        setCurrentStory('');
        setError('');
    };

    if (!isOpen) {
        return (
            <div className="mt-8 max-w-sm mx-auto">
                <button
                    onClick={handleOpen}
                    className="w-full flex items-center justify-center gap-3 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-green-500 to-teal-700 hover:from-green-400 hover:to-teal-600 hover:shadow-xl hover:shadow-teal-500/30 hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-teal-400"
                >
                    <BookOpenIcon className="w-6 h-6" />
                    <span>عطني جرعة ايمانية من قصص السلف</span>
                </button>
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-sky-950/90 backdrop-blur-lg flex flex-col items-center justify-center z-50 p-4 text-white text-center">
            <div className="max-w-md w-full flex-grow flex flex-col items-center justify-start overflow-y-auto py-4 min-h-0">
                {isLoading && (
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-400 mx-auto"></div>
                )}
                {error && <ErrorMessage message={error} />}
                {!isLoading && currentStory && (
                     <p className="text-xl font-semibold leading-relaxed text-shadow">{currentStory}</p>
                )}
            </div>
            
            <div className="w-full max-w-sm flex flex-col gap-4 pb-10 flex-shrink-0">
                 {!isLoading && (
                    <button
                        onClick={() => getNewStory(false)}
                        className="w-full px-8 py-3 font-semibold rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-sky-500"
                    >
                        أبغى قصة ثانية
                    </button>
                 )}
                 <button
                    onClick={handleClose}
                    className="w-full px-8 py-3 font-semibold rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500"
                >
                    إغلاق
                </button>
            </div>
        </div>
    );
};

// --- Commitment Document Feature ---
const CommitmentDocumentFeature: React.FC<{ user: firebase.User; initialText?: string }> = ({ user, initialText }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [documentText, setDocumentText] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const hasSavedContent = useRef(!!initialText);

    useEffect(() => {
        setDocumentText(initialText || '');
        hasSavedContent.current = !!initialText;
    }, [initialText]);

    useEffect(() => {
        if (isOpen && !hasSavedContent.current) {
            setIsEditing(true);
        }
    }, [isOpen]);

    const handleOpen = () => setIsOpen(true);
    const handleClose = () => {
        setIsOpen(false);
        setIsEditing(false);
        // Reset text to the last saved state if the user cancels
        setDocumentText(initialText || '');
        setMessage(''); // Clear any messages
    };
    
    const handleEdit = () => {
        setIsEditing(true);
        setMessage(''); // Clear message when going into edit mode
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage('');
        try {
            await db.collection('users').doc(user.uid).set({
                commitmentDocument: documentText
            }, { merge: true });
            setMessage('تم الحفظ بنجاح!');
            hasSavedContent.current = true; // Mark that there's saved content now
            setIsEditing(false);
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Error saving commitment document:", error);
            setMessage('حدث خطأ أثناء الحفظ.');
             setTimeout(() => setMessage(''), 3000);
        } finally {
            setLoading(false);
        }
    };
    
    if (!isOpen) {
        return (
             <div className="mt-8 max-w-sm mx-auto">
                <button
                    onClick={handleOpen}
                    className="w-full flex items-center justify-center gap-3 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-slate-500 to-slate-700 hover:from-slate-400 hover:to-slate-600 hover:shadow-xl hover:shadow-slate-500/30 hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-slate-400"
                >
                    <BookOpenIcon className="w-6 h-6" />
                    <span>وثيقة الالتزام</span>
                </button>
            </div>
        );
    }
    
    return (
        <div className="fixed inset-0 bg-sky-950/90 backdrop-blur-lg flex flex-col items-center justify-center z-50 p-4 text-white">
            <div className="w-full max-w-md h-full flex flex-col">
                <header className="flex items-center justify-between p-4 border-b border-sky-400/30 flex-shrink-0">
                    <h2 className="text-xl font-bold text-sky-200 text-shadow">وثيقة الالتزام</h2>
                    <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </header>
                
                <main className="flex-grow overflow-y-auto p-6 space-y-4">
                    {isEditing ? (
                        <>
                            <p className="text-sm text-sky-200">
                                اكتب هنا حالتك ومشاعرك الآن... لماذا تريد أن تترك؟ ما هو شعورك السيء؟ اجعلها رسالة لنفسك في المستقبل كلما فكرت في العودة.
                            </p>
                            <textarea
                                value={documentText}
                                onChange={(e) => setDocumentText(e.target.value)}
                                placeholder="أنا ألتزم بترك هذا الفعل لأن..."
                                className="w-full h-64 bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition resize-none"
                            />
                        </>
                    ) : (
                        <div className="bg-gradient-to-br from-[#fdf6e3] to-[#f7f0d8] text-[#5a4635] p-6 rounded-lg shadow-2xl border-4 border-double border-[#d4b996] relative min-h-[20rem] flex flex-col justify-between font-amiri">
                            <div className="text-center">
                                <h3 className="text-4xl font-bold text-[#8c7862] tracking-wide">وثيقة الالتزام</h3>
                                <div className="w-2/3 h-px bg-[#d4b996] mx-auto my-4"></div>
                            </div>
                            
                            <p className="text-lg whitespace-pre-wrap break-words leading-loose text-center my-4 flex-grow">
                                {documentText}
                            </p>
                        
                            <div className="mt-auto pt-4 text-center">
                                <p className="text-2xl font-bold tracking-wider">{user.displayName}</p>
                                <div className="w-1/2 h-px bg-[#d4b996] mx-auto mt-1"></div>
                                <p className="text-sm text-[#8c7862]">التوقيع</p>
                            </div>
                        
                            <div className="absolute bottom-4 left-4">
                                <SealIcon className="w-16 h-16 text-[#b93c3c]" />
                            </div>
                        </div>
                    )}
                    {message && <p className={`text-center text-sm ${message.includes('خطأ') ? 'text-red-400' : 'text-green-300'}`}>{message}</p>}
                </main>
                
                <footer className="w-full flex flex-col gap-4 p-4 flex-shrink-0">
                    {isEditing ? (
                        <div className="flex gap-4">
                            {hasSavedContent.current && 
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="w-1/2 px-8 py-3 font-semibold rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500"
                                >
                                    إلغاء
                                </button>
                            }
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-teal-500 to-teal-700 hover:from-teal-400 hover:to-teal-600 hover:shadow-xl hover:shadow-teal-500/30 hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-teal-400 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'جارِ الحفظ...' : 'حفظ الوثيقة'}
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleEdit}
                            className="w-full flex items-center justify-center gap-3 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-sky-400"
                        >
                            <PencilIcon className="w-5 h-5" />
                            <span>تعديل</span>
                        </button>
                    )}
                </footer>
            </div>
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
            <div className="absolute inset-0 flex items-center justify-start pr-4">
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
    hasUnreadPrivateMessages: boolean;
    currentUserProfile: UserProfile | null;
}> = ({ user, setActiveTab, startDate, handleStartCounter, counterImage, setShowNotifications, setShowChat, hasUnreadPrivateMessages, currentUserProfile }) => {
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
                        <button onClick={() => setShowChat(true)} className="relative p-2 rounded-full hover:bg-white/10 transition-colors">
                            <ChatIcon className="w-6 h-6"/>
                            {hasUnreadPrivateMessages && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-sky-950/90"></span>}
                        </button>
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
                                <CounterBar label={`0 ${getArabicUnitLabel(0, 'month')}`} progress={0} colorClass="bg-orange-500" />
                                <CounterBar label={`0 ${getArabicUnitLabel(0, 'day')}`} progress={0} colorClass="bg-lime-500" />
                                <CounterBar label={`0 ${getArabicUnitLabel(0, 'hour')}`} progress={0} colorClass="bg-blue-500" />
                                <CounterBar label={`0 ${getArabicUnitLabel(0, 'minute')}`} progress={0} colorClass="bg-pink-500" />
                                <CounterBar label={`0 ${getArabicUnitLabel(0, 'second')}`} progress={0} colorClass="bg-yellow-500" />
                            </div>
                       </div>
                    </div>
                </main>

                <NajdaFeature />
                <DesireSolverFeature />
                <FaithDoseFeature />
                <CommitmentDocumentFeature user={user} initialText={currentUserProfile?.commitmentDocument} />

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
                    <button onClick={() => setShowChat(true)} className="relative p-2 rounded-full hover:bg-white/10 transition-colors">
                        <ChatIcon className="w-6 h-6"/>
                        {hasUnreadPrivateMessages && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-sky-950/90"></span>}
                    </button>
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
                            <CounterBar label={`${timeDiff.months} ${getArabicUnitLabel(timeDiff.months, 'month')}`} progress={(timeDiff.days / daysInCurrentMonth) * 100} colorClass="bg-orange-500" />
                            <CounterBar label={`${timeDiff.days} ${getArabicUnitLabel(timeDiff.days, 'day')}`} progress={(timeDiff.hours / 24) * 100} colorClass="bg-lime-500" />
                            <CounterBar label={`${timeDiff.hours} ${getArabicUnitLabel(timeDiff.hours, 'hour')}`} progress={(timeDiff.minutes / 60) * 100} colorClass="bg-blue-500" />
                            <CounterBar label={`${timeDiff.minutes} ${getArabicUnitLabel(timeDiff.minutes, 'minute')}`} progress={(timeDiff.minutes / 60) * 100} colorClass="bg-pink-500" />
                            <CounterBar label={`${timeDiff.seconds} ${getArabicUnitLabel(timeDiff.seconds, 'second')}`} progress={((timeDiff.seconds * 1000 + milliseconds) / 60000) * 100} colorClass="bg-yellow-500" />
                        </div>
                   </div>
                </div>
            </main>
            <NajdaFeature />
            <DesireSolverFeature />
            <FaithDoseFeature />
            <CommitmentDocumentFeature user={user} initialText={currentUserProfile?.commitmentDocument} />
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
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507400492013-162706c8c05e?q=80&w=2070&auto=format&fit=crop')" }}
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
                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
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

            await db.collection('users').doc(user.uid).update({
                displayName: displayName,
                photoURL: photoPreview,
            });
            
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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

// --- Chat Components (continued) ---

// --- Chat Component ---
const MessageActionModal: React.FC<{
    onClose: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onPin?: () => void;
    onCopy: () => void;
    onReply: () => void;
    isPinned: boolean;
    canPin: boolean;
    canEdit: boolean;
    canDelete: boolean;
}> = ({ onClose, onEdit, onDelete, onPin, onCopy, onReply, isPinned, canPin, canEdit, canDelete }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
        <div className="w-full max-w-sm bg-sky-950/90 border border-sky-500/50 rounded-lg p-6 space-y-4 text-white" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-sky-300 text-center">إجراءات الرسالة</h3>
            <div className="flex flex-col gap-4 pt-4">
                 <button onClick={onReply} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-sky-800/50 hover:bg-sky-700/70">
                    <ReplyIcon className="w-6 h-6 text-sky-300"/>
                    <span>رد</span>
                </button>
                <button onClick={onCopy} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-sky-800/50 hover:bg-sky-700/70">
                    <CopyIcon className="w-6 h-6 text-sky-300"/>
                    <span>نسخ النص</span>
                </button>
                {canPin && onPin && (
                    <button onClick={onPin} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-sky-800/50 hover:bg-sky-700/70">
                        <PinIcon className="w-6 h-6 text-teal-300"/>
                        <span>{isPinned ? 'إلغاء تثبيت الرسالة' : 'تثبيت الرسالة'}</span>
                    </button>
                )}
                {canEdit && onEdit && (
                    <button onClick={onEdit} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-sky-800/50 hover:bg-sky-700/70">
                        <PencilIcon className="w-6 h-6 text-yellow-300"/>
                        <span>تعديل</span>
                    </button>
                )}
                {canDelete && onDelete && (
                    <button onClick={onDelete} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-red-800/50 hover:bg-red-700/70">
                        <TrashIcon className="w-6 h-6 text-red-400"/>
                        <span className="text-red-400">حذف</span>
                    </button>
                )}
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
    isCurrentUserAdmin: boolean;
    isCurrentUserDeveloper: boolean;
    currentUserUid: string;
    onToggleAdmin: () => void;
    onToggleMute: () => void;
    onToggleBan: () => void;
    isBanned: boolean;
}> = ({ userProfile, onClose, onStartPrivateChat, onBlockUser, onUnblockUser, isBlocked, isCurrentUserAdmin, isCurrentUserDeveloper, currentUserUid, onToggleAdmin, onToggleMute, onToggleBan, isBanned }) => {
    const canTakeAdminAction = isCurrentUserAdmin && userProfile.uid !== currentUserUid && !DEVELOPER_UIDS.includes(userProfile.uid);
    return (
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
                 {canTakeAdminAction && (
                    <>
                        <div className="border-t border-sky-600/50 my-2"></div>
                        <h4 className="text-center text-sky-400 text-sm">إجراءات المشرف</h4>
                        {isCurrentUserDeveloper && (
                            <button onClick={onToggleAdmin} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-sky-800/50 hover:bg-sky-700/70">
                                <ShieldExclamationIcon className="w-6 h-6 text-yellow-300"/>
                                <span>{userProfile.isAdmin ? 'تخفيض من الإشراف' : 'ترقية لمشرف'}</span>
                            </button>
                        )}
                        <button onClick={onToggleMute} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-sky-800/50 hover:bg-sky-700/70">
                           {userProfile.isMuted ? <UserPlusIcon className="w-6 h-6 text-green-400"/> : <SpeakerXMarkIcon className="w-6 h-6 text-orange-400"/> }
                           <span>{userProfile.isMuted ? 'إلغاء الكتم' : 'كتم المستخدم'}</span>
                        </button>
                        <button onClick={onToggleBan} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-red-800/50 hover:bg-red-700/70">
                            {isBanned ? <UserPlusIcon className="w-6 h-6 text-green-400"/> : <UserMinusIcon className="w-6 h-6 text-red-400"/> }
                            <span className={isBanned ? 'text-green-400' : 'text-red-400'}>{isBanned ? 'إعادة المستخدم' : 'طرد المستخدم'}</span>
                        </button>
                    </>
                 )}
            </div>
        </div>
    </div>
)};

const DeleteMessageConfirmationModal: React.FC<{ onConfirm: () => void; onClose: () => void; }> = ({ onConfirm, onClose }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
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
                         <div className="relative flex-shrink-0">
                            <img
                                src={convo.photoURL || `https://ui-avatars.com/api/?name=${convo.displayName || ' '}&background=0284c7&color=fff&size=128`}
                                alt={convo.displayName}
                                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                            />
                            {convo.hasUnread && <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-sky-950/90"></span>}
                         </div>
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

const EMOJI_REACTIONS = ['❤️', '👍', '😪', '😞', '😧', '💯'];

const ChatModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    user: firebase.User;
    currentUserProfile: UserProfile | null;
    blockedUsers: string[];
    onStartPrivateChat: (user: UserProfile) => void;
    onBlockUser: (user: UserProfile) => void;
    onUnblockUser: (uid: string) => void;
    hasUnreadPrivateMessages: boolean;
    handleToggleAdminRole: (user: UserProfile) => void;
    handleToggleMute: (user: UserProfile) => void;
    handleToggleBan: (uid: string) => void;
    handlePinMessage: (message: Message) => void;
    handleDeleteMessage: (id: string) => void;
    showAlert: (message: string, type?: 'error' | 'success') => void;
    isDeveloper: boolean;
}> = ({ isOpen, onClose, user, currentUserProfile, blockedUsers, onStartPrivateChat, onBlockUser, onUnblockUser, hasUnreadPrivateMessages, handleToggleAdminRole, handleToggleMute, handleToggleBan, handlePinMessage, handleDeleteMessage, showAlert, isDeveloper }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [editText, setEditText] = useState('');
    const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
    const [messageForAction, setMessageForAction] = useState<Message | null>(null);
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    
    const [reactingToMessageId, setReactingToMessageId] = useState<string | null>(null);
    const reactionMenuRef = useRef<HTMLDivElement>(null);
    
    const [userForAction, setUserForAction] = useState<UserProfile | null>(null);
    const [activeTab, setActiveTab] = useState<'public' | 'private'>('public');

    const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
    const [pinnedMessage, setPinnedMessage] = useState<PinnedMessage | null>(null);
    const [bannedUids, setBannedUids] = useState<string[]>([]);

    const isCurrentUserAdmin = currentUserProfile?.isAdmin || DEVELOPER_UIDS.includes(user.uid);

    useEffect(() => {
        if (!isOpen) {
            setActiveTab('public');
            return;
        }

        const unsubscribeMessages = db.collection('messages').orderBy('timestamp', 'asc').limit(100)
            .onSnapshot(snapshot => {
                const fetchedMessages = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Message));
                setMessages(fetchedMessages);
            }, err => console.error("Error fetching messages: ", err));
            
        const unsubscribeMeta = db.collection('app_config').doc('public_chat_meta')
            .onSnapshot(doc => {
                setPinnedMessage(doc.data()?.pinnedMessage || null);
                setBannedUids(doc.data()?.bannedUids || []);
            }, err => console.error("Error fetching chat meta:", err));

        const handleClickOutside = (event: MouseEvent) => {
            if (reactionMenuRef.current && !reactionMenuRef.current.contains(event.target as Node)) {
                setReactingToMessageId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
             unsubscribeMessages();
             unsubscribeMeta();
             document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);
    
    useEffect(() => {
        const uidsInMessages = [...new Set(messages.map(m => m.uid))];
        const uidsToFetch = uidsInMessages.filter(uid => !userProfiles[uid]);
        if (uidsToFetch.length > 0) {
            // Firestore 'in' query is limited to 30 items
            const fetchChunks = [];
            for (let i = 0; i < uidsToFetch.length; i += 30) {
                fetchChunks.push(uidsToFetch.slice(i, i + 30));
            }

            Promise.all(fetchChunks.map(chunk => 
                db.collection('users').where(firebase.firestore.FieldPath.documentId(), 'in', chunk).get()
            )).then(snapshots => {
                const profiles: Record<string, UserProfile> = {};
                snapshots.forEach(snapshot => {
                    snapshot.forEach(doc => {
                        profiles[doc.id] = { uid: doc.id, ...doc.data() } as UserProfile;
                    });
                });
                setUserProfiles(prev => ({ ...prev, ...profiles }));
            }).catch(err => console.error("Error fetching user profiles:", err));
        }
    }, [messages]);

    useEffect(() => {
        if (editingMessage) return; // Don't scroll when editing
        const container = messagesContainerRef.current;
        if (container) {
            const isNearBottom = container.scrollHeight - container.clientHeight - container.scrollTop < 200;
            if (isNearBottom) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [messages, editingMessage]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        if (currentUserProfile?.isMuted) {
            showAlert('أنت مكتوم حاليًا، لا يمكنك إرسال الرسائل.');
            return;
        }

        if (bannedUids.includes(user.uid)) {
            showAlert('أنت مطرود ولا يمكنك إرسال رسائل.');
            return;
        }

        const { uid, displayName, photoURL } = user;
        setLoading(true);

        const messageData: any = {
            text: newMessage,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            uid,
            displayName,
            photoURL
        };

        if (replyTo) {
            messageData.replyTo = {
                id: replyTo.id,
                text: replyTo.text,
                displayName: replyTo.displayName,
            };
        }

        try {
            await db.collection('messages').add(messageData);
            setNewMessage('');
            setReplyTo(null);
        } catch (error) {
            console.error("Error sending message:", error);
        } finally {
            setLoading(false);
        }
    };
    
    const handleReaction = async (messageId: string, emoji: string) => {
        const messageRef = db.collection('messages').doc(messageId);
        const currentUserUid = user.uid;
        const message = messages.find(m => m.id === messageId);
        if (!message) return;

        const uidsForEmoji = message.reactions?.[emoji] || [];
        const hasReacted = uidsForEmoji.includes(currentUserUid);

        try {
            if (hasReacted) {
                if (uidsForEmoji.length === 1) {
                    await messageRef.update({ [`reactions.${emoji}`]: firebase.firestore.FieldValue.delete() });
                } else {
                    await messageRef.update({ [`reactions.${emoji}`]: firebase.firestore.FieldValue.arrayRemove(currentUserUid) });
                }
            } else {
                await messageRef.update({ [`reactions.${emoji}`]: firebase.firestore.FieldValue.arrayUnion(currentUserUid) });
            }
        } catch (error) {
            console.error("Reaction update failed: ", error);
        } finally {
            setReactingToMessageId(null);
        }
    };

    const handleEdit = (msg: Message) => {
        setMessageForAction(null);
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
        } catch(e) { console.error("Error saving edit:", e); } 
        finally { setLoading(false); }
    };

    const handleCancelEdit = () => {
        setEditingMessage(null);
        setEditText('');
    };

    const confirmDelete = async () => {
        if (!messageToDelete) return;
        handleDeleteMessage(messageToDelete.id);
        setMessageToDelete(null);
    };
    
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setMessageForAction(null);
    };
    
    const handlePin = (message: Message) => {
        handlePinMessage(message);
        setMessageForAction(null);
    };

    const handleReply = (message: Message) => {
        setReplyTo(message);
        setMessageForAction(null);
    };

    const wrappedOnToggleAdmin = async () => {
        if (!userForAction) return;
        const targetUser = { ...userForAction };
        setUserForAction(null);
        try {
            await handleToggleAdminRole(targetUser);
            const userDoc = await db.collection('users').doc(targetUser.uid).get();
            if (userDoc.exists) {
                const updatedProfile = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
                setUserProfiles(prev => ({ ...prev, [targetUser.uid]: updatedProfile }));
            }
        } catch (error) { console.error("Error toggling admin role:", error); }
    };

    const wrappedOnToggleMute = async () => {
        if (!userForAction) return;
        const targetUser = { ...userForAction };
        setUserForAction(null);
        try {
            await handleToggleMute(targetUser);
            const userDoc = await db.collection('users').doc(targetUser.uid).get();
            if (userDoc.exists) {
                const updatedProfile = { uid: userDoc.id, ...userDoc.data() } as UserProfile;
                setUserProfiles(prev => ({ ...prev, [targetUser.uid]: updatedProfile }));
            }
        } catch (error) { console.error("Error toggling mute status:", error); }
    };

    const wrappedOnToggleBan = () => {
        if (!userForAction) return;
        handleToggleBan(userForAction.uid);
        setUserForAction(null);
    };

    if (!isOpen) return null;
    
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
                            className={`w-1/2 py-2 rounded-md text-sm font-semibold transition-colors relative ${activeTab === 'private' ? 'bg-sky-600 text-white' : 'text-sky-300 hover:bg-sky-700/50'}`}
                        >
                            المحادثات الخاصة
                             {hasUnreadPrivateMessages && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-sky-950/90"></span>}
                        </button>
                    </div>
                </header>
                
                {activeTab === 'public' && pinnedMessage && (
                    <div 
                        className="sticky top-0 bg-sky-800/80 backdrop-blur-sm p-2 text-sm text-sky-200 border-b border-sky-400/30 cursor-pointer hover:bg-sky-700/80 transition-colors z-10"
                        onClick={() => {
                            document.getElementById(`message-${pinnedMessage.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                    >
                        <div className="flex items-center gap-2 max-w-full overflow-hidden">
                            <PinIcon className="w-4 h-4 text-teal-300 flex-shrink-0" />
                            <p className="truncate">
                                <span className="font-bold">{pinnedMessage.displayName}:</span> {pinnedMessage.text}
                            </p>
                        </div>
                    </div>
                )}

                <main ref={messagesContainerRef} className="flex-grow overflow-y-auto">
                   {activeTab === 'public' ? (
                     <div className="p-4 space-y-4">
                        {messages.map(msg => {
                            const profile = userProfiles[msg.uid];
                            if (bannedUids.includes(msg.uid) && !isCurrentUserAdmin) return null;
                            if (!profile && !msg.displayName) return null;

                            const isMyMessage = msg.uid === user.uid;
                            const isBlockedByMe = blockedUsers.includes(msg.uid);
                            const isSenderAdmin = profile?.isAdmin || DEVELOPER_UIDS.includes(msg.uid);
                            
                            return (
                                <div key={msg.id} id={`message-${msg.id}`} className={`flex items-start gap-3 group ${isMyMessage ? 'flex-row-reverse' : ''} ${isBlockedByMe || bannedUids.includes(msg.uid) ? 'opacity-50' : ''}`}>
                                     <div className="relative flex-shrink-0">
                                        <button
                                            onClick={() => !isMyMessage && setUserForAction(profile)}
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
                                            <div
                                                onContextMenu={(e) => { e.preventDefault(); setReactingToMessageId(msg.id); }}
                                                className={`relative p-3 pb-8 rounded-2xl max-w-xs md:max-w-md ${isMyMessage ? 'bg-sky-600 rounded-br-none' : 'bg-slate-700 rounded-bl-none'}`}
                                            >
                                                {reactingToMessageId === msg.id && (
                                                    <div ref={reactionMenuRef} className={`absolute top-[-40px] bg-slate-800 border border-slate-600 rounded-full shadow-lg z-10 p-1 flex gap-1 ${isMyMessage ? 'left-0' : 'right-0'}`}>
                                                        {EMOJI_REACTIONS.map(emoji => (
                                                            <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }} className="p-1 rounded-full hover:bg-slate-700 transition-colors text-xl">
                                                                {emoji}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                <p className="text-sm font-bold text-sky-200 mb-1">{isSenderAdmin && '⭐ '}{msg.displayName}</p>
                                                {msg.replyTo && (
                                                    <div className="mb-2 p-2 border-r-2 border-sky-400 bg-black/20 rounded-md">
                                                        <p className="text-xs font-bold text-sky-300">{msg.replyTo.displayName}</p>
                                                        <p className="text-sm text-sky-300/80 truncate">{msg.replyTo.text}</p>
                                                    </div>
                                                )}
                                                <p className="text-white whitespace-pre-wrap break-all">{msg.text}</p>
                                                
                                                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                                    <div className={`absolute bottom-1 flex flex-row flex-wrap gap-1 px-2 z-10 ${isMyMessage ? 'left-1' : 'right-1'}`}>
                                                        {Object.entries(msg.reactions).map(([emoji, uids]) => Array.isArray(uids) && uids.length > 0 && (
                                                            <button 
                                                                key={emoji}
                                                                onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                                                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors shadow-md ${
                                                                    uids.includes(user.uid) 
                                                                    ? 'bg-sky-500 border border-sky-300 text-white' 
                                                                    : 'bg-slate-800 border border-slate-600 hover:bg-slate-700 text-sky-200'
                                                                }`}
                                                            >
                                                                <span>{emoji}</span>
                                                                <span className="font-semibold">{uids.length}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <p className="text-xs text-sky-500 mt-1 px-1">
                                            {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit'}) : '...'}
                                        </p>
                                    </div>
                                    <div className="flex-shrink-0 self-center transition-opacity opacity-0 group-hover:opacity-100 flex items-center">
                                        <button onClick={() => setReactingToMessageId(msg.id)} className="p-2 rounded-full text-sky-300 hover:bg-sky-800/50" aria-label="Add reaction">
                                            <FaceSmileIcon className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => setMessageForAction(msg)} className="p-2 rounded-full text-sky-300 hover:bg-sky-800/50" aria-label="Message options">
                                            <DotsVerticalIcon className="w-5 h-5" />
                                        </button>
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
                        {replyTo && (
                            <div className="relative p-2 mb-2 bg-sky-800/50 rounded-lg text-sm">
                                <p className="text-sky-300">رد على <span className="font-bold">{replyTo.displayName}</span></p>
                                <p className="text-white/70 truncate">{replyTo.text}</p>
                                <button onClick={() => setReplyTo(null)} className="absolute top-1 left-1 p-1 rounded-full hover:bg-white/10">
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </div>
                        )}
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
                    onCopy={() => handleCopy(messageForAction.text)}
                    onReply={() => handleReply(messageForAction)}
                    canEdit={messageForAction.uid === user.uid}
                    onEdit={() => handleEdit(messageForAction)}
                    canDelete={messageForAction.uid === user.uid || isCurrentUserAdmin}
                    onDelete={() => {
                        setMessageToDelete(messageForAction);
                        setMessageForAction(null);
                    }}
                    canPin={isCurrentUserAdmin}
                    isPinned={pinnedMessage?.id === messageForAction.id}
                    onPin={() => handlePin(messageForAction)}
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
                    isCurrentUserAdmin={isCurrentUserAdmin}
                    isCurrentUserDeveloper={isDeveloper}
                    currentUserUid={user.uid}
                    onToggleAdmin={wrappedOnToggleAdmin}
                    onToggleMute={wrappedOnToggleMute}
                    onToggleBan={wrappedOnToggleBan}
                    isBanned={bannedUids.includes(userForAction.uid)}
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
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const chatId = [user.uid, otherUser.uid].sort().join('_');
    const messagesCollection = db.collection('private_chats').doc(chatId).collection('messages');
    const [amIBlocked, setAmIBlocked] = useState(false);

    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [editText, setEditText] = useState('');
    const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
    const [messageForAction, setMessageForAction] = useState<Message | null>(null);
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    
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
            }, err => console.error("Error fetching private messages: ", err));
            
        const otherUserRef = db.collection('users').doc(otherUser.uid);
        const unsubscribeAmIBlocked = otherUserRef.onSnapshot(doc => {
            const data = doc.data();
            const theirBlockedList = data?.blockedUsers || [];
            setAmIBlocked(theirBlockedList.includes(user.uid));
        }, err => {
            console.error("Error checking if blocked:", err);
            setAmIBlocked(false);
        });

        db.collection('users').doc(user.uid).collection('conversations').doc(otherUser.uid)
            .set({ hasUnread: false }, { merge: true })
            .catch(err => console.log("Failed to mark convo as read:", err.message));
            
        const handleClickOutside = (event: MouseEvent) => {
            if (reactionMenuRef.current && !reactionMenuRef.current.contains(event.target as Node)) {
                setReactingToMessageId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
             unsubscribe();
             unsubscribeAmIBlocked();
             document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, chatId, user.uid, otherUser.uid]);

    useEffect(() => {
        if (editingMessage) return;
        const container = messagesContainerRef.current;
        if (container) {
            const isNearBottom = container.scrollHeight - container.clientHeight - container.scrollTop < 200;
            if (isNearBottom) {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [messages, editingMessage]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || isBlocked || amIBlocked) return;

        const { uid, displayName, photoURL, email } = user;
        setLoading(true);

        const messageData: any = {
            text: newMessage,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            uid,
            displayName,
            photoURL
        };

        if (replyTo) {
            messageData.replyTo = {
                id: replyTo.id,
                text: replyTo.text,
                displayName: replyTo.displayName,
            };
        }

        try {
            await messagesCollection.add(messageData);
             setNewMessage('');
             setReplyTo(null);

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
            await otherUserConversationsRef.set({ ...myProfileForOther, hasUnread: true }, { merge: true });

        } catch (error) { console.error("Error sending private message:", error); } 
        finally { setLoading(false); }
    };
    
    const handleReaction = async (messageId: string, emoji: string) => {
        const messageRef = messagesCollection.doc(messageId);
        const currentUserUid = user.uid;
        const message = messages.find(m => m.id === messageId);
        if (!message) return;

        const uidsForEmoji = message.reactions?.[emoji] || [];
        const hasReacted = uidsForEmoji.includes(currentUserUid);

        try {
            if (hasReacted) {
                if (uidsForEmoji.length === 1) {
                    await messageRef.update({ [`reactions.${emoji}`]: firebase.firestore.FieldValue.delete() });
                } else {
                    await messageRef.update({ [`reactions.${emoji}`]: firebase.firestore.FieldValue.arrayRemove(currentUserUid) });
                }
            } else {
                await messageRef.update({ [`reactions.${emoji}`]: firebase.firestore.FieldValue.arrayUnion(currentUserUid) });
            }
        } catch (error) { console.error("Reaction update failed: ", error); } 
        finally { setReactingToMessageId(null); }
    };

    const handleEdit = (msg: Message) => {
        setMessageForAction(null);
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
        } catch(e) { console.error("Error saving edit:", e); } 
        finally { setLoading(false); }
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
        } catch(e) { console.error("Error deleting message:", e); }
    };
    
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        setMessageForAction(null);
    };

    const handleReply = (message: Message) => {
        setReplyTo(message);
        setMessageForAction(null);
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
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
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
                <main ref={messagesContainerRef} className="flex-grow overflow-y-auto p-4 space-y-4">
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
                                        <div
                                            onContextMenu={(e) => { e.preventDefault(); setReactingToMessageId(msg.id); }}
                                            className={`relative p-3 pb-8 rounded-2xl max-w-xs md:max-w-md ${isMyMessage ? 'bg-sky-600 rounded-br-none' : 'bg-slate-700 rounded-bl-none'}`}
                                        >
                                            {reactingToMessageId === msg.id && (
                                                <div ref={reactionMenuRef} className={`absolute top-[-40px] bg-slate-800 border border-slate-600 rounded-full shadow-lg z-10 p-1 flex gap-1 ${isMyMessage ? 'left-0' : 'right-0'}`}>
                                                    {EMOJI_REACTIONS.map(emoji => (
                                                        <button key={emoji} onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }} className="p-1 rounded-full hover:bg-slate-700 transition-colors text-xl">
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {msg.replyTo && (
                                                <div className="mb-2 p-2 border-r-2 border-sky-400 bg-black/20 rounded-md">
                                                    <p className="text-xs font-bold text-sky-300">{msg.replyTo.displayName}</p>
                                                    <p className="text-sm text-sky-300/80 truncate">{msg.replyTo.text}</p>
                                                </div>
                                            )}
                                            <p className="text-white whitespace-pre-wrap break-all">{msg.text}</p>
                                            
                                            {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                                                <div className={`absolute bottom-1 flex flex-row flex-wrap gap-1 px-2 z-10 ${isMyMessage ? 'left-1' : 'right-1'}`}>
                                                    {Object.entries(msg.reactions).map(([emoji, uids]) => Array.isArray(uids) && uids.length > 0 && (
                                                        <button 
                                                            key={emoji}
                                                            onClick={(e) => { e.stopPropagation(); handleReaction(msg.id, emoji); }}
                                                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors shadow-md ${
                                                                uids.includes(user.uid) 
                                                                ? 'bg-sky-500 border border-sky-300 text-white' 
                                                                : 'bg-slate-800 border border-slate-600 hover:bg-slate-700 text-sky-200'
                                                            }`}
                                                        >
                                                            <span>{emoji}</span>
                                                            <span className="font-semibold">{uids.length}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-xs text-sky-500 mt-1 px-1">
                                        {msg.timestamp ? new Date(msg.timestamp.toDate()).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit'}) : '...'}
                                    </p>
                                </div>
                                <div className="flex-shrink-0 self-center transition-opacity opacity-0 group-hover:opacity-100 flex items-center">
                                    <button onClick={() => setReactingToMessageId(msg.id)} className="p-2 rounded-full text-sky-300 hover:bg-sky-800/50" aria-label="Add reaction">
                                        <FaceSmileIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => setMessageForAction(msg)} className="p-2 rounded-full text-sky-300 hover:bg-sky-800/50" aria-label="Message options">
                                        <DotsVerticalIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                    <div ref={messagesEndRef} />
                </main>
                <footer className="p-4 border-t border-sky-400/30 flex-shrink-0">
                    {amIBlocked ? (
                        <div className="text-center text-red-400 bg-red-900/50 p-3 rounded-lg">
                            لقد قام هذا المستخدم بحظرك، لا يمكنك إرسال رسائل.
                        </div>
                    ) : isBlocked ? (
                        <div className="text-center text-red-400 bg-red-900/50 p-3 rounded-lg flex items-center justify-center gap-4">
                            <span>لقد حظرت هذا المستخدم.</span>
                            <button onClick={() => onUnblockUser(otherUser.uid)} className="font-bold text-green-300 hover:underline">إلغاء الحظر</button>
                        </div>
                    ) : (
                        <>
                         {replyTo && (
                            <div className="relative p-2 mb-2 bg-sky-800/50 rounded-lg text-sm">
                                <p className="text-sky-300">رد على <span className="font-bold">{replyTo.displayName}</span></p>
                                <p className="text-white/70 truncate">{replyTo.text}</p>
                                <button onClick={() => setReplyTo(null)} className="absolute top-1 left-1 p-1 rounded-full hover:bg-white/10">
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </div>
                         )}
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
                        </>
                    )}
                </footer>
            </div>
             {messageToDelete && <DeleteMessageConfirmationModal onConfirm={confirmDelete} onClose={() => setMessageToDelete(null)} />}
             {messageForAction && (
                <MessageActionModal
                    onClose={() => setMessageForAction(null)}
                    onCopy={() => handleCopy(messageForAction.text)}
                    onReply={() => handleReply(messageForAction)}
                    canEdit={messageForAction.uid === user.uid}
                    onEdit={() => handleEdit(messageForAction)}
                    canDelete={messageForAction.uid === user.uid}
                    onDelete={() => {
                        setMessageToDelete(messageForAction);
                        setMessageForAction(null);
                    }}
                    canPin={false}
                    isPinned={false}
                />
            )}
        </div>
    );
};

// --- Logged In Layout (Manages state for logged-in users) ---
const LoggedInLayout: React.FC<{ user: firebase.User }> = ({ user }) => {
    const [activeTab, setActiveTab] = useState<LoggedInView>('home');
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [counterImage, setCounterImage] = useState<string | null>(null);
    const [showResetModal, setShowResetModal] = useState(false);
    const [showSetDateModal, setShowSetDateModal] = useState(false);
    const [showDeleteImageModal, setShowDeleteImageModal] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showPrivateChat, setShowPrivateChat] = useState(false);
    const [privateChatUser, setPrivateChatUser] = useState<UserProfile | null>(null);
    
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
    const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
    const [hasUnread, setHasUnread] = useState(false);
    const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const isDeveloper = DEVELOPER_UIDS.includes(user.uid);

    useEffect(() => {
        const userRef = db.collection('users').doc(user.uid);
        const unsubscribeUser = userRef.onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                if (data?.startDate) {
                    setStartDate(data.startDate.toDate());
                } else {
                    setStartDate(null);
                }
                setBlockedUsers(data?.blockedUsers || []);
                setCurrentUserProfile({ uid: user.uid, ...data } as UserProfile);
            }
        });

        const globalSettingsRef = db.collection('app_config').doc('global_settings');
        const unsubscribeGlobalSettings = globalSettingsRef.onSnapshot(doc => {
            if (doc.exists) {
                const data = doc.data();
                setCounterImage(data?.globalCounterImage || null);
            } else {
                setCounterImage(null);
            }
        });

        const unsubscribeNotifications = db.collection('notifications').orderBy('timestamp', 'desc').onSnapshot(snapshot => {
            const fetchedNotifications = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
            setNotifications(fetchedNotifications);
        });
        
        const unsubscribeConversations = db.collection('users').doc(user.uid).collection('conversations')
            .where('hasUnread', '==', true).limit(1).onSnapshot(snapshot => {
                setHasUnread(!snapshot.empty);
        });

        return () => {
            unsubscribeUser();
            unsubscribeGlobalSettings();
            unsubscribeNotifications();
            unsubscribeConversations();
        };
    }, [user.uid]);

    const showAlert = (message: string, type: 'success' | 'error' = 'error') => {
        setAlert({ message, type });
        setTimeout(() => setAlert(null), 4000);
    };

    const handleSignOut = async () => {
        try {
            await auth.signOut();
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };
    
    const handleStartCounter = async () => {
        const newStartDate = new Date();
        try {
            await db.collection('users').doc(user.uid).set({ startDate: newStartDate }, { merge: true });
            setStartDate(newStartDate);
        } catch (error) {
            console.error("Error starting counter:", error);
        }
    };

    const handleResetCounter = async () => {
        const newStartDate = new Date();
        try {
            await db.collection('users').doc(user.uid).update({ startDate: newStartDate });
            setStartDate(newStartDate);
            setShowResetModal(false);
        } catch (error) {
            console.error("Error resetting counter:", error);
        }
    };

    const handleSetStartDate = async (date: string) => {
        const newDate = new Date(date);
        try {
            await db.collection('users').doc(user.uid).update({ startDate: newDate });
            setStartDate(newDate);
            setShowSetDateModal(false);
        } catch (error) { console.error("Error setting start date:", error); }
    };

    const handleSetCounterImage = async (url: string) => {
        try {
            await db.collection('app_config').doc('global_settings').set({ globalCounterImage: url }, { merge: true });
            setCounterImage(url); // Optimistic update
        } catch (error) { console.error("Error setting global image:", error); }
    };

    const handleDeleteCounterImage = async () => {
        try {
            await db.collection('app_config').doc('global_settings').update({
                globalCounterImage: firebase.firestore.FieldValue.delete()
            });
            setCounterImage(null); // Optimistic update
            setShowDeleteImageModal(false);
        } catch (error) { console.error("Error deleting global image:", error); }
    };
    
    const handleBlockUser = async (userToBlock: UserProfile) => {
        if (blockedUsers.includes(userToBlock.uid)) return;
        const newBlocked = [...blockedUsers, userToBlock.uid];
        try {
            await db.collection('users').doc(user.uid).update({
                blockedUsers: newBlocked
            });
            setBlockedUsers(newBlocked);
        } catch (error) {
            console.error("Error blocking user:", error);
        }
    };

    const handleUnblockUser = async (uidToUnblock: string) => {
        if (!blockedUsers.includes(uidToUnblock)) return;
        const newBlocked = blockedUsers.filter(uid => uid !== uidToUnblock);
        try {
            await db.collection('users').doc(user.uid).update({
                blockedUsers: newBlocked
            });
            setBlockedUsers(newBlocked);
        } catch (error) {
            console.error("Error unblocking user:", error);
        }
    };
    
    const handleStartPrivateChat = (otherUser: UserProfile) => {
        setPrivateChatUser(otherUser);
        setShowChat(false);
        setShowPrivateChat(true);
    };
    
    const handleClosePrivateChat = () => {
        setShowPrivateChat(false);
        setPrivateChatUser(null);
        setShowChat(true);
    };
    
     const handleToggleAdminRole = async (targetUser: UserProfile) => {
        if (!isDeveloper) {
            showAlert("You don't have permission for this action.");
            return;
        }
        const newAdminStatus = !targetUser.isAdmin;
        try {
            await db.collection('users').doc(targetUser.uid).update({
                isAdmin: newAdminStatus
            });
            showAlert(`${targetUser.displayName} is ${newAdminStatus ? 'now an admin' : 'no longer an admin'}.`, 'success');
        } catch (error) {
            console.error("Error toggling admin role:", error);
            showAlert("Failed to update admin status.");
        }
    };

    const handleToggleMute = async (targetUser: UserProfile) => {
        if (!currentUserProfile?.isAdmin && !isDeveloper) {
            showAlert("You don't have permission for this action.");
            return;
        }
        const newMuteStatus = !targetUser.isMuted;
        try {
            await db.collection('users').doc(targetUser.uid).update({
                isMuted: newMuteStatus
            });
            showAlert(`${targetUser.displayName} has been ${newMuteStatus ? 'muted' : 'unmuted'}.`, 'success');
        } catch (error) {
            console.error("Error toggling mute status:", error);
            showAlert("Failed to update mute status.");
        }
    };

    const handleToggleBan = async (uidToToggle: string) => {
        if (!currentUserProfile?.isAdmin && !isDeveloper) {
            showAlert("You don't have permission for this action.");
            return;
        }
        const metaRef = db.collection('app_config').doc('public_chat_meta');
        const isCurrentlyBanned = (await metaRef.get()).data()?.bannedUids?.includes(uidToToggle);
        const updateAction = isCurrentlyBanned
            ? firebase.firestore.FieldValue.arrayRemove(uidToToggle)
            : firebase.firestore.FieldValue.arrayUnion(uidToToggle);

        try {
            await metaRef.set({ bannedUids: updateAction }, { merge: true });
            showAlert(`User has been ${isCurrentlyBanned ? 'unbanned' : 'banned'}.`, 'success');
        } catch (error) {
            console.error("Error toggling ban status:", error);
            showAlert("Failed to update ban status.");
        }
    };
    
    const handlePinMessage = async (message: Message) => {
        const metaRef = db.collection('app_config').doc('public_chat_meta');
        const currentPinned = (await metaRef.get()).data()?.pinnedMessage;
        
        try {
            if (currentPinned?.id === message.id) {
                // Unpin
                await metaRef.update({ pinnedMessage: firebase.firestore.FieldValue.delete() });
                 showAlert("Message unpinned.", 'success');
            } else {
                // Pin
                 const newPin: PinnedMessage = {
                    id: message.id,
                    text: message.text,
                    uid: message.uid,
                    displayName: message.displayName,
                };
                await metaRef.update({ pinnedMessage: newPin });
                showAlert("Message pinned.", 'success');
            }
        } catch (error) {
             console.error("Error pinning message:", error);
             showAlert("Failed to update pinned message.");
        }
    };

    const handleDeleteMessage = async (messageId: string) => {
        try {
            await db.collection('messages').doc(messageId).delete();
            showAlert('تم حذف الرسالة.', 'success');
        } catch (e) {
            console.error("Error deleting message:", e);
            showAlert('فشل حذف الرسالة.');
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'settings':
                return <SettingsView 
                    user={user} 
                    handleSignOut={handleSignOut} 
                    blockedUsers={blockedUsers} 
                    handleUnblockUser={handleUnblockUser}
                />;
            case 'counter-settings':
                return <CounterSettingsView 
                    setActiveTab={setActiveTab} 
                    handleResetCounter={() => setShowResetModal(true)}
                    setShowSetDateModal={setShowSetDateModal}
                    handleSetCounterImage={handleSetCounterImage}
                    handleDeleteCounterImage={() => setShowDeleteImageModal(true)}
                    hasCustomImage={!!counterImage}
                    isDeveloper={isDeveloper}
                />;
            case 'home':
            default:
                return <HomeView 
                    user={user} 
                    setActiveTab={setActiveTab} 
                    startDate={startDate} 
                    handleStartCounter={handleStartCounter}
                    counterImage={counterImage}
                    setShowNotifications={setShowNotifications}
                    setShowChat={setShowChat}
                    hasUnreadPrivateMessages={hasUnread}
                    currentUserProfile={currentUserProfile}
                />;
        }
    };

    return (
         <div className="min-h-screen relative pb-16">
            <div className="w-full max-w-md mx-auto p-4">
                {renderContent()}
            </div>
            {alert && (
                <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg text-white text-sm z-[100] transition-transform duration-300 ${alert.type === 'success' ? 'bg-green-600/90' : 'bg-red-600/90'}`}>
                    {alert.message}
                </div>
            )}
            <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} />
            {showResetModal && <ResetConfirmationModal onConfirm={handleResetCounter} onClose={() => setShowResetModal(false)} />}
            {showSetDateModal && <SetStartDateModal onSave={handleSetStartDate} onClose={() => setShowSetDateModal(false)} />}
            {showDeleteImageModal && <DeleteImageConfirmationModal onConfirm={handleDeleteCounterImage} onClose={() => setShowDeleteImageModal(false)} />}
             <NotificationsModal 
                isOpen={showNotifications} 
                onClose={() => setShowNotifications(false)} 
                notifications={notifications} 
                isDeveloper={isDeveloper}
            />
            <ChatModal 
                isOpen={showChat}
                onClose={() => setShowChat(false)}
                user={user}
                currentUserProfile={currentUserProfile}
                blockedUsers={blockedUsers}
                onStartPrivateChat={handleStartPrivateChat}
                onBlockUser={handleBlockUser}
                onUnblockUser={handleUnblockUser}
                hasUnreadPrivateMessages={hasUnread}
                handleToggleAdminRole={handleToggleAdminRole}
                handleToggleMute={handleToggleMute}
                handleToggleBan={handleToggleBan}
                handlePinMessage={handlePinMessage}
                handleDeleteMessage={handleDeleteMessage}
                showAlert={showAlert}
                isDeveloper={isDeveloper}
            />
            {showPrivateChat && privateChatUser && (
                <PrivateChatModal
                    isOpen={showPrivateChat}
                    onClose={handleClosePrivateChat}
                    user={user}
                    otherUser={privateChatUser}
                    isBlocked={blockedUsers.includes(privateChatUser.uid)}
                    onBlockUser={handleBlockUser}
                    onUnblockUser={handleUnblockUser}
                />
            )}
        </div>
    );
};


// --- Main App Component ---
const App: React.FC = () => {
    const [user, setUser] = useState<firebase.User | null>(null);
    const [view, setView] = useState<View>('main');
    const [loading, setLoading] = useState(true);
    const [appLocked, setAppLocked] = useState(!!localStorage.getItem('appLockPin'));

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
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

// FIX: Export the App component to be used in index.tsx
export default App;
