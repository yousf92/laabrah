
import { TimeDifference } from './types';

export const getFirebaseErrorMessage = (errorCode: string): string => {
    switch (errorCode) {
        case 'auth/invalid-email':
            return 'البريد الإلكتروني غير صالح.';
        case 'auth/user-not-found':
            return 'لا يوجد حساب بهذا البريد الإلكتروني.';
        case 'auth/wrong-password':
            return 'كلمة المرور غير صحيحة.';
        case 'auth/email-already-in-use':
            return 'هذا البريد الإلكتروني مستخدم بالفعل.';
        case 'auth/weak-password':
            return 'كلمة المرور ضعيفة جدًا. يجب أن تكون 6 أحرف على الأقل.';
        case 'auth/requires-recent-login':
            return 'هذه العملية حساسة وتتطلب مصادقة حديثة. يرجى تسجيل الخروج ثم الدخول مرة أخرى والمحاولة مجدداً.';
        default:
            return 'حدث خطأ ما. يرجى المحاولة مرة أخرى.';
    }
};

export const formatDistanceToNow = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'الآن';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `قبل ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `قبل ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `قبل ${days} يوم`;
    const months = Math.floor(days / 30);
    if (months < 12) return `قبل ${months} شهر`;
    const years = Math.floor(months / 12);
    return `قبل ${years} سنة`;
};

export const getArabicUnitLabel = (count: number, unit: 'month' | 'day' | 'hour' | 'minute' | 'second'): string => {
    const units = {
        month: { single: 'شهر', dual: 'شهران', plural: 'أشهر' },
        day: { single: 'يوم', dual: 'يومان', plural: 'أيام' },
        hour: { single: 'ساعة', dual: 'ساعتان', plural: 'ساعات' },
        minute: { single: 'دقيقة', dual: 'دقيقتان', plural: 'دقائق' },
        second: { single: 'ثانية', dual: 'ثانيتان', plural: 'ثواني' },
    };

    const u = units[unit];

    if (count === 1) return u.single;
    if (count === 2) return u.dual;
    return u.plural;
};

export const calculateTimeDifference = (startDate: Date, now: Date): TimeDifference => {
    let s = new Date(startDate);
    let n = new Date(now);

    if (s > n) {
      return { months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    let yearsDiff = n.getFullYear() - s.getFullYear();
    let monthsDiff = n.getMonth() - s.getMonth();
    let daysDiff = n.getDate() - s.getDate();
    let hoursDiff = n.getHours() - s.getHours();
    let minutesDiff = n.getMinutes() - s.getMinutes();
    let secondsDiff = n.getSeconds() - s.getSeconds();

    if (secondsDiff < 0) { minutesDiff--; secondsDiff += 60; }
    if (minutesDiff < 0) { hoursDiff--; minutesDiff += 60; }
    if (hoursDiff < 0) { daysDiff--; hoursDiff += 24; }
    if (daysDiff < 0) { 
        monthsDiff--;
        const daysInLastMonth = new Date(n.getFullYear(), n.getMonth(), 0).getDate();
        daysDiff += daysInLastMonth; 
    }
    if (monthsDiff < 0) { yearsDiff--; monthsDiff += 12; }

    const totalMonths = yearsDiff * 12 + monthsDiff;

    return { months: totalMonths, days: daysDiff, hours: hoursDiff, minutes: minutesDiff, seconds: secondsDiff };
};
