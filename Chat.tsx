import React, { useState, useEffect, useRef } from 'react';
import { db, firebase } from './firebase';
import { Message, UserProfile, Conversation, Group } from './types';
// FIX: Imported EMOJI_REACTIONS to be used for message reactions.
import { DEVELOPER_UIDS, EMOJI_REACTIONS } from './constants';
// FIX: Imported DotsVerticalIcon and FaceSmileIcon to be used in the message component.
import { XMarkIcon, SendIcon, PinIcon, ChatIcon, UsersIcon, PlusIcon, FaceSmileIcon, DotsVerticalIcon } from './icons';
import { MessageActionModal, UserActionModal, DeleteMessageConfirmationModal } from './ChatComponents';
import { PrivateConversationsList, GroupsList } from './ChatLists';

export const ChatModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    user: firebase.User;
    currentUserProfile: UserProfile | null;
    blockedUsers: string[];
    onStartPrivateChat: (user: UserProfile) => void;
    onStartGroupChat: (group: Group) => void;
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
}> = ({ isOpen, onClose, user, currentUserProfile, blockedUsers, onStartPrivateChat, onStartGroupChat, onBlockUser, onUnblockUser, hasUnreadPrivateMessages, handleToggleAdminRole, handleToggleMute, handleToggleBan, handlePinMessage, handleDeleteMessage, showAlert, isDeveloper }) => {
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
    const [activeTab, setActiveTab] = useState<'public' | 'groups' | 'private'>('public');

    const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
    const [pinnedMessage, setPinnedMessage] = useState<any>(null);
    const [bannedUids, setBannedUids] = useState<string[]>([]);

    const isCurrentUserAdmin = currentUserProfile?.isAdmin || DEVELOPER_UIDS.includes(user.uid);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

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

        const { uid, photoURL } = user;
        const displayName = user.displayName || currentUserProfile?.displayName || 'زائر';
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
                            className={`w-1/3 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'public' ? 'bg-sky-600 text-white' : 'text-sky-300 hover:bg-sky-700/50'}`}
                        >
                            الدردشة العامة
                        </button>
                        <button 
                            onClick={() => setActiveTab('groups')}
                            className={`w-1/3 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'groups' ? 'bg-sky-600 text-white' : 'text-sky-300 hover:bg-sky-700/50'}`}
                        >
                            المجموعات
                        </button>
                         <button 
                            onClick={() => setActiveTab('private')}
                            className={`w-1/3 py-2 rounded-md text-sm font-semibold transition-colors relative ${activeTab === 'private' ? 'bg-sky-600 text-white' : 'text-sky-300 hover:bg-sky-700/50'}`}
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
                   ) : activeTab === 'groups' ? (
                        <GroupsList user={user} onGroupSelect={onStartGroupChat} />
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