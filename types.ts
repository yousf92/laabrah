// FIX: Import React to use types like React.Dispatch and React.SetStateAction.
import React from 'react';
import firebase from 'firebase/compat/app';

// --- Types and Interfaces ---
export type View = 'main' | 'login' | 'signup' | 'forgot-password';
export type LoggedInView = 'home' | 'settings' | 'counter-settings' | 'journal';

export interface UserProfile {
    uid: string;
    displayName: string;
    photoURL: string | null;
    email?: string;
    isAdmin?: boolean;
    isMuted?: boolean;
    commitmentDocument?: string;
    najdaAdviceIndex?: number;
    desireSolutionsIndex?: number;
    salafStoriesIndex?: number;
}

export interface Conversation extends Omit<UserProfile, 'uid'> {
    uid: string;
    hasUnread?: boolean;
}

export interface Group {
    id: string;
    name: string;
    photoURL: string | null;
    members: string[];
    createdBy: string;
    createdAt: firebase.firestore.Timestamp;
    lastMessage?: string;
    lastMessageTimestamp?: firebase.firestore.Timestamp;
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

export interface JournalEntry {
    id: string;
    text: string;
    mood: string;
    timestamp: firebase.firestore.Timestamp;
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