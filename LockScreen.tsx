
import React, { useState } from 'react';
import { LockIcon } from './icons';

export const SetPinModal: React.FC<{ onPinSet: (pin: string) => void; onClose: () => void; }> = ({ onPinSet, onClose }) => {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = () => {
        setError('');
        if (!pin || pin.length < 4) {
            setError('يجب أن يتكون الرمز من 4 أرقام على الأقل.');
            return;
        }
        if (pin !== confirmPin) {
            setError('الرمزان غير متطابقين.');
            return;
        }
        onPinSet(pin);
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="w-full max-w-sm bg-sky-950 border border-sky-500/50 rounded-lg p-6 space-y-4">
                <h3 className="text-xl font-bold text-sky-300">تعيين رمز قفل التطبيق</h3>
                {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                <input
                    type="password"
                    placeholder="أدخل الرمز الجديد"
                    className="w-full bg-black/30 border border-sky-400/50 rounded-md p-2 text-center text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    maxLength={4}
                />
                <input
                    type="password"
                    placeholder="تأكيد الرمز الجديد"
                    className="w-full bg-black/30 border border-sky-400/50 rounded-md p-2 text-center text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value)}
                    maxLength={4}
                />
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="px-4 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500">إلغاء</button>
                    <button onClick={handleSubmit} className="px-4 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-sky-600 to-sky-800 hover:from-sky-500 hover:to-sky-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-sky-500">تأكيد</button>
                </div>
            </div>
        </div>
    );
};

export const LockScreen: React.FC<{ onUnlock: () => void }> = ({ onUnlock }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const storedPin = localStorage.getItem('appLockPin');
        if (pin === storedPin) {
            onUnlock();
        } else {
            setError('الرمز غير صحيح. حاول مرة أخرى.');
            setPin('');
        }
    };
    
    return (
        <main 
            className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507400492013-162706c8c05e?q=80&w=2070&auto=format&fit=crop')" }}
        >
            <div className="w-full max-w-sm bg-sky-950/80 rounded-2xl shadow-xl p-8 space-y-6 relative backdrop-blur-xl border border-sky-300/30 text-white">
                <div className="text-center">
                    <LockIcon className="w-12 h-12 mx-auto text-sky-300 mb-4"/>
                    <h2 className="text-2xl font-bold">التطبيق مقفل</h2>
                    <p className="text-sky-300">الرجاء إدخال الرمز لفتح التطبيق</p>
                </div>
                {error && <p className="text-red-400 text-sm text-center -mb-2">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="password"
                        className="w-full bg-black/30 border border-sky-400/50 rounded-md p-3 text-center text-white tracking-[1em] text-2xl focus:outline-none focus:ring-2 focus:ring-sky-500"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        maxLength={4}
                        autoFocus
                    />
                     <button
                        type="submit"
                        className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-sky-500 to-sky-700 hover:from-sky-400 hover:to-sky-600 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-sky-400"
                    >
                        فتح
                    </button>
                </form>
            </div>
        </main>
    );
};
