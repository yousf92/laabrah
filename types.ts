
import firebase from 'firebase/compat/app';

// --- Types and Interfaces ---
export type View = 'main' | 'login' | 'signup' | 'forgot-password';
export type LoggedInView = 'home' | 'settings' | 'counter-settings';

export interface UserProfile {
    uid: string;
    displayName: string;
    photoURL: string | null;
    email?: string;
    isAdmin?: boolean;
    isMuted?: boolean;
    commitmentDocument?: string;
}

export interface Conversation extends Omit<UserProfile, 'uid'> {
    uid: string;
    hasUnread?: boolean;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    timestamp: firebase.firestore.Timestamp;
}

export interface Message {
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

export interface PinnedMessage {
    id: string;
    text: string;
    uid: string;
    displayName: string;
}

export interface ViewProps {
    setView: React.Dispatch<React.SetStateAction<View>>;
    handleGuestLogin?: () => Promise<void>;
}

export interface TimeDifference {
    months: number;
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}
