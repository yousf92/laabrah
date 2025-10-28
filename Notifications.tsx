
import React, { useState, useEffect } from 'react';
import { db, firebase } from './firebase';
import { Notification } from './types';
import { formatDistanceToNow } from './utils';
import { XMarkIcon, PlusIcon, PencilIcon, TrashIcon } from './icons';
import { ErrorMessage } from './common';

const DeleteNotificationConfirmationModal: React.FC<{ onConfirm: () => void; onClose: () => void; }> = ({ onConfirm, onClose }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="w-full max-w-sm bg-sky-950 border border-red-500/50 rounded-lg p-6 space-y-4 text-white">
            <h3 className="text-xl font-bold text-red-400 text-center">تأكيد حذف الإشعار</h3>
            <p className="text-sky-200 text-center">هل أنت متأكد من رغبتك في حذف هذا الإشعار بشكل دائم؟</p>
            <div className="flex justify-center gap-4 pt-4">
                <button onClick={onClose} className="px-6 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500">
                    إلغاء
                </button>
                <button onClick={onConfirm} className="px-6 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-red-500">
                    حذف
                </button>
            </div>
        </div>
    </div>
);

export const NotificationsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    notifications: Notification[];
    isDeveloper: boolean;
}> = ({ isOpen, onClose, notifications, isDeveloper }) => {
    const [isFormVisible, setFormVisible] = useState(false);
    const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notificationToDelete, setNotificationToDelete] = useState<Notification | null>(null);

    useEffect(() => {
        if (!isOpen) {
            // Reset state when modal is closed
            setFormVisible(false);
            setEditingNotification(null);
            setError('');
            setTitle('');
            setMessage('');
        }
    }, [isOpen]);

    const handleShowFormForNew = () => {
        setEditingNotification(null);
        setTitle('');
        setMessage('');
        setFormVisible(true);
    };

    const handleShowFormForEdit = (notification: Notification) => {
        setEditingNotification(notification);
        setTitle(notification.title);
        setMessage(notification.message);
        setFormVisible(true);
    };

    const handleCancelForm = () => {
        setFormVisible(false);
        setEditingNotification(null);
        setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim()) {
            setError('يجب ملء حقل العنوان والرسالة.');
            return;
        }
        setLoading(true);
        setError('');

        try {
            if (editingNotification) {
                // Update existing notification
                await db.collection('notifications').doc(editingNotification.id).update({ title, message });
            } else {
                // Create new notification
                await db.collection('notifications').add({
                    title,
                    message,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            handleCancelForm();
        } catch (err) {
            console.error("Error saving notification:", err);
            setError('حدث خطأ أثناء حفظ الإشعار.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!notificationToDelete) return;
        setLoading(true);
        try {
            await db.collection('notifications').doc(notificationToDelete.id).delete();
            setNotificationToDelete(null);
        } catch (err) {
            console.error("Error deleting notification:", err);
            setError('حدث خطأ أثناء حذف الإشعار.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const ViewComponent = (
        <div className="p-4 space-y-4">
            {isDeveloper && (
                <button onClick={handleShowFormForNew} className="w-full flex items-center justify-center gap-2 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 ease-in-out shadow-lg border border-white/20 focus:outline-none bg-gradient-to-br from-teal-500 to-teal-700 hover:from-teal-400 hover:to-teal-600 hover:shadow-xl hover:scale-105 active:scale-95 active:shadow-md focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-900/50 focus:ring-teal-400">
                    <PlusIcon className="w-6 h-6" />
                    <span>إشعار جديد</span>
                </button>
            )}
            {notifications.length > 0 ? (
                notifications.map(notification => (
                    <div key={notification.id} className="bg-sky-900/50 p-4 rounded-lg border border-sky-400/20">
                        <div className="flex justify-between items-start gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-sky-200">{notification.title}</h3>
                                <p className="text-sm text-sky-400 mt-1 mb-2 whitespace-pre-wrap">{notification.message}</p>
                                <p className="text-xs text-sky-500">{notification.timestamp ? formatDistanceToNow(notification.timestamp.toDate()) : '...'}</p>
                            </div>
                            {isDeveloper && (
                                <div className="flex gap-2 flex-shrink-0">
                                    <button onClick={() => handleShowFormForEdit(notification)} className="p-2 text-yellow-300 hover:text-yellow-100 hover:bg-white/10 rounded-full transition-colors"><PencilIcon className="w-5 h-5"/></button>
                                    <button onClick={() => setNotificationToDelete(notification)} className="p-2 text-red-400 hover:text-red-200 hover:bg-white/10 rounded-full transition-colors"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            )}
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-center text-sky-400 py-8">لا توجد إشعارات حالياً.</p>
            )}
        </div>
    );

    const FormComponent = (
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && <ErrorMessage message={error} />}
            <div className="relative z-0">
                <input id="notif_title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="block py-2.5 px-0 w-full text-lg text-white bg-transparent border-0 border-b-2 border-sky-400/30 appearance-none focus:outline-none focus:ring-0 focus:border-sky-300 peer" placeholder=" " required />
                <label htmlFor="notif_title" className="absolute text-lg text-sky-200 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[100%] peer-focus:origin-[100%] peer-focus:right-0 peer-focus:text-sky-300 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">العنوان</label>
            </div>
            <div className="relative z-0">
                <textarea id="notif_message" value={message} onChange={(e) => setMessage(e.target.value)} className="block py-2.5 px-0 w-full h-32 text-lg text-white bg-transparent border-0 border-b-2 border-sky-400/30 appearance-none focus:outline-none focus:ring-0 focus:border-sky-300 peer" placeholder=" " required />
                <label htmlFor="notif_message" className="absolute text-lg text-sky-200 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[100%] peer-focus:origin-[100%] peer-focus:right-0 peer-focus:text-sky-300 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6">الرسالة</label>
            </div>
            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={handleCancelForm} className="px-4 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-gray-600 to-gray-800 hover:from-gray-500 hover:to-gray-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-gray-500">إلغاء</button>
                <button type="submit" disabled={loading} className="px-4 py-2 font-semibold text-white rounded-md transition-all duration-300 ease-in-out shadow-md border border-white/20 focus:outline-none bg-gradient-to-br from-sky-600 to-sky-800 hover:from-sky-500 hover:to-sky-700 hover:shadow-lg hover:scale-105 active:scale-95 active:shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-offset-sky-950 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? 'جارِ الحفظ...' : 'حفظ'}
                </button>
            </div>
        </form>
    );

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity duration-300">
            <div className="w-full h-full max-w-md bg-sky-950/90 text-white flex flex-col">
                <header className="flex items-center justify-between p-4 border-b border-sky-400/30 flex-shrink-0">
                    <h2 className="text-xl font-bold text-sky-200 text-shadow">
                        {isFormVisible ? (editingNotification ? 'تعديل الإشعار' : 'إشعار جديد') : 'الإشعارات'}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                        <XMarkIcon className="w-6 h-6"/>
                    </button>
                </header>
                <main className="flex-grow overflow-y-auto">
                    {isFormVisible ? FormComponent : ViewComponent}
                </main>
            </div>
            {notificationToDelete && <DeleteNotificationConfirmationModal onConfirm={handleDelete} onClose={() => setNotificationToDelete(null)} />}
        </div>
    );
};
