
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Chat } from "@google/genai";
import { db, firebase } from './firebase';
import { FireIcon, BookOpenIcon, XMarkIcon, PencilIcon, SealIcon } from './icons';
import { ErrorMessage } from './common';

// --- Najda (Help) Feature ---
export const NajdaFeature: React.FC = () => {
    type NajdaView = 'home' | 'breathing' | 'advice';
    const [view, setView] = useState<NajdaView>('home');
    const [breathingText, setBreathingText] = useState('استعد...');
    const [countdown, setCountdown] = useState(57);
    const [advice, setAdvice] = useState('');
    const [adviceLoading, setAdviceLoading] = useState(false);

    // Refs for API key rotation
    const apiKeysRef = useRef<string[]>([]);
    const currentKeyIndexRef = useRef(0);

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

    // Effect for fetching the advice from Gemini
    useEffect(() => {
        if (view !== 'advice') return;

        const fetchAdvice = async () => {
            setAdviceLoading(true);
            setAdvice('');

            if (apiKeysRef.current.length === 0) {
                 apiKeysRef.current = (process.env.API_KEY || '')
                    .split(',')
                    .map(k => k.trim())
                    .filter(Boolean);
            }
        
            if (apiKeysRef.current.length === 0) {
                console.error("Gemini API key not found in process.env.API_KEY");
                setAdvice('لا تستسلم، فبداية الأشياء دائماً هي الأصعب.');
                setAdviceLoading(false);
                return;
            }
            
            const prompt = "كلمني";
            const systemInstruction = "بصفتك ناصح أمين على منهج السلف الصالح خاطب شخص على وشك يطيح في معصية العادة السرية أو مشاهدة الإباحية عطه كلام قوي ومباشر يجمع بين العقل والترهيب والتذكير بعواقب الفعل عشان يتراجع فورا تكلم باللهجة السعودية العامية وردك لازم يكون بدون تشكيل وبدون أي علامات ترقيم نهائيا وخليه قصير ومختصر وطبيعي كأنك تكلم خوي";
            let success = false;
            const totalKeys = apiKeysRef.current.length;

            for (let i = 0; i < totalKeys; i++) {
                const keyIndex = (currentKeyIndexRef.current + i) % totalKeys;
                const apiKey = apiKeysRef.current[keyIndex];

                try {
                    const ai = new GoogleGenAI({ apiKey });
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: prompt,
                        config: { systemInstruction }
                    });

                    setAdvice(response.text);
                    currentKeyIndexRef.current = keyIndex;
                    success = true;
                    break; 

                } catch (error: any) {
                    console.error(`Gemini API error with key index ${keyIndex}:`, error);
                    const isQuotaError = error.toString().includes('429');
                    if (isQuotaError) {
                        console.warn(`Key index ${keyIndex} has reached its quota. Trying next key.`);
                        continue;
                    } else {
                        break;
                    }
                }
            }
            
            if (!success) {
                setAdvice('لا تستسلم، فبداية الأشياء دائماً هي الأصعب.');
            }

            setAdviceLoading(false);
        };
        
        fetchAdvice();
    }, [view]);

    const handleClose = () => {
        setView('home');
        setAdvice('');
        setAdviceLoading(false);
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
export const DesireSolverFeature: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [chat, setChat] = useState<Chat | null>(null);
    const [currentResponse, setCurrentResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const apiKeysRef = useRef<string[]>([]);
    const currentKeyIndexRef = useRef(0);

    const initializeApiKeys = () => {
        if (apiKeysRef.current.length === 0) {
             apiKeysRef.current = (process.env.API_KEY || '')
                .split(',')
                .map(k => k.trim())
                .filter(Boolean);
        }
    };

    const getNewSolution = async (isFirstRequest = false) => {
        setIsLoading(true);
        setError('');
        setCurrentResponse('');
        initializeApiKeys();

        if (apiKeysRef.current.length === 0) {
            console.error("Gemini API key not found in process.env.API_KEY");
            setError('حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى.');
            setIsLoading(false);
            return;
        }

        const systemInstruction = "بصفتك ناصح أمين وفاهم على منهج السلف الصالح خاطب شخص على وشك يطيح في معصية العادة السرية أو مشاهدة الإباحية عطه كلام قوي ومباشر يجمع بين العقل والترهيب والتذكير بعواقب الفعل عشان يتراجع فورا تكلم باللهجة السعودية العامية وكأنك تسولف مع خويك في أزمة لا تكلمني كأنك آلة أو خطيب.. لا تستخدم أي تشكيل أو علامات ترقيم نهائيا لا فاصلة ولا نقطة ولا شي.. عطني كلام طويل ومفصل وخش في صلب الموضوع على طول.. الأهم من هذا كله (شرط أساسي): التنوع الكامل وعدم التكرار. كل مرة أقول لك 'أبغى حل ثاني' لازم تعطيني حل جديد ومختلف تماما عن כל الحلول اللي عطيتني إياها قبل. لا تعيد صياغة نفس الفكرة ولا تكرر أي نصيحة. إذا حسيت إنك بتكرر وقف وقول لي ما عندي شي جديد. لازم כל حل يكون فكرة مستقلة وجديدة.";
        const initialPrompt = "اسمع يا صاحبي أنا فيني بلا وأحس إني على وشك أطيح في مشاهدة المقاطع الإباحية والرغبة قوية مرة أبغاك بصفتك ناصح أمين وفاهم على منهج السلف الصالح تعطيني حل عملي وفوري أقدر أسويه الحين عشان أطفي هذي النار";
        const followUpPrompt = "أبغى حل ثاني";
        
        let localChat = chat;
        let success = false;
        
        for (let i = 0; i < apiKeysRef.current.length; i++) {
            const keyIndex = (currentKeyIndexRef.current + i) % apiKeysRef.current.length;
            const apiKey = apiKeysRef.current[keyIndex];

            try {
                const ai = new GoogleGenAI({ apiKey });

                if (!localChat) {
                    const newChat = ai.chats.create({
                        model: 'gemini-2.5-flash',
                        config: { 
                            systemInstruction,
                            maxOutputTokens: 8192,
                            thinkingConfig: { thinkingBudget: 1024 },
                        },
                    });
                    setChat(newChat);
                    localChat = newChat;
                }

                const prompt = isFirstRequest ? initialPrompt : followUpPrompt;
                const response = await localChat.sendMessage({ message: prompt });
                
                setCurrentResponse(response.text);
                currentKeyIndexRef.current = keyIndex;
                success = true;
                break;

            } catch (err: any) {
                console.error(`Gemini API error with key index ${keyIndex}:`, err);
                const isQuotaError = err.toString().includes('429');
                if (isQuotaError) {
                    console.warn(`Key index ${keyIndex} has reached its quota. Trying next key.`);
                    setChat(null); // Reset chat session if key fails
                    localChat = null;
                    continue;
                } else {
                    setError('حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.');
                    break;
                }
            }
        }
        
        if (!success && !error) {
            setError('فشلت جميع محاولات الاتصال، حاول مرة أخرى.');
        }

        setIsLoading(false);
    };
    
    const handleOpen = () => {
        setIsOpen(true);
        getNewSolution(true);
    };

    const handleClose = () => {
        setIsOpen(false);
        setChat(null);
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
                {isLoading && (
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-400 mx-auto"></div>
                )}
                {error && <ErrorMessage message={error} />}
                {!isLoading && currentResponse && (
                     <p className="text-xl font-semibold leading-relaxed text-shadow">{currentResponse}</p>
                )}
            </div>
            
            <div className="w-full max-w-sm flex flex-col gap-4 pb-10 flex-shrink-0">
                 {!isLoading && (
                    <button
                        onClick={() => getNewSolution(false)}
                        className="w-full px-8 py-3 font-semibold rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-sky-500"
                    >
                        أبغى حل ثاني
                    </button>
                 )}
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
export const FaithDoseFeature: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [chat, setChat] = useState<Chat | null>(null);
    const [currentStory, setCurrentStory] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    
    const apiKeysRef = useRef<string[]>([]);
    const currentKeyIndexRef = useRef(0);

    const initializeApiKeys = () => {
        if (apiKeysRef.current.length === 0) {
             apiKeysRef.current = (process.env.API_KEY || '')
                .split(',')
                .map(k => k.trim())
                .filter(Boolean);
        }
    };

    const getNewStory = async (isFirstRequest = false) => {
        setIsLoading(true);
        setError('');
        setCurrentStory('');
        initializeApiKeys();

        if (apiKeysRef.current.length === 0) {
            console.error("Gemini API key not found in process.env.API_KEY");
            setError('حدث خطأ في الاتصال، يرجى المحاولة مرة أخرى.');
            setIsLoading(false);
            return;
        }

        const systemInstruction = "بصفتك ناصح امين وفاهم على منهج السلف الصالح اسمع يا صاحبي أبغاك تسولف لي سالفة عن واحد من الصالحين وكيف كان خوفه من الله وتقواه وكيف كان يجاهد نفسه عشان يترك المعاصي وكيف لقى لذة الإيمان الحقيقية واربط لي هالكلام بموضوع التعافي من الإدمان وكيف إن لذة الطاعة أحلى وأبقى من لذة المعصية الزايلة. الشخصيات: لا تجيب لي سيرة الخلفاء الراشدين الأربعة (أبو بكر وعمر وعثمان وعلي) لأني أعرف قصصهم. أبغاك تجيب لي قصص عشوائية وجديدة كل مرة من حياة التابعين وتابعي التابعين والعلماء والصالحين والعباد والزهاد من כל العصور. يعني كل مرة أطلب منك عطني قصة لشخصية مختلفة تماما ولا تكرر لي نفس الشخصية أبدا. المنهج: لا تطلع عن منهج السلف الصالح في طريقة سردك للقصص والمعلومات.. اللهجة: تكلم باللهجة السعودية العامية وخلك طبيعي كأنك تسولف مع خويك في استراحة.. التنسيق: لا تستخدم أي علامات ترقيم (لا فاصلة ولا نقطة) ولا أي تشكيل (فتحة ضمة كسرة) نهائيا.. الطول: عطني كلام طويل ومفصل وسولف من قلبك. ركز معي زين: كل قصة لازم تبدأ بذكر اسم صاحبها بوضوح. مثلا تقول 'بأسولف لك عن فلان...' وبعدها تبدأ القصة من أولها مو من نصها. هذا شرط أساسي ومهم جدا. أكرر مرة ثانية: بداية ردك لازم تكون بالصيغة هذي 'اسمع سالفة فلان بن فلان' وبعدها تبدأ القصة مباشرة بدون أي مقدمات ثانية.";
        const initialPrompt = "عطني اول قصة";
        const followUpPrompt = "أبغى قصة ثانية";
        
        let localChat = chat;
        let success = false;
        
        for (let i = 0; i < apiKeysRef.current.length; i++) {
            const keyIndex = (currentKeyIndexRef.current + i) % apiKeysRef.current.length;
            const apiKey = apiKeysRef.current[keyIndex];

            try {
                const ai = new GoogleGenAI({ apiKey });

                if (!localChat) {
                    const newChat = ai.chats.create({
                        model: 'gemini-2.5-flash',
                        config: { 
                            systemInstruction,
                            maxOutputTokens: 8192,
                            thinkingConfig: { thinkingBudget: 1024 },
                        },
                    });
                    setChat(newChat);
                    localChat = newChat;
                }

                const prompt = isFirstRequest ? initialPrompt : followUpPrompt;
                const response = await localChat.sendMessage({ message: prompt });
                
                setCurrentStory(response.text);
                currentKeyIndexRef.current = keyIndex;
                success = true;
                break;

            } catch (err: any) {
                console.error(`Gemini API error with key index ${keyIndex}:`, err);
                const isQuotaError = err.toString().includes('429');
                if (isQuotaError) {
                    console.warn(`Key index ${keyIndex} has reached its quota. Trying next key.`);
                    setChat(null); 
                    localChat = null;
                    continue;
                } else {
                    setError('حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.');
                    break;
                }
            }
        }
        
        if (!success && !error) {
            setError('فشلت جميع محاولات الاتصال، حاول مرة أخرى.');
        }

        setIsLoading(false);
    };
    
    const handleOpen = () => {
        setIsOpen(true);
        getNewStory(true);
    };

    const handleClose = () => {
        setIsOpen(false);
        setChat(null);
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
                {isLoading && (
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-sky-400 mx-auto"></div>
                )}
                {error && <ErrorMessage message={error} />}
                {!isLoading && currentStory && (
                     <p className="text-xl font-semibold leading-relaxed text-shadow">{currentStory}</p>
                )}
            </div>
            
            <div className="w-full max-w-sm flex flex-col gap-4 pb-10 flex-shrink-0">
                 {!isLoading && (
                    <button
                        onClick={() => getNewStory(false)}
                        className="w-full px-8 py-3 font-semibold rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-sky-500"
                    >
                        أبغى قصة ثانية
                    </button>
                 )}
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
