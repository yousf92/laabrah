import React, { useState, useEffect } from 'react';
import { db, firebase } from './firebase';
import { UserProfile } from './types';
import { TrashIcon, ShieldCheckIcon, LogoutIcon, CameraIcon } from './icons';
import { ErrorMessage } from './common';

declare const uploadcare: any;

const GuestLogoutConfirmationModal: React.FC<{ onConfirm: () => void; onClose: () => void; }> = ({ onConfirm, onClose }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="w-full max-w-sm bg-sky-950 border border-yellow-500/50 rounded-lg p-6 space-y-4 text-white">
            <h3 className="text-xl font-bold text-yellow-300 text-center">تنبيه</h3>
            <p className="text-sky-200 text-center">
                أنت حاليًا تستخدم حساب ضيف. تسجيل الخروج سيؤدي إلى حذف جميع بياناتك (العداد، اليوميات، إلخ) بشكل دائم.
            </p>
            <p className="text-sky-200 text-center font-semibold">
                لحفظ تقدمك، نوصي بإنشاء حساب دائم.
            </p>
            <div className="flex justify-center gap-4 pt-4">
                <button 
                    onClick={onClose}
                    className="px-6 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500"
                >
                    إلغاء
                </button>
                 <button
                    onClick={onConfirm}
                    className="px-6 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-red-500"
                >
                    المتابعة وحذف البيانات
                </button>
            </div>
        </div>
    </div>
);

