import React, { useState, useEffect } from 'react';
// FIX: Imported firebase to resolve 'Cannot find namespace' error for the firebase.User type.
import { db, firebase } from '../firebase';
import { UserProfile } from '../types';
import { FireIcon } from '../icons';
import { ErrorMessage } from '../common';
import allContent from '../content';

// --- Fallback Content ---
const FALLBACK_NAJDA_ADVICE = [
    { id: 'fallback', text: 'لا تستسلم، فبداية الأشياء دائماً هي الأصعب. القوة تأتي مع الصبر.' },
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

                db.collection('users').doc(user.uid).update({ najdaAdviceIndex: nextIndex })
                    .catch(err => console.error("Failed to update najdaAdviceIndex", err));

            } catch (err: any) {
                console.error("Error processing Najda advice from content, using fallback:", err);
                setError('حدث خطأ في جلب النصيحة، يتم عرض محتوى افتراضي.');
                setAdvice(FALLBACK_NAJDA_ADVICE[0].text);
            } finally {
                setAdviceLoading(false);
            }
        };
        
        setNextAdvice();
    }, [view, user.uid, currentUserProfile]);

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
