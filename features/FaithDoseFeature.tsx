import React, { useState, useRef } from 'react';
// FIX: Imported firebase to resolve 'Cannot find namespace' error for the firebase.User type.
import { db, firebase } from '../firebase';
import { UserProfile } from '../types';
import { BookOpenIcon } from '../icons';
import { ErrorMessage } from '../common';
import allContent from '../content';

// --- Fallback Content ---
const FALLBACK_SALAF_STORIES = [
    { id: 'fallback', text: 'قال عمر بن الخطاب رضي الله عنه: "لو نزلت صاعقة من السماء ما أصابت مستغفراً".' },
    { id: 'fallback2', text: 'سُئل الإمام أحمد: متى يجد العبد طعم الراحة؟ فقال: عند أول قدم يضعها في الجنة.'}
];

// --- Feature Props ---
interface FeatureProps {
    user: firebase.User;
    currentUserProfile: UserProfile | null;
}

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

                db.collection('users').doc(user.uid).update({ salafStoriesIndex: nextIndex })
                    .catch(err => console.error("Failed to update salafStoriesIndex", err));
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
        const currentIndex = currentUserProfile?.salafStoriesIndex ?? -1;
        sessionIndexRef.current = currentIndex;
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
