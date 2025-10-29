import React, { useState, useEffect, useRef } from 'react';
// FIX: Imported firebase to resolve 'Cannot find namespace' error for the firebase.User type.
import { db, firebase } from './firebase';
import { UserProfile } from './types';
import { FireIcon, BookOpenIcon, XMarkIcon, PencilIcon, SealIcon } from './icons';
import { ErrorMessage } from './common';
import allContent from './content.ts';

// --- Fallback Content ---
const FALLBACK_NAJDA_ADVICE = [
    { id: 'fallback', text: 'لا تستسلم، فبداية الأشياء دائماً هي الأصعب. القوة تأتي مع الصبر.' },
];

const FALLBACK_DESIRE_SOLUTIONS = [
    { id: 'fallback', text: 'تذكر الهدف الذي تسعى إليه، وتذكر أن كل لحظة تقاوم فيها هي انتصار.' },
    { id: 'fallback2', text: 'اشغل نفسك بعمل مفيد أو رياضة. فالنفس إن لم تشغلها بالحق شغلتك بالباطل.'}
];

const FALLBACK_SALAF_STORIES = [
    { id: 'fallback', text: 'قال عمر بن الخطاب رضي الله عنه: "لو نزلت صاعقة من السماء ما أصابت مستغفراً".' },
    { id: 'fallback2', text: 'سُئل الإمام أحمد: متى يجد العبد طعم الراحة؟ فقال: عند أول قدم يضعها في الجنة.'}
];

// --- Feature Props ---
interface FeatureProps {
    user: firebase.User;
    currentUserProfile: UserProfile | null;
}


