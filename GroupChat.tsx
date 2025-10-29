import React, { useState, useEffect, useRef } from 'react';
import { db, firebase } from './firebase';
import { Message, UserProfile, Group } from './types';
import { DEVELOPER_UIDS, EMOJI_REACTIONS } from './constants';
import { XMarkIcon, SendIcon, DotsVerticalIcon, FaceSmileIcon, ReplyIcon, CopyIcon, PencilIcon, TrashIcon } from './icons';

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

const MessageActionModal: React.FC<{
    onClose: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onCopy: () => void;
    onReply: () => void;
    canEdit: boolean;
    canDelete: boolean;
}> = ({ onClose, onEdit, onDelete, onCopy, onReply, canEdit, canDelete }) => (
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


export const GroupChatModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    user: firebase.User;
    group: Group;
}> = ({ isOpen, onClose, user, group }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const messagesCollection = db.collection('groups').doc(group.id).collection('messages');

    const [editingMessage, setEditingMessage] = useState<Message | null>(null);
    const [editText, setEditText] = useState('');
    const [messageToDelete, setMessageToDelete] = useState<Message | null>(null);
    const [messageForAction, setMessageForAction] = useState<Message | null>(null);
    const [replyTo, setReplyTo] = useState<Message | null>(null);
    
    const [reactingToMessageId, setReactingToMessageId] = useState<string | null>(null);
    const reactionMenuRef = useRef<HTMLDivElement>(null);
    
    const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});

    const isGroupCreator = group.createdBy === user.uid;


    useEffect(() => {
        if (!isOpen) return;

        const unsubscribe = messagesCollection.orderBy('timestamp', 'asc').limit(100)
            .onSnapshot(snapshot => {
                const fetchedMessages = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Message));
                setMessages(fetchedMessages);
            }, err => console.error("Error fetching group messages: ", err));
            
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
    }, [isOpen, group.id]);
    
     useEffect(() => {
        const uidsInMessages = [...new Set(messages.map(m => m.uid))];
        const uidsToFetch = uidsInMessages.filter(uid => !userProfiles[uid]);
        if (uidsToFetch.length > 0) {
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
        if (!newMessage.trim()) return;

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
            await messagesCollection.add(messageData);
            
            // Update group last message
            await db.collection('groups').doc(group.id).update({
                lastMessage: `${displayName}: ${newMessage}`,
                lastMessageTimestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

             setNewMessage('');
             setReplyTo(null);

        } catch (error) { console.error("Error sending group message:", error); } 
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
                            src={group.photoURL || `https://ui-avatars.com/api/?name=${group.name || ' '}&background=0369a1&color=fff&size=128`} 
                            alt={group.name || 'avatar'} 
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                        <h2 className="text-lg font-bold text-sky-200 text-shadow truncate">
                            {group.name}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                            <XMarkIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </header>
                <main ref={messagesContainerRef} className="flex-grow overflow-y-auto p-4 space-y-4">
                    {messages.map(msg => {
                        const isMyMessage = msg.uid === user.uid;
                        const profile = userProfiles[msg.uid];
                        const isSenderAdmin = profile?.isAdmin || DEVELOPER_UIDS.includes(msg.uid);
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
                </main>
                <footer className="p-4 border-t border-sky-400/30 flex-shrink-0">
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
                    canDelete={messageForAction.uid === user.uid || isGroupCreator}
                    onDelete={() => {
                        setMessageToDelete(messageForAction);
                        setMessageForAction(null);
                    }}
                />
            )}
        </div>
    );
};