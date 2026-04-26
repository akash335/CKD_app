import api from './api';

export const getNotifications = async () =>
    (await api.get('/notifications')).data;

export const markNotificationRead = async (notificationId) =>
    (await api.put(`/notifications/${notificationId}/read`)).data;

export const getUnreadNotificationCount = async () => {
    const data = await getNotifications();
    return Array.isArray(data) ? data.filter((item) => !item.is_read).length : 0;
};