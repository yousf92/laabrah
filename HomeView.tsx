import React, { useState, useEffect } from 'react';
import { firebase } from './firebase';
import { LoggedInView, UserProfile } from './types';
import { calculateTimeDifference, getArabicUnitLabel } from './utils';
import { StopwatchIcon, SettingsIcon, ChatIcon, NotificationIcon, UserIcon } from './icons';
import { NajdaFeature, DesireSolverFeature, FaithDoseFeature, CommitmentDocumentFeature } from './Features';

const CounterBar = ({ label, progress, colorClass }: { label: string; progress: number; colorClass: string }): React.ReactElement => {
    return (
        <div className="flex-grow h-12 bg-black/40 rounded-lg p-1 relative">
            <div
                className={`${colorClass} h-full rounded-md transition-all duration-1000 ease-linear`}
                style={{ width: `${progress}%` }}
            ></div>
            <div className="absolute inset-0 flex items-center justify-start pr-4">
                <span className="text-white font-bold text-lg text-shadow">{label}</span>
            </div>
        </div>
    );
};

export const HomeView = ({
    user,
    setActiveTab,
    startDate,
    handleStartCounter,
    counterImage,
    setShowNotifications,
    setShowChat,
    hasUnreadPrivateMessages,
    currentUserProfile,
}: {
    user: firebase.User;
    setActiveTab: (tab: LoggedInView) => void;
    startDate: Date | null;
    handleStartCounter: () => void;
    counterImage: string | null;
    setShowNotifications: (show: boolean) => void;
    setShowChat: (show: boolean) => void;
    hasUnreadPrivateMessages: boolean;
    currentUserProfile: UserProfile | null;
}): React.ReactElement => {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        if (startDate) {
            const timerId = setInterval(() => {
                setNow(new Date());
            }, 1000); // Update every second
    
            return () => clearInterval(timerId);
        }
    }, [startDate]);

    const timeDiff = startDate ? calculateTimeDifference(startDate, now) : { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    const currentDate = new Date().toLocaleDateString('ar-IQ', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const daysInCurrentMonth = startDate ? new Date(startDate.getFullYear(), startDate.getMonth() + timeDiff.months + 1, 0).getDate() : 30;

    const cardStyle = counterImage ? { backgroundImage: `url(${counterImage})` } : {};
    const cardClasses = `w-full max-w-sm mx-auto p-4 rounded-2xl border border-white/10 relative overflow-hidden transition-all duration-500 ${
        counterImage ? 'bg-cover bg-center' : 'bg-gradient-to-br from-teal-500/30 to-sky-600/30 backdrop-blur-sm'
    }`;

    if (!startDate) {
        return (
            <div className="text-white">
                <header className="flex justify-between items-center w-full pt-4">
                     <div>
                        <h1 className="text-xl font-bold text-shadow">
                            مرحباً، {currentUserProfile?.displayName || user.displayName || 'زائر'}
                        </h1>
                        <p className="text-sm text-sky-300">{currentDate}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowNotifications(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors"><NotificationIcon className="w-6 h-6"/></button>
                        <button onClick={() => setShowChat(true)} className="relative p-2 rounded-full hover:bg-white/10 transition-colors">
                            <ChatIcon className="w-6 h-6"/>
                            {hasUnreadPrivateMessages && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-sky-950/90"></span>}
                        </button>
                        <button onClick={() => setActiveTab('settings')} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                            <UserIcon className="w-6 h-6"/>
                        </button>
                    </div>
                </header>
                
                <main className="pt-8">
                    <div style={cardStyle} className={cardClasses}>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <StopwatchIcon className="w-36 h-36 text-white/10" />
                        </div>
                       <div className="relative z-10">
                            <div className="space-y-3">
                                <div className="flex items-center justify-end pl-2">
                                    <button onClick={() => setActiveTab('counter-settings')} className="p-2 rounded-full hover:bg-white/10">
                                        <SettingsIcon className="w-6 h-6 text-white"/>
                                    </button>
                                </div>
                                <CounterBar label={`0 ${getArabicUnitLabel(0, 'month')}`} progress={0} colorClass="bg-orange-500" />
                                <CounterBar label={`0 ${getArabicUnitLabel(0, 'day')}`} progress={0} colorClass="bg-lime-500" />
                                <CounterBar label={`0 ${getArabicUnitLabel(0, 'hour')}`} progress={0} colorClass="bg-blue-500" />
                                <CounterBar label={`0 ${getArabicUnitLabel(0, 'minute')}`} progress={0} colorClass="bg-pink-500" />
                            </div>
                       </div>
                    </div>
                </main>

                <NajdaFeature user={user} currentUserProfile={currentUserProfile} />
                <DesireSolverFeature user={user} currentUserProfile={currentUserProfile} />
                <FaithDoseFeature user={user} currentUserProfile={currentUserProfile} />
                <CommitmentDocumentFeature user={user} currentUserProfile={currentUserProfile} initialText={currentUserProfile?.commitmentDocument} />

                <div className="mt-8 max-w-sm mx-auto">
                    <button 
                        onClick={handleStartCounter}
                        className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-sky-400"
                    >
                        هل تريد بدء حساب الأيام؟
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="text-white">
            <header className="flex justify-between items-center w-full pt-4">
                 <div>
                    <h1 className="text-xl font-bold text-shadow">
                        مرحباً، {currentUserProfile?.displayName || user.displayName || 'زائر'}
                    </h1>
                    <p className="text-sm text-sky-300">{currentDate}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setShowNotifications(true)} className="p-2 rounded-full hover:bg-white/10 transition-colors"><NotificationIcon className="w-6 h-6"/></button>
                    <button onClick={() => setShowChat(true)} className="relative p-2 rounded-full hover:bg-white/10 transition-colors">
                        <ChatIcon className="w-6 h-6"/>
                        {hasUnreadPrivateMessages && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-sky-950/90"></span>}
                    </button>
                    <button onClick={() => setActiveTab('settings')} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <UserIcon className="w-6 h-6"/>
                    </button>
                </div>
            </header>
            
            <main className="pt-8">
                <div style={cardStyle} className={cardClasses}>
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <StopwatchIcon className="w-36 h-36 text-white/10" />
                    </div>
                   <div className="relative z-10">
                        <div className="space-y-3">
                            <div className="flex items-center justify-end pl-2">
                                <button onClick={() => setActiveTab('counter-settings')} className="p-2 rounded-full hover:bg-white/10">
                                    <SettingsIcon className="w-6 h-6 text-white"/>
                                </button>
                            </div>
                            <CounterBar label={`${timeDiff.months} ${getArabicUnitLabel(timeDiff.months, 'month')}`} progress={(timeDiff.days / daysInCurrentMonth) * 100} colorClass="bg-orange-500" />
                            <CounterBar label={`${timeDiff.days} ${getArabicUnitLabel(timeDiff.days, 'day')}`} progress={(timeDiff.hours / 24) * 100} colorClass="bg-lime-500" />
                            <CounterBar label={`${timeDiff.hours} ${getArabicUnitLabel(timeDiff.hours, 'hour')}`} progress={(timeDiff.minutes / 60) * 100} colorClass="bg-blue-500" />
                            <CounterBar label={`${timeDiff.minutes} ${getArabicUnitLabel(timeDiff.minutes, 'minute')}`} progress={(timeDiff.seconds / 60) * 100} colorClass="bg-pink-500" />
                        </div>
                   </div>
                </div>
            </main>
            <NajdaFeature user={user} currentUserProfile={currentUserProfile} />
            <DesireSolverFeature user={user} currentUserProfile={currentUserProfile} />
            <FaithDoseFeature user={user} currentUserProfile={currentUserProfile} />
            <CommitmentDocumentFeature user={user} currentUserProfile={currentUserProfile} initialText={currentUserProfile?.commitmentDocument} />
        </div>
    );
};
