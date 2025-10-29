import React, { useState, useRef } from 'react';
// FIX: Imported firebase to resolve 'Cannot find namespace' error for the firebase.User type.
import { db, firebase } from '../firebase';
import { UserProfile } from '../types';
import { ErrorMessage } from '../common';
import allContent from '../content';

// --- Fallback Content ---
const FALLBACK_DESIRE_SOLUTIONS = [
    { id: 'fallback', text: 'تذكر الهدف الذي تسعى إليه، وتذكر أن كل لحظة تقاوم فيها هي انتصار.' },
    { id: 'fallback2', text: 'اشغل نفسك بعمل مفيد أو رياضة. فالنفس إن لم تشغلها بالحق شغلتك بالباطل.'}
];

// --- Feature Props ---
interface FeatureProps {
    user: firebase.User;
    currentUserProfile: UserProfile | null;
}

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

                db.collection('users').doc(user.uid).update({ desireSolutionsIndex: nextIndex })
                    .catch(err => console.error("Failed to update desireSolutionsIndex", err));
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
        const currentIndex = currentUserProfile?.desireSolutionsIndex ?? -1;
        sessionIndexRef.current = currentIndex;
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