// --- Najda (Help) Feature ---
export const NajdaFeature: React.FC<FeatureProps> = ({ user, currentUserProfile }) => {
    type NajdaView = 'home' | 'breathing' | 'advice';
    const [view, setView] = useState<NajdaView>('home');
    const [breathingText, setBreathingText] = useState('استعد...');
    const [countdown, setCountdown] = useState(57);
    const [advice, setAdvice] = useState('');
    const [adviceLoading, setAdviceLoading] = useState(false);
    const [error, setError] = useState('');


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

    // Effect for getting the advice from imported content.ts
    useEffect(() => {
        if (view !== 'advice') return;

        const setNextAdvice = () => {
            setAdviceLoading(true);
            setAdvice('');
            setError('');

            try {
                const advices = (allContent.najda_advice && allContent.najda_advice.length > 0)
                    ? allContent.najda_advice
                    : FALLBACK_NAJDA_ADVICE;
                
                const currentIndex = currentUserProfile?.najdaAdviceIndex ?? -1;
                const nextIndex = (currentIndex + 1) % advices.length;

                setAdvice(advices[nextIndex].text);

                // Update Firestore asynchronously for non-guest users
                if (user && !user.isAnonymous) {
                    db.collection('users').doc(user.uid).update({ najdaAdviceIndex: nextIndex })
                      .catch(err => console.error("Failed to update najdaAdviceIndex", err));
                }

            } catch (err: any) {
                console.error("Error processing Najda advice from content, using fallback:", err);
                setError('حدث خطأ في جلب النصيحة، يتم عرض محتوى افتراضي.');
                setAdvice(FALLBACK_NAJDA_ADVICE[0].text);
            } finally {
                setAdviceLoading(false);
            }
        };
        
        setNextAdvice();
    }, [view, user, currentUserProfile]);

    const handleClose = () => {
        setView('home');
        setAdvice('');
        setAdviceLoading(false);
        setError('');
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
                    ) : error && !advice ? ( 
                        <ErrorMessage message={error} />
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
export const DesireSolverFeature: React.FC<FeatureProps> = ({ user, currentUserProfile }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentResponse, setCurrentResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const sessionIndexRef = useRef<number>(-1);

    const getNewSolution = () => {
        setIsLoading(true);
        setError('');

        try {
             const sourceData = (allContent.desire_solutions && allContent.desire_solutions.length > 0)
                ? allContent.desire_solutions
                : FALLBACK_DESIRE_SOLUTIONS;

            if (sourceData.length > 0) {
                const nextIndex = (sessionIndexRef.current + 1) % sourceData.length;
                sessionIndexRef.current = nextIndex;
                setCurrentResponse(sourceData[nextIndex].text);

                if (user && !user.isAnonymous) {
                    db.collection('users').doc(user.uid).update({ desireSolutionsIndex: nextIndex })
                        .catch(err => console.error("Failed to update desireSolutionsIndex", err));
                }
            } else {
                setCurrentResponse('لا توجد حلول متاحة حاليًا.');
            }
        } catch (err) {
            console.error("Error processing solutions from content, using fallback:", err);
            setError('حدث خطأ في جلب الحلول، يتم عرض محتوى افتراضي.');
            setCurrentResponse(FALLBACK_DESIRE_SOLUTIONS[0].text);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleOpen = () => {
        sessionIndexRef.current = currentUserProfile?.desireSolutionsIndex ?? -1;
        setIsOpen(true);
        getNewSolution();
    };

    const handleClose = () => {
        setIsOpen(false);
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
                {isLoading && !currentResponse && (
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-400 mx-auto"></div>
                )}
                {error && <ErrorMessage message={error} />}
                {!error && currentResponse && (
                     <p className="text-xl font-semibold leading-relaxed text-shadow">{currentResponse}</p>
                )}
            </div>
            
            <div className="w-full max-w-sm flex flex-col gap-4 pb-10 flex-shrink-0">
                <button
                    onClick={getNewSolution}
                    disabled={isLoading}
                    className="w-full px-8 py-3 font-semibold rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-wait"
                >
                    أبغى حل ثاني
                </button>
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
export const FaithDoseFeature: React.FC<FeatureProps> = ({ user, currentUserProfile }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentStory, setCurrentStory] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const sessionIndexRef = useRef<number>(-1);

    const getNewStory = () => {
        setIsLoading(true);
        setError('');
        
        try {
            const sourceData = (allContent.salaf_stories && allContent.salaf_stories.length > 0)
                ? allContent.salaf_stories
                : FALLBACK_SALAF_STORIES;

            if (sourceData.length > 0) {
                const nextIndex = (sessionIndexRef.current + 1) % sourceData.length;
                sessionIndexRef.current = nextIndex;
                setCurrentStory(sourceData[nextIndex].text);

                if (user && !user.isAnonymous) {
                    db.collection('users').doc(user.uid).update({ salafStoriesIndex: nextIndex })
                        .catch(err => console.error("Failed to update salafStoriesIndex", err));
                }
            } else {
                setCurrentStory('لا توجد قصص متاحة حاليًا.');
            }
        } catch (err) {
            console.error("Error processing stories from content, using fallback:", err);
            setError('حدث خطأ في جلب القصص، يتم عرض محتوى افتراضي.');
            setCurrentStory(FALLBACK_SALAF_STORIES[0].text);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleOpen = () => {
        sessionIndexRef.current = currentUserProfile?.salafStoriesIndex ?? -1;
        setIsOpen(true);
        getNewStory();
    };

    const handleClose = () => {
        setIsOpen(false);
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
                {isLoading && !currentStory && (
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-400 mx-auto"></div>
                )}
                {error && <ErrorMessage message={error} />}
                {!error && currentStory && (
                     <p className="text-xl font-semibold leading-relaxed text-shadow">{currentStory}</p>
                )}
            </div>
            
            <div className="w-full max-w-sm flex flex-col gap-4 pb-10 flex-shrink-0">
                <button
                    onClick={getNewStory}
                    disabled={isLoading}
                    className="w-full px-8 py-3 font-semibold rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-wait"
                >
                    أبغى قصة ثانية
                </button>
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
export const CommitmentDocumentFeature: React.FC<{ user: firebase.User; initialText?: string }> = ({ user, initialText }) => {
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