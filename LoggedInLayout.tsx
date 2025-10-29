import React, { useState, useEffect } from 'react';
import { db, firebase, auth } from './firebase';
import { UserProfile, LoggedInView, Notification, Message, PinnedMessage, Group, JournalEntry } from './types';
import { DEVELOPER_UIDS } from './constants';
import { SettingsView } from './Settings';
import { CounterSettingsView, ResetConfirmationModal, DeleteImageConfirmationModal, SetStartDateModal } from './CounterSettings';
import { NotificationsModal } from './Notifications';
import { ChatModal } from './Chat';
import { PrivateChatModal } from './PrivateChat';
import { JournalView } from './Journal';
import { SetPinModal } from './LockScreen';
import { GroupChatModal } from './GroupChat';
import { HomeView } from './HomeView';
// FIX: Export BottomNavBar to make it available for import in other files, like App.tsx.
export { BottomNavBar } from './BottomNavBar';

export const LoggedInLayout = ({ 
    user, 
    activeTab, 
    setActiveTab,
    setShowAddEditModal,
    setEntryToEdit,
    onChatStateChange
}: { 
    user: firebase.User, 
    activeTab: LoggedInView, 
    setActiveTab: (tab: LoggedInView) => void,
    setShowAddEditModal: (show: boolean) => void,
    setEntryToEdit: (entry: JournalEntry | null) => void,
    onChatStateChange: (isOpen: boolean) => void;
}): React.ReactElement => {
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [counterImage, setCounterImage] = useState<string | null>(null);
    const [showResetModal, setShowResetModal] = useState(false);
    const [showSetDateModal, setShowSetDateModal] = useState(false);
    const [showDeleteImageModal, setShowDeleteImageModal] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [showPrivateChat, setShowPrivateChat] = useState(false);
    const [privateChatUser, setPrivateChatUser] = useState<UserProfile | null>(null);
    const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
    const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
    const [hasUnread, setHasUnread] = useState(false);
    const [alert, setAlert] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [appLockEnabled, setAppLockEnabled] = useState(!!localStorage.getItem('appLockPin'));
    const [showSetPinModal, setShowSetPinModal] = useState(false);

    const isDeveloper = DEVELOPER_UIDS.includes(user.uid);

    const isChatOpen = showChat || showPrivateChat || !!selectedGroup;

    useEffect(() => {
        onChatStateChange(isChatOpen);
    }, [isChatOpen, onChatStateChange]);

    useEffect(() => {
        const userRef = db.collection('users').doc(user.uid);

        // This function ensures a user document exists in Firestore.
        // It's crucial for users created via Auth but missing a Firestore doc
        // (e.g., old users, anonymous users, or signup failures).
        const ensureUserDocument = async () => {
            const docSnapshot = await userRef.get();
            if (!docSnapshot.exists) {
                try {
                    const guestName = `زائر #${user.uid.slice(-4).toUpperCase()}`;
                    const userData = {
                        displayName: user.displayName || (user.isAnonymous ? guestName : 'مستخدم جديد'),
                        email: user.email || '',
                        photoURL: user.photoURL || null,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        isAdmin: false,
                        isMuted: false,
                        commitmentDocument: '',
                    };
                    await userRef.set(userData);
                } catch (error) {
                    console.error("Error creating user document on-the-fly:", error);
                }
            }
        };

        if (user.uid) {
            ensureUserDocument();
        }

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
            } else {
                // If doc doesn't exist after our check, it might be a race condition
                // or a very new user. We'll set a default profile to avoid crashes.
                setCurrentUserProfile({
                    uid: user.uid,
                    displayName: user.displayName || (user.isAnonymous ? `زائر #${user.uid.slice(-4).toUpperCase()}` : 'مستخدم جديد'),
                    photoURL: user.photoURL,
                } as UserProfile);
            }
        });

        const globalSettingsRef = db.collection('app_config').doc('global_settings');
        const unsubscribeGlobal = globalSettingsRef.onSnapshot(doc => {
            if (doc.exists) {
                setCounterImage(doc.data()?.counterImage || null);
            }
        });

        const notificationsRef = db.collection('notifications').orderBy('timestamp', 'desc');
        const unsubscribeNotifications = notificationsRef.onSnapshot(snapshot => {
            const fetchedNotifications = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Notification));
            setNotifications(fetchedNotifications);
        });
        
        const conversationsRef = db.collection('users').doc(user.uid).collection('conversations');
        const unsubscribeConversations = conversationsRef.where('hasUnread', '==', true).onSnapshot(snapshot => {
            setHasUnread(!snapshot.empty);
        });

        return () => {
            unsubscribeUser();
            unsubscribeGlobal();
            unsubscribeNotifications();
            unsubscribeConversations();
        };
    }, [user.uid, user.displayName, user.email, user.photoURL, user.isAnonymous]);
    
    const handleStartCounter = () => {
        const now = firebase.firestore.Timestamp.now();
        db.collection('users').doc(user.uid).set({ startDate: now }, { merge: true });
    };

    const handleResetCounter = () => {
        setShowResetModal(false);
        handleStartCounter();
    };

    const handleSetStartDate = (date: string) => {
        const selectedDate = new Date(date);
        const timestamp = firebase.firestore.Timestamp.fromDate(selectedDate);
        db.collection('users').doc(user.uid).set({ startDate: timestamp }, { merge: true });
        setShowSetDateModal(false);
    };

    const handleSetCounterImage = (url: string) => {
        if (isDeveloper) {
            db.collection('app_config').doc('global_settings').set({ counterImage: url }, { merge: true });
        }
    };
    
    const handleDeleteCounterImage = () => {
        setShowDeleteImageModal(false);
        if (isDeveloper) {
            db.collection('app_config').doc('global_settings').set({ 
                counterImage: firebase.firestore.FieldValue.delete() 
            }, { merge: true });
        }
    };
    
    const handleSignOut = () => {
        auth.signOut();
    };
    
    const handleAppLockToggle = () => {
        if (appLockEnabled) {
            // Disable lock
            localStorage.removeItem('appLockPin');
            setAppLockEnabled(false);
        } else {
            // Enable lock - show modal to set PIN
            setShowSetPinModal(true);
        }
    };

    const handleSetPin = (pin: string) => {
        localStorage.setItem('appLockPin', pin);
        setAppLockEnabled(true);
        setShowSetPinModal(false);
    };
    
    const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
        setAlert({ message, type });
        setTimeout(() => setAlert(null), 3000);
    };

    const handleBlockUser = async (userToBlock: UserProfile) => {
        if (blockedUsers.includes(userToBlock.uid)) return;
        const userRef = db.collection('users').doc(user.uid);
        await userRef.update({
            blockedUsers: firebase.firestore.FieldValue.arrayUnion(userToBlock.uid)
        });
        showAlert(`تم حظر ${userToBlock.displayName} بنجاح.`, 'success');
    };

    const handleUnblockUser = async (uidToUnblock: string) => {
        if (!blockedUsers.includes(uidToUnblock)) return;
        const userRef = db.collection('users').doc(user.uid);
        await userRef.update({
            blockedUsers: firebase.firestore.FieldValue.arrayRemove(uidToUnblock)
        });
    };

    const handleStartPrivateChat = (otherUser: UserProfile) => {
        if (otherUser.uid === user.uid) return;
        setPrivateChatUser(otherUser);
        setShowPrivateChat(true);
        setShowChat(false);
    };

    const handleStartGroupChat = (group: Group) => {
        setSelectedGroup(group);
        setShowChat(false); // Close the main chat modal
    };

    const handleToggleAdminRole = async (targetUser: UserProfile) => {
        if (!isDeveloper) return;
        const targetUserRef = db.collection('users').doc(targetUser.uid);
        await targetUserRef.update({ isAdmin: !targetUser.isAdmin });
        showAlert(`تم ${!targetUser.isAdmin ? 'ترقية' : 'تخفيض'} ${targetUser.displayName}.`, 'success');
    };

    const handleToggleMute = async (targetUser: UserProfile) => {
        const isCurrentlyAdmin = currentUserProfile?.isAdmin || isDeveloper;
        if (!isCurrentlyAdmin) return;
        const targetUserRef = db.collection('users').doc(targetUser.uid);
        await targetUserRef.update({ isMuted: !targetUser.isMuted });
        showAlert(`تم ${!targetUser.isMuted ? 'كتم' : 'إلغاء كتم'} ${targetUser.displayName}.`, 'success');
    };
    
    const handleToggleBan = async (uidToToggle: string) => {
        const isCurrentlyAdmin = currentUserProfile?.isAdmin || isDeveloper;
        if (!isCurrentlyAdmin) return;
        const metaRef = db.collection('app_config').doc('public_chat_meta');
        
        const doc = await metaRef.get();
        const bannedUids = doc.data()?.bannedUids || [];
        const isBanned = bannedUids.includes(uidToToggle);
        
        if (isBanned) {
            await metaRef.update({ bannedUids: firebase.firestore.FieldValue.arrayRemove(uidToToggle) });
             showAlert(`تمت إعادة المستخدم.`, 'success');
        } else {
            await metaRef.update({ bannedUids: firebase.firestore.FieldValue.arrayUnion(uidToToggle) });
            showAlert(`تم طرد المستخدم.`, 'success');
        }
    };
    
    const handlePinMessage = async (message: Message) => {
         const isCurrentlyAdmin = currentUserProfile?.isAdmin || isDeveloper;
         if (!isCurrentlyAdmin) return;
         
         const metaRef = db.collection('app_config').doc('public_chat_meta');
         const doc = await metaRef.get();
         const currentPinnedId = doc.data()?.pinnedMessage?.id;
         
         if (currentPinnedId === message.id) {
             // Unpin
             await metaRef.update({ pinnedMessage: firebase.firestore.FieldValue.delete() });
             showAlert('تم إلغاء تثبيت الرسالة.', 'success');
         } else {
             // Pin
              const pinnedMessage: PinnedMessage = {
                 id: message.id,
                 text: message.text,
                 uid: message.uid,
                 displayName: message.displayName,
             };
             await metaRef.update({ pinnedMessage });
             showAlert('تم تثبيت الرسالة بنجاح.', 'success');
         }
    };
    
    const handleDeleteMessage = async (messageId: string) => {
        await db.collection('messages').doc(messageId).delete();
        showAlert('تم حذف الرسالة.', 'success');
    };

    return (
        <>
            <div>
                <div className="p-4">
                    {activeTab === 'home' && (
                        <HomeView
                            user={user}
                            setActiveTab={setActiveTab}
                            startDate={startDate}
                            handleStartCounter={handleStartCounter}
                            counterImage={counterImage}
                            setShowNotifications={setShowNotifications}
                            setShowChat={setShowChat}
                            hasUnreadPrivateMessages={hasUnread}
                            currentUserProfile={currentUserProfile}
                        />
                    )}
                    {activeTab === 'journal' && (
                        <JournalView 
                            user={user}
                            setShowAddEditModal={setShowAddEditModal}
                            setEntryToEdit={setEntryToEdit}
                        />
                    )}
                    {activeTab === 'settings' && (
                        <SettingsView
                            user={user}
                            currentUserProfile={currentUserProfile}
                            handleSignOut={handleSignOut}
                            blockedUsers={blockedUsers}
                            handleUnblockUser={handleUnblockUser}
                            handleAppLockToggle={handleAppLockToggle}
                            appLockEnabled={appLockEnabled}
                            setShowSetPinModal={setShowSetPinModal}
                        />
                    )}
                    {activeTab === 'counter-settings' && (
                        <CounterSettingsView
                            setActiveTab={setActiveTab}
                            handleResetCounter={() => setShowResetModal(true)}
                            setShowSetDateModal={setShowSetDateModal}
                            handleSetCounterImage={handleSetCounterImage}
                            handleDeleteCounterImage={() => setShowDeleteImageModal(true)}
                            hasCustomImage={!!counterImage}
                            isDeveloper={isDeveloper}
                        />
                    )}
                </div>

                {/* Modals & Global components */}
                {showResetModal && <ResetConfirmationModal onConfirm={handleResetCounter} onClose={() => setShowResetModal(false)} />}
                {showDeleteImageModal && <DeleteImageConfirmationModal onConfirm={handleDeleteCounterImage} onClose={() => setShowDeleteImageModal(false)} />}
                {showSetDateModal && <SetStartDateModal onSave={handleSetStartDate} onClose={() => setShowSetDateModal(false)} />}
                <NotificationsModal isOpen={showNotifications} onClose={() => setShowNotifications(false)} notifications={notifications} isDeveloper={isDeveloper} />
                <ChatModal 
                    isOpen={showChat} 
                    onClose={() => setShowChat(false)} 
                    user={user}
                    currentUserProfile={currentUserProfile}
                    blockedUsers={blockedUsers}
                    onStartPrivateChat={handleStartPrivateChat}
                    onStartGroupChat={handleStartGroupChat}
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
                {privateChatUser && (
                    <PrivateChatModal
                        isOpen={showPrivateChat}
                        onClose={() => setShowPrivateChat(false)}
                        user={user}
                        otherUser={privateChatUser}
                        isBlocked={blockedUsers.includes(privateChatUser.uid)}
                        onBlockUser={handleBlockUser}
                        onUnblockUser={handleUnblockUser}
                    />
                )}
                {selectedGroup && (
                    <GroupChatModal 
                        isOpen={!!selectedGroup}
                        onClose={() => setSelectedGroup(null)}
                        user={user}
                        group={selectedGroup}
                    />
                )}
                {showSetPinModal && <SetPinModal onPinSet={handleSetPin} onClose={() => setShowSetPinModal(false)} />}
                
                {alert && (
                    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-lg text-white shadow-lg ${alert.type === 'success' ? 'bg-green-600/90' : 'bg-red-600/90'}`}>
                        {alert.message}
                    </div>
                )}
            </div>
        </>
    );
};