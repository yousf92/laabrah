import React, { useState, useEffect } from 'react';
import { db, firebase } from './firebase';
import { Conversation, Group, UserProfile } from './types';
import { formatDistanceToNow } from './utils';
import { PlusIcon, UsersIcon, TrashIcon, CameraIcon } from './icons';
import { ErrorMessage } from './common';
import { DeleteConversationConfirmationModal } from './ChatComponents';

declare const uploadcare: any;

const CreateGroupModal: React.FC<{ onClose: () => void; user: firebase.User; }> = ({ onClose, user }) => {
    const [groupName, setGroupName] = useState('');
    const [photoURL, setPhotoURL] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleImageUpload = () => {
        const dialog = uploadcare.openDialog(null, {
            publicKey: 'e5cdcd97e0e41d6aa881',
            imagesOnly: true,
            crop: "1:1",
        });

        dialog.done((file: any) => {
            file.promise().done((fileInfo: any) => {
                setPhotoURL(fileInfo.cdnUrl);
            });
        });
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            setError('الرجاء إدخال اسم للمجموعة.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await db.collection('groups').add({
                name: groupName,
                photoURL: photoURL,
                members: [user.uid],
                createdBy: user.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            });
            onClose();
        } catch (err) {
            console.error("Error creating group:", err);
            setError('حدث خطأ أثناء إنشاء المجموعة.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="w-full max-w-sm bg-sky-950 border border-sky-500/50 rounded-lg p-6 space-y-4 text-white">
                <h3 className="text-xl font-bold text-sky-300 text-center">إنشاء مجموعة جديدة</h3>
                {error && <ErrorMessage message={error} />}
                <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                        <img 
                            src={photoURL || `https://ui-avatars.com/api/?name=${groupName || ' '}&background=0369a1&color=fff&size=128`}
                            alt="صورة المجموعة"
                            className="w-24 h-24 rounded-full object-cover border-4 border-sky-400/50"
                        />
                        <button
                            onClick={handleImageUpload}
                            className="absolute bottom-0 right-0 bg-sky-600 p-2 rounded-full hover:bg-sky-500 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300"
                            aria-label="تغيير الصورة"
                        >
                            <CameraIcon className="w-5 h-5 text-white"/>
                        </button>
                    </div>
                </div>
                <input
                    type="text"
                    placeholder="اسم المجموعة"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg py-2 px-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 font-semibold rounded-md bg-gray-600 hover:bg-gray-500">إلغاء</button>
                    <button onClick={handleCreateGroup} disabled={loading} className="px-4 py-2 font-semibold rounded-md bg-sky-600 hover:bg-sky-500 disabled:opacity-50">
                        {loading ? 'جارِ الإنشاء...' : 'إنشاء'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const GroupsList: React.FC<{ user: firebase.User; onGroupSelect: (group: Group) => void; }> = ({ user, onGroupSelect }) => {
    const [groups, setGroups] = useState<Group[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        const unsubscribe = db.collection('groups').orderBy('lastMessageTimestamp', 'desc')
            .onSnapshot(snapshot => {
                const fetchedGroups = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as Group));
                setGroups(fetchedGroups);
                setLoading(false);
            }, err => {
                console.error("Error fetching groups:", err);
                setLoading(false);
            });
        
        return unsubscribe;
    }, []);

    return (
        <div className="p-4 space-y-4">
            <button onClick={() => setShowCreateModal(true)} className="w-full flex items-center justify-center gap-2 text-white font-bold py-3 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 transition-colors">
                <PlusIcon className="w-6 h-6" />
                <span>إنشاء مجموعة جديدة</span>
            </button>
            {loading ? (
                <p className="text-center text-sky-300">جارِ تحميل المجموعات...</p>
            ) : groups.length > 0 ? (
                groups.map(group => (
                    <div key={group.id} onClick={() => onGroupSelect(group)} className="flex items-center gap-4 p-3 rounded-lg hover:bg-sky-800/50 transition-colors cursor-pointer">
                        <img src={group.photoURL || `https://ui-avatars.com/api/?name=${group.name || ' '}&background=0369a1&color=fff&size=128`} alt={group.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                        <div className="flex-grow overflow-hidden">
                            <div className="flex justify-between items-center">
                                <p className="font-bold truncate">{group.name}</p>
                                {group.lastMessageTimestamp && <p className="text-xs text-sky-400 flex-shrink-0">{formatDistanceToNow(group.lastMessageTimestamp.toDate())}</p>}
                            </div>
                            <p className="text-sm text-sky-300 truncate">{group.lastMessage || 'لا توجد رسائل بعد.'}</p>
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center py-16 px-4">
                    <UsersIcon className="w-24 h-24 mx-auto text-sky-700" />
                    <h3 className="mt-4 text-xl font-semibold text-sky-300">لا توجد مجموعات</h3>
                    <p className="mt-2 text-sky-400">كن أول من ينشئ مجموعة جديدة!</p>
                </div>
            )}
            {showCreateModal && <CreateGroupModal onClose={() => setShowCreateModal(false)} user={user} />}
        </div>
    );
};

export const PrivateConversationsList: React.FC<{ user: firebase.User; onConversationSelect: (user: UserProfile) => void; }> = ({ user, onConversationSelect }) => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [loading, setLoading] = useState(true);
    const [conversationToDelete, setConversationToDelete] = useState<Conversation | null>(null);

    useEffect(() => {
        const unsubscribe = db.collection('users').doc(user.uid).collection('conversations')
            .orderBy('lastMessageTimestamp', 'desc')
            .onSnapshot(snapshot => {
                const fetchedConversations = snapshot.docs.map(doc => ({
                    uid: doc.id,
                    ...doc.data()
                } as Conversation));
                setConversations(fetchedConversations);
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

    return (
        <div className="p-4 space-y-2">
            {loading ? (
                <p className="text-center text-sky-300">جارِ تحميل المحادثات...</p>
            ) : conversations.length > 0 ? (
                conversations.map(convo => (
                    <div key={convo.uid} className="group flex items-center gap-4 p-3 rounded-lg hover:bg-sky-800/50 transition-colors cursor-pointer" onClick={() => onConversationSelect(convo as UserProfile)}>
                        <div className="relative">
                            <img src={convo.photoURL || `https://ui-avatars.com/api/?name=${convo.displayName || ' '}&background=0284c7&color=fff&size=128`} alt={convo.displayName} className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                            {convo.hasUnread && <span className="absolute top-0 right-0 block h-3 w-3 rounded-full bg-red-500 ring-2 ring-sky-900" />}
                        </div>
                        <div className="flex-grow overflow-hidden">
                            <p className={`font-bold truncate ${convo.hasUnread ? 'text-white' : 'text-sky-200'}`}>{convo.displayName}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setConversationToDelete(convo); }} className="p-2 rounded-full text-red-400 hover:bg-red-800/50 opacity-0 group-hover:opacity-100 transition-opacity">
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                ))
            ) : (
                 <div className="text-center py-16 px-4">
                    <UsersIcon className="w-24 h-24 mx-auto text-sky-700" />
                    <h3 className="mt-4 text-xl font-semibold text-sky-300">لا توجد محادثات خاصة</h3>
                    <p className="mt-2 text-sky-400">ابدأ محادثة من خلال الدردشة العامة.</p>
                </div>
            )}
             {conversationToDelete && (
                <DeleteConversationConfirmationModal onConfirm={handleDelete} onClose={() => setConversationToDelete(null)} />
            )}
        </div>
    );
};
