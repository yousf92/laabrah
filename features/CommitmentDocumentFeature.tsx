import React, { useState, useEffect, useRef } from 'react';
// FIX: Imported firebase to resolve 'Cannot find namespace' error for the firebase.User type.
import { db, firebase } from '../firebase';
import { UserProfile } from '../types';
import { BookOpenIcon, XMarkIcon, PencilIcon, SealIcon } from '../icons';

// --- Commitment Document Feature ---
export const CommitmentDocumentFeature: React.FC<{ user: firebase.User; currentUserProfile: UserProfile | null; initialText?: string }> = ({ user, currentUserProfile, initialText }) => {
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
            <div className="w-full max-w-2xl h-full flex flex-col bg-sky-950/80 md:rounded-2xl border border-sky-700 overflow-hidden md:max-h-[90vh]">
                <header className="flex items-center justify-between p-4 border-b border-sky-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-sky-200 text-shadow">وثيقة الالتزام</h2>
                    <button onClick={handleClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </header>
                
                <main className="flex-grow overflow-y-auto p-6 flex flex-col">
                    {isEditing ? (
                        <>
                            <p className="text-sm text-sky-200 mb-4 flex-shrink-0">
                                اكتب هنا حالتك ومشاعرك الآن... لماذا تريد أن تترك؟ ما هو شعورك السيء؟ اجعلها رسالة لنفسك في المستقبل كلما فكرت في العودة.
                            </p>
                            <textarea
                                value={documentText}
                                onChange={(e) => setDocumentText(e.target.value)}
                                placeholder="أنا ألتزم بترك هذا الفعل لأن..."
                                className="w-full flex-grow bg-slate-800/60 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 transition resize-none"
                            />
                        </>
                    ) : (
                        <div className="bg-slate-900/70 backdrop-blur-md text-slate-200 p-6 rounded-2xl shadow-2xl border border-sky-700/50 relative flex flex-col font-amiri">
                            {/* Decorative corner elements */}
                            <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-sky-600/50 rounded-tr-lg opacity-50"></div>
                            <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-sky-600/50 rounded-bl-lg opacity-50"></div>
                            
                            <div className="text-center z-10">
                                <h3 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-teal-300 tracking-wide text-shadow">وثيقة الالتزام</h3>
                                {/* Ornate Divider */}
                                <div className="flex items-center justify-center my-4">
                                    <div className="flex-grow h-px bg-gradient-to-r from-transparent via-sky-600/50 to-transparent"></div>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="mx-4 text-sky-500">
                                        <path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/>
                                    </svg>
                                    <div className="flex-grow h-px bg-gradient-to-l from-transparent via-sky-600/50 to-transparent"></div>
                                </div>
                            </div>
                            
                            <div className="text-lg whitespace-pre-wrap break-all leading-loose text-center my-4 px-2">
                                {documentText || <p className="text-slate-400">ابدأ بكتابة التزامك بالضغط على زر "تعديل".</p>}
                            </div>
                        
                            <div className="pt-4 text-center z-10">
                                <p className="text-2xl font-amiri font-bold tracking-wider text-sky-200">{currentUserProfile?.displayName || user.displayName}</p>
                                <div className="w-1/2 h-px bg-sky-700/50 mx-auto mt-2"></div>
                                <p className="text-sm text-sky-400 mt-1">التوقيع</p>
                            </div>
                        
                            <div className="absolute bottom-4 left-4 z-10">
                                <SealIcon className="w-20 h-20 text-sky-700/80 opacity-80" />
                            </div>
                        </div>
                    )}
                </main>
                
                <footer className="w-full flex flex-col gap-4 p-4 flex-shrink-0 border-t border-sky-700">
                    {message && <p className={`text-center text-sm -mt-2 mb-2 ${message.includes('خطأ') ? 'text-red-400' : 'text-green-300'}`}>{message}</p>}
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