const BlockedUsersManager: React.FC<{ blockedUids: string[]; onUnblock: (uid: string) => void; }> = ({ blockedUids, onUnblock }) => {
    const [blockedProfiles, setBlockedProfiles] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (blockedUids.length === 0) {
            setBlockedProfiles([]);
            setLoading(false);
            return;
        }

        const fetchProfiles = async () => {
            setLoading(true);
            const profiles: UserProfile[] = [];
            for (const uid of blockedUids) {
                try {
                    const userDoc = await db.collection('users').doc(uid).get();
                    if (userDoc.exists) {
                        profiles.push({ uid, ...(userDoc.data() as Omit<UserProfile, 'uid'>) });
                    }
                } catch (error) {
                    console.error(`Failed to fetch profile for UID ${uid}`, error);
                }
            }
            setBlockedProfiles(profiles);
            setLoading(false);
        };

        fetchProfiles();
    }, [blockedUids]);

    return (
        <div className="p-4 bg-sky-900/30 rounded-lg space-y-2">
            <h3 className="text-lg font-semibold text-sky-200 px-2">المستخدمون المحظورون</h3>
            {loading ? (
                <p className="text-center text-sky-300">جارِ التحميل...</p>
            ) : blockedProfiles.length > 0 ? (
                <ul className="space-y-2">
                    {blockedProfiles.map(profile => (
                        <li key={profile.uid} className="flex justify-between items-center p-2 rounded-lg hover:bg-sky-800/50 transition-colors">
                            <div className="flex items-center gap-3">
                                <img
                                    src={profile.photoURL || `https://ui-avatars.com/api/?name=${profile.displayName || ' '}&background=0284c7&color=fff&size=128`}
                                    alt={profile.displayName}
                                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                                />
                                <span>{profile.displayName}</span>
                            </div>
                            <button onClick={() => onUnblock(profile.uid)} className="px-3 py-1 text-sm bg-sky-600 hover:bg-sky-500 rounded-md transition-colors">إلغاء الحظر</button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-sky-400 p-2">لا يوجد مستخدمون محظورون.</p>
            )}
        </div>
    );
};


export const SettingsView: React.FC<{ 
    user: firebase.User; 
    currentUserProfile: UserProfile | null;
    handleSignOut: () => void; 
    blockedUsers: string[];
    handleUnblockUser: (uid: string) => void;
    handleAppLockToggle: () => void;
    appLockEnabled: boolean;
    setShowSetPinModal: (show: boolean) => void;
}> = ({ user, currentUserProfile, handleSignOut, blockedUsers, handleUnblockUser, handleAppLockToggle, appLockEnabled, setShowSetPinModal }) => {
    const [displayName, setDisplayName] = useState(currentUserProfile?.displayName || user.displayName || '');
    const [photoPreview, setPhotoPreview] = useState<string | null>(currentUserProfile?.photoURL || user.photoURL || null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState('');
    const [showGuestLogoutModal, setShowGuestLogoutModal] = useState(false);

    useEffect(() => {
        setDisplayName(currentUserProfile?.displayName || user.displayName || '');
        setPhotoPreview(currentUserProfile?.photoURL || user.photoURL || null);
    }, [user, currentUserProfile]);

    const handleImageUpload = () => {
        const dialog = uploadcare.openDialog(null, {
            publicKey: 'e5cdcd97e0e41d6aa881',
            imagesOnly: true,
            crop: "1:1",
        });

        dialog.done((file: any) => {
            file.promise().done((fileInfo: any) => {
                setPhotoPreview(fileInfo.cdnUrl);
            });
        });
    };

    const handleSaveProfile = async () => {
        if (displayName === (user.displayName || '') && photoPreview === (user.photoURL || null)) {
            setMessage('لم يتم إجراء أي تغييرات.');
            setTimeout(() => setMessage(''), 3000);
            return;
        }

        setLoading(true);
        setMessage('');
        setError('');
        try {
            await user.updateProfile({
                displayName: displayName,
                photoURL: photoPreview,
            });

            await db.collection('users').doc(user.uid).update({
                displayName: displayName,
                photoURL: photoPreview,
            });
            
            setMessage('تم تحديث الملف الشخصي بنجاح!');
            setTimeout(() => setMessage(''), 3000);

        } catch (error) {
            console.error("Error updating profile: ", error);
            setError('حدث خطأ أثناء تحديث الملف الشخصي.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleDeleteAccount = async () => {
        if (deleteConfirmation !== 'حذف') {
            setError('الرجاء كتابة "حذف" للتأكيد.');
            return;
        }
        setLoading(true);
        setError('');
        setMessage('');
        try {
            await user.delete();
            // Auth state change will handle redirect
        } catch (err: any) {
            setError(getFirebaseErrorMessage(err.code));
            setShowDeleteModal(false); // Close modal to show error on main settings page
        } finally {
            setLoading(false);
        }
    };
    
    const getFirebaseErrorMessage = (errorCode: string): string => {
        switch (errorCode) {
            case 'auth/requires-recent-login':
                return 'هذه العملية حساسة وتتطلب مصادقة حديثة. يرجى تسجيل الخروج ثم الدخول مرة أخرى والمحاولة مجدداً.';
            default:
                return 'حدث خطأ ما. يرجى المحاولة مرة أخرى.';
        }
    };
    
    const handleSignOutClick = () => {
        if (user.isAnonymous) {
            setShowGuestLogoutModal(true);
        } else {
            handleSignOut();
        }
    };

    return (
        <div className="text-white space-y-6">
            <header>
                <h1 className="text-2xl font-bold text-center text-white text-shadow">الإعدادات</h1>
            </header>
            
            {error && <ErrorMessage message={error} />}

            {/* Profile Section */}
            <div className="space-y-6 p-6 bg-sky-900/30 rounded-lg">
                <h2 className="text-xl font-semibold text-sky-200 border-b border-sky-400/30 pb-2">الملف الشخصي</h2>
                
                <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                        <img 
                            src={photoPreview || `https://ui-avatars.com/api/?name=${displayName || 'زائر'}&background=0ea5e9&color=fff&size=128`}
                            alt="الملف الشخصي"
                            className="w-32 h-32 rounded-full object-cover border-4 border-sky-400/50"
                        />
                        <button
                            onClick={handleImageUpload}
                            className="absolute bottom-0 right-0 bg-sky-600 p-2 rounded-full hover:bg-sky-500 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-300"
                            aria-label="تغيير الصورة"
                        >
                            <CameraIcon className="w-6 h-6 text-white"/>
                        </button>
                    </div>
                </div>

                <div className="relative z-0 pt-4">
                     <input
                        id="displayName"
                        type="text"
                        className="block py-2.5 px-0 w-full text-lg text-white bg-transparent border-0 border-b-2 border-sky-400/30 appearance-none focus:outline-none focus:ring-0 focus:border-sky-300 peer"
                        placeholder=" "
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                    />
                    <label
                        htmlFor="displayName"
                        className="absolute text-lg text-sky-200 duration-300 transform -translate-y-6 scale-75 top-7 -z-10 origin-[100%] peer-focus:origin-[100%] peer-focus:right-0 peer-focus:text-sky-300 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
                    >
                        الاسم
                    </label>
                </div>
                
                <button
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="w-full text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-teal-500 to-teal-700 hover:from-teal-400 hover:to-teal-600 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-teal-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale disabled:scale-100"
                >
                    {loading ? 'جارِ الحفظ...' : 'حفظ التغييرات'}
                </button>
                {message && <p className="text-center text-green-300 mt-2 text-sm">{message}</p>}
            </div>

            {/* Security Section */}
            <div className="p-4 bg-sky-900/30 rounded-lg space-y-2">
                <h3 className="text-lg font-semibold text-sky-200 px-2">الأمان</h3>
                <div className="flex justify-between items-center p-2 rounded-lg hover:bg-sky-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                        <ShieldCheckIcon className="w-6 h-6 text-sky-300"/>
                        <span>قفل التطبيق</span>
                    </div>
                    <label htmlFor="app-lock-toggle" className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="app-lock-toggle" className="sr-only peer" checked={appLockEnabled} onChange={handleAppLockToggle} />
                        <div className="w-11 h-6 bg-gray-500 rounded-full peer peer-focus:ring-2 peer-focus:ring-sky-400 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sky-600"></div>
                    </label>
                </div>
                 <button onClick={handleSignOutClick} className="flex justify-between items-center w-full p-2 rounded-lg hover:bg-sky-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                        <LogoutIcon className="w-6 h-6 text-sky-300"/>
                        <span>تسجيل الخروج</span>
                    </div>
                </button>
            </div>
            
            {!user.isAnonymous && <BlockedUsersManager blockedUids={blockedUsers} onUnblock={handleUnblockUser} />}

            {/* Danger Zone */}
            <div className="p-4 bg-red-900/30 rounded-lg space-y-2">
                <h3 className="text-lg font-semibold text-red-300 px-2">منطقة الخطر</h3>
                <button onClick={() => setShowDeleteModal(true)} className="flex justify-between items-center w-full p-2 rounded-lg hover:bg-red-800/50 transition-colors">
                    <div className="flex items-center gap-4">
                        <TrashIcon className="w-6 h-6 text-red-400"/>
                        <span className="text-red-400">حذف الحساب</span>
                    </div>
                </button>
            </div>

            {/* Modals */}
            {showGuestLogoutModal && (
                <GuestLogoutConfirmationModal
                    onConfirm={() => {
                        setShowGuestLogoutModal(false);
                        handleSignOut();
                    }}
                    onClose={() => setShowGuestLogoutModal(false)}
                />
            )}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-sm bg-sky-950 border border-red-500/50 rounded-lg p-6 space-y-4">
                        <h3 className="text-xl font-bold text-red-400">تأكيد حذف الحساب</h3>
                        <p className="text-sky-200">
                            هل أنت متأكد من رغبتك في حذف حسابك؟ سيتم حذف جميع بياناتك بشكل دائم ولا يمكن التراجع عن هذا الإجراء.
                        </p>
                        <p className="text-sm text-sky-300">للتأكيد، يرجى كتابة <span className="font-bold text-red-400">حذف</span> في المربع أدناه.</p>
                        <input
                            type="text"
                            className="w-full bg-black/30 border border-red-400/50 rounded-md p-2 text-center text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                            value={deleteConfirmation}
                            onChange={(e) => setDeleteConfirmation(e.target.value)}
                        />
                        <div className="flex justify-end gap-4">
                            <button 
                                onClick={() => setShowDeleteModal(false)}
                                className="px-4 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500"
                            >
                                إلغاء
                            </button>
                             <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmation !== 'حذف' || loading}
                                className="px-4 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale disabled:scale-100"
                            >
                                {loading ? 'جارِ الحذف...' : 'تأكيد الحذف'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
