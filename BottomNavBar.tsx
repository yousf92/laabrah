import React from 'react';
import { LoggedInView } from './types';
import { HouseIcon, JournalIcon, SettingsIcon } from './icons';

export const BottomNavBar = ({ activeTab, setActiveTab }: { activeTab: LoggedInView; setActiveTab: (tab: LoggedInView) => void; }): React.ReactElement | null => {
    const navItems = [
        { id: 'home', label: 'الرئيسية', icon: HouseIcon },
        { id: 'journal', label: 'اليوميات', icon: JournalIcon },
        { id: 'settings', label: 'الإعدادات', icon: SettingsIcon },
    ];
    
    if (activeTab === 'counter-settings') {
        return null; // Hide nav bar on counter settings page
    }

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-sky-950/90 border-t border-sky-300/30 backdrop-blur-lg z-20">
            <div className="flex justify-around items-center h-16 max-w-md mx-auto">
                {navItems.map(item => (
                    <button 
                        key={item.id}
                        onClick={() => setActiveTab(item.id as LoggedInView)}
                        className={`flex flex-col items-center justify-center space-y-1 w-full text-sm transition-colors duration-200 ${
                            activeTab === item.id ? 'text-sky-300' : 'text-sky-500 hover:text-sky-300'
                        }`}
                        aria-current={activeTab === item.id ? 'page' : undefined}
                    >
                        <item.icon className="w-7 h-7" />
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
};
