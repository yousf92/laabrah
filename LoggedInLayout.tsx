import React, { useState, useEffect, useRef } from 'react';
import { db, firebase, auth } from './firebase';
import { UserProfile, LoggedInView, Notification, Message, PinnedMessage } from './types';
import { DEVELOPER_UIDS } from './constants';
import { calculateTimeDifference, getArabicUnitLabel } from './utils';
import { StopwatchIcon, SettingsIcon, HouseIcon, UserIcon, ChatIcon, NotificationIcon, JournalIcon } from './icons';
import { NajdaFeature, DesireSolverFeature, FaithDoseFeature, CommitmentDocumentFeature } from './Features';
import { SettingsView, CounterSettingsView, ResetConfirmationModal, DeleteImageConfirmationModal, SetStartDateModal } from './Settings';
import { NotificationsModal } from './Notifications';
import { ChatModal, PrivateChatModal } from './Chat';
import { JournalView } from './Journal';
import { SetPinModal } from './LockScreen';

const CounterBar = ({ label, progress, colorClass }: { label: string; progress: number; colorClass: string }): React.ReactElement => {
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

const HomeView = ({
    user,
    setActiveTab,
    startDate,
    handleStartCounter,
    counterImage,
    setShowNotifications,
    setShowChat,
    hasUnreadPrivateMessages,
    currentUserProfile,
}: {
    user: firebase.User;
    setActiveTab: (tab: LoggedInView) => void;
    startDate: Date | null;
    handleStartCounter: () => void;
    counterImage: string | null;
    setShowNotifications: (show: boolean) => void;
    setShowChat: (show: boolean) => void;
    hasUnreadPrivateMessages: boolean;
    currentUserProfile: UserProfile | null;
}): React.ReactElement => {
    // FIX: The use of React.FC was causing a type inference issue, leading to a runtime error. Changed to a standard function component definition and reverted to lazy initialization for useState.
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

const BottomNavBar = ({ activeTab, setActiveTab }: { activeTab: LoggedInView; setActiveTab: (tab: LoggedInView) => void; }): React.ReactElement | null => {
    const navItems = [
        { id: 'home', label: 'الرئيسية', icon: HouseIcon },
        { id: 'journal', label: 'اليوميات', icon: JournalIcon },
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

// FIX: Changed component definition to not use React.FC and explicitly type props and return value. This resolves the error where the compiler incorrectly infers a 'void' return type.
export const LoggedInLayout = ({ user }: { user: firebase.User }): React.ReactElement => {
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

    const [appLockEnabled, setAppLockEnabled] = useState(!!localStorage.getItem('appLockPin'));
    const [showSetPinModal, setShowSetPinModal] = useState(false);

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
    }, [user.uid]);
    
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
        <div className="pb-16">
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
                    <JournalView user={user} />
                )}
                {activeTab === 'settings' && (
                    <SettingsView
                        user={user}
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
            {showSetPinModal && <SetPinModal onPinSet={handleSetPin} onClose={() => setShowSetPinModal(false)} />}
            
            {alert && (
                <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-lg text-white shadow-lg ${alert.type === 'success' ? 'bg-green-600/90' : 'bg-red-600/90'}`}>
                    {alert.message}
                </div>
            )}
            
            <BottomNavBar activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
    );
};