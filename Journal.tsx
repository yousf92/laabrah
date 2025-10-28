import React, { useState, useEffect } from 'react';
import { db, firebase } from './firebase';
import { JournalEntry } from './types';
import { PlusIcon, XMarkIcon, TrashIcon, PencilIcon, JournalIcon } from './icons';
import { ErrorMessage } from './common';
import { formatDistanceToNow } from './utils';

const MOOD_EMOJIS = ['😊', '😢', '😠', '😌', '🤔', '🥳', '😪'];

// --- Modal to Add/Edit a Journal Entry ---
const AddJournalEntryModal: React.FC<{
    onClose: () => void;
    user: firebase.User;
    entryToEdit?: JournalEntry | null;
}> = ({ onClose, user, entryToEdit }) => {
    const [text, setText] = useState(entryToEdit?.text || '');
    const [mood, setMood] = useState(entryToEdit?.mood || '');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!text.trim()) {
            setError('الرجاء كتابة اليوميات.');
            return;
        }
        if (!mood) {
            setError('الرجاء اختيار شعورك لهذا اليوم.');
            return;
        }
        setError('');
        setLoading(true);

        const journalCollection = db.collection('users').doc(user.uid).collection('journalEntries');

        try {
            if (entryToEdit) {
                await journalCollection.doc(entryToEdit.id).update({ text, mood });
            } else {
                await journalCollection.add({
                    text,
                    mood,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                });
            }
            onClose();
        } catch (err) {
            console.error("Error saving journal entry:", err);
            setError('حدث خطأ أثناء الحفظ.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-md bg-sky-950/90 border border-sky-500/50 rounded-lg flex flex-col h-[90vh]">
                <header className="flex items-center justify-between p-4 border-b border-sky-400/30 flex-shrink-0">
                    <h2 className="text-xl font-bold text-sky-200">{entryToEdit ? 'تعديل اليومية' : 'يومية جديدة'}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <XMarkIcon className="w-6 h-6 text-white"/>
                    </button>
                </header>
                <main className="flex-grow p-4 flex flex-col space-y-4 overflow-y-auto">
                    {error && <ErrorMessage message={error} />}
                    <div className="flex flex-col flex-grow">
                        <label className="block text-sky-200 mb-2 font-semibold">كيف كان يومك؟</label>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="اكتب هنا..."
                            className="w-full flex-grow bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 transition resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sky-200 mb-3 font-semibold">اختر شعورك:</label>
                        <div className="flex flex-wrap justify-center gap-4">
                            {MOOD_EMOJIS.map(emoji => (
                                <button
                                    key={emoji}
                                    onClick={() => setMood(emoji)}
                                    className={`p-2 rounded-full transition-all text-4xl ${mood === emoji ? 'bg-sky-500 scale-125 ring-2 ring-white' : 'hover:scale-110'}`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>
                </main>
                <footer className="p-4 border-t border-sky-400/30 flex-shrink-0">
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-teal-500 to-teal-700 hover:from-teal-400 hover:to-teal-600 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-teal-400 disabled:opacity-50"
                    >
                        {loading ? 'جارِ الحفظ...' : 'حفظ'}
                    </button>
                </footer>
            </div>
        </div>
    );
};


// --- Main Journal View ---
export const JournalView: React.FC<{ user: firebase.User }> = ({ user }) => {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [entryToEdit, setEntryToEdit] = useState<JournalEntry | null>(null);
    const [entryToView, setEntryToView] = useState<JournalEntry | null>(null);
    const [entryToDelete, setEntryToDelete] = useState<JournalEntry | null>(null);

    useEffect(() => {
        const unsubscribe = db.collection('users').doc(user.uid).collection('journalEntries')
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                const fetchedEntries = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                } as JournalEntry));
                setEntries(fetchedEntries);
                setLoading(false);
            }, err => {
                console.error("Error fetching journal entries:", err);
                setLoading(false);
            });
        
        return unsubscribe;
    }, [user.uid]);
    
    const handleDelete = async () => {
        if (!entryToDelete) return;
        try {
            await db.collection('users').doc(user.uid).collection('journalEntries').doc(entryToDelete.id).delete();
            setEntryToDelete(null);
            setEntryToView(null); // Close the view modal if the entry is deleted
        } catch (error) {
            console.error("Error deleting entry:", error);
        }
    };

    const handleOpenAddModal = () => {
        setEntryToEdit(null);
        setShowAddEditModal(true);
    };

    const handleOpenEditModal = (entry: JournalEntry) => {
        setEntryToView(null); // Close view modal before opening edit modal
        setEntryToEdit(entry);
        setShowAddEditModal(true);
    };

    return (
        <div className="text-white space-y-6 pb-24">
            <header className="flex justify-center items-center">
                <h1 className="text-2xl font-bold text-white text-shadow">اليوميات</h1>
            </header>

            <main className="space-y-4">
                {loading ? (
                    <p className="text-center text-sky-300 py-10">جارِ تحميل اليوميات...</p>
                ) : entries.length > 0 ? (
                    entries.map(entry => (
                        <article key={entry.id} onClick={() => setEntryToView(entry)} className="w-full text-right bg-sky-900/30 rounded-lg hover:bg-sky-800/50 transition-all duration-300 hover:border-sky-600 border border-transparent cursor-pointer p-4 space-y-3">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3 text-left">
                                    <span className="text-4xl">{entry.mood}</span>
                                    <div>
                                        <p className="font-bold text-sky-200">{entry.timestamp ? entry.timestamp.toDate().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : ''}</p>
                                        <p className="text-xs text-sky-500">{entry.timestamp ? formatDistanceToNow(entry.timestamp.toDate()) : ''}</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-sky-300 line-clamp-3 whitespace-pre-wrap break-words">{entry.text}</p>
                        </article>
                    ))
                ) : (
                    <div className="text-center py-16 px-4">
                        <JournalIcon className="w-24 h-24 mx-auto text-sky-700" />
                        <h3 className="mt-4 text-xl font-semibold text-sky-300">لم تكتب شيئاً بعد</h3>
                        <p className="mt-2 text-sky-400">ابدأ بتدوين يومياتك بالضغط على زر الإضافة.</p>
                    </div>
                )}
            </main>

            {showAddEditModal && <AddJournalEntryModal onClose={() => setShowAddEditModal(false)} user={user} entryToEdit={entryToEdit} />}
            
            {entryToView && (
                 <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                     <div className="w-full max-w-md bg-sky-950/90 border border-sky-500/50 rounded-lg flex flex-col h-[90vh]">
                         <header className="flex items-center justify-between p-4 border-b border-sky-400/30 flex-shrink-0">
                             <div className="flex items-center gap-3">
                                <span className="text-3xl">{entryToView.mood}</span>
                                <h2 className="text-xl font-bold text-sky-200">{entryToView.timestamp.toDate().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
                             </div>
                             <button onClick={() => setEntryToView(null)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                                <XMarkIcon className="w-6 h-6 text-white"/>
                            </button>
                         </header>
                         <main className="flex-grow p-6 overflow-y-auto">
                            <p className="text-white whitespace-pre-wrap break-words leading-relaxed text-lg">{entryToView.text}</p>
                         </main>
                         <footer className="p-4 border-t border-sky-400/30 flex-shrink-0 flex gap-4">
                            <button onClick={() => setEntryToDelete(entryToView)} className="w-1/2 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-colors bg-red-800/50 hover:bg-red-700/70 text-red-300">
                                <TrashIcon className="w-5 h-5"/>
                                <span>حذف</span>
                            </button>
                            <button onClick={() => handleOpenEditModal(entryToView)} className="w-1/2 flex items-center justify-center gap-2 py-2 px-4 rounded-lg transition-colors bg-yellow-800/50 hover:bg-yellow-700/70 text-yellow-300">
                                <PencilIcon className="w-5 h-5"/>
                                <span>تعديل</span>
                            </button>
                         </footer>
                     </div>
                 </div>
            )}

            {entryToDelete && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
                    <div className="w-full max-w-sm bg-sky-950 border border-red-500/50 rounded-lg p-6 space-y-4 text-white">
                        <h3 className="text-xl font-bold text-red-400 text-center">تأكيد الحذف</h3>
                        <p className="text-sky-200 text-center">هل أنت متأكد من رغبتك في حذف هذه اليومية؟</p>
                        <div className="flex justify-center gap-4 pt-4">
                            <button onClick={() => setEntryToDelete(null)} className="px-6 py-2 font-semibold text-white rounded-md bg-gray-600 hover:bg-gray-500">إلغاء</button>
                            <button onClick={handleDelete} className="px-6 py-2 font-semibold text-white rounded-md bg-red-600 hover:bg-red-500">حذف</button>
                        </div>
                    </div>
                </div>
            )}

            <button 
                onClick={handleOpenAddModal}
                className="fixed z-40 left-6 bottom-20 w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-teal-500 to-sky-600 text-white shadow-lg hover:scale-110 transition-transform duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950/50 focus:ring-teal-400"
                aria-label="إضافة يومية جديدة"
            >
                <PlusIcon className="w-8 h-8"/>
            </button>
        </div>
    );
};
