import React from 'react';
import { UserProfile } from './types';
import { DEVELOPER_UIDS } from './constants';
import { PinIcon, ReplyIcon, CopyIcon, PencilIcon, TrashIcon, PaperAirplaneIcon, UserMinusIcon, UserPlusIcon, ShieldExclamationIcon, SpeakerXMarkIcon } from './icons';

export const MessageActionModal: React.FC<{
    onClose: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onPin?: () => void;
    onCopy: () => void;
    onReply: () => void;
    isPinned: boolean;
    canPin: boolean;
    canEdit: boolean;
    canDelete: boolean;
}> = ({ onClose, onEdit, onDelete, onPin, onCopy, onReply, isPinned, canPin, canEdit, canDelete }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
        <div className="w-full max-w-sm bg-sky-950/90 border border-sky-500/50 rounded-lg p-6 space-y-4 text-white" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-sky-300 text-center">إجراءات الرسالة</h3>
            <div className="flex flex-col gap-4 pt-4">
                 <button onClick={onReply} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-sky-800/50 hover:bg-sky-700/70">
                    <ReplyIcon className="w-6 h-6 text-sky-300"/>
                    <span>رد</span>
                </button>
                <button onClick={onCopy} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-sky-800/50 hover:bg-sky-700/70">
                    <CopyIcon className="w-6 h-6 text-sky-300"/>
                    <span>نسخ النص</span>
                </button>
                {canPin && onPin && (
                    <button onClick={onPin} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-sky-800/50 hover:bg-sky-700/70">
                        <PinIcon className="w-6 h-6 text-teal-300"/>
                        <span>{isPinned ? 'إلغاء تثبيت الرسالة' : 'تثبيت الرسالة'}</span>
                    </button>
                )}
                {canEdit && onEdit && (
                    <button onClick={onEdit} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-sky-800/50 hover:bg-sky-700/70">
                        <PencilIcon className="w-6 h-6 text-yellow-300"/>
                        <span>تعديل</span>
                    </button>
                )}
                {canDelete && onDelete && (
                    <button onClick={onDelete} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-red-800/50 hover:bg-red-700/70">
                        <TrashIcon className="w-6 h-6 text-red-400"/>
                        <span className="text-red-400">حذف</span>
                    </button>
                )}
            </div>
        </div>
    </div>
);

export const UserActionModal: React.FC<{
    userProfile: UserProfile;
    onClose: () => void;
    onStartPrivateChat: () => void;
    onBlockUser: () => void;
    onUnblockUser: () => void;
    isBlocked: boolean;
    isCurrentUserAdmin: boolean;
    isCurrentUserDeveloper: boolean;
    currentUserUid: string;
    onToggleAdmin: () => void;
    onToggleMute: () => void;
    onToggleBan: () => void;
    isBanned: boolean;
}> = ({ userProfile, onClose, onStartPrivateChat, onBlockUser, onUnblockUser, isBlocked, isCurrentUserAdmin, isCurrentUserDeveloper, currentUserUid, onToggleAdmin, onToggleMute, onToggleBan, isBanned }) => {
    const canTakeAdminAction = isCurrentUserAdmin && userProfile.uid !== currentUserUid && !DEVELOPER_UIDS.includes(userProfile.uid);
    return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={onClose}>
        <div className="w-full max-w-sm bg-sky-950/90 border border-sky-500/50 rounded-lg p-6 space-y-4 text-white" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-sky-300 text-center truncate">خيارات لـ {userProfile.displayName}</h3>
            <div className="flex flex-col gap-4 pt-4">
                <button onClick={onStartPrivateChat} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-sky-800/50 hover:bg-sky-700/70">
                    <PaperAirplaneIcon className="w-6 h-6 text-sky-300"/>
                    <span>إرسال رسالة خاصة</span>
                </button>
                 {!isBlocked ? (
                    <button onClick={onBlockUser} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-red-800/50 hover:bg-red-700/70">
                        <UserMinusIcon className="w-6 h-6 text-red-400"/>
                        <span className="text-red-400">حظر المستخدم</span>
                    </button>
                ) : (
                     <button onClick={onUnblockUser} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-green-800/50 hover:bg-green-700/70">
                        <UserPlusIcon className="w-6 h-6 text-green-400"/>
                        <span className="text-green-400">إلغاء حظر المستخدم</span>
                    </button>
                )}
                 {canTakeAdminAction && (
                    <>
                        <div className="border-t border-sky-600/50 my-2"></div>
                        <h4 className="text-center text-sky-400 text-sm">إجراءات المشرف</h4>
                        {isCurrentUserDeveloper && (
                            <button onClick={onToggleAdmin} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-sky-800/50 hover:bg-sky-700/70">
                                <ShieldExclamationIcon className="w-6 h-6 text-yellow-300"/>
                                <span>{userProfile.isAdmin ? 'تخفيض من الإشراف' : 'ترقية لمشرف'}</span>
                            </button>
                        )}
                        <button onClick={onToggleMute} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-sky-800/50 hover:bg-sky-700/70">
                           {userProfile.isMuted ? <UserPlusIcon className="w-6 h-6 text-green-400"/> : <SpeakerXMarkIcon className="w-6 h-6 text-orange-400"/> }
                           <span>{userProfile.isMuted ? 'إلغاء الكتم' : 'كتم المستخدم'}</span>
                        </button>
                        <button onClick={onToggleBan} className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg transition-colors bg-red-800/50 hover:bg-red-700/70">
                            {isBanned ? <UserPlusIcon className="w-6 h-6 text-green-400"/> : <UserMinusIcon className="w-6 h-6 text-red-400"/> }
                            <span className={isBanned ? 'text-green-400' : 'text-red-400'}>{isBanned ? 'إعادة المستخدم' : 'طرد المستخدم'}</span>
                        </button>
                    </>
                 )}
            </div>
        </div>
    </div>
)};

export const DeleteMessageConfirmationModal: React.FC<{ onConfirm: () => void; onClose: () => void; }> = ({ onConfirm, onClose }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
        <div className="w-full max-w-sm bg-sky-950 border border-red-500/50 rounded-lg p-6 space-y-4 text-white">
            <h3 className="text-xl font-bold text-red-400 text-center">تأكيد حذف الرسالة</h3>
            <p className="text-sky-200 text-center">هل أنت متأكد من رغبتك في حذف هذه الرسالة بشكل دائم؟</p>
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

export const DeleteConversationConfirmationModal: React.FC<{ onConfirm: () => void; onClose: () => void; }> = ({ onConfirm, onClose }) => (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
        <div className="w-full max-w-sm bg-sky-950 border border-red-500/50 rounded-lg p-6 space-y-4 text-white">
            <h3 className="text-xl font-bold text-red-400 text-center">تأكيد حذف المحادثة</h3>
            <p className="text-sky-200 text-center">هل أنت متأكد من رغبتك في حذف هذه المحادثة من قائمتك؟</p>
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
