import api from './api';

export const getNotifications = async () =>
    (await api.get('/notifications')).data;

export const markNotificationRead = async (notificationId) =>
    (await api.put(`/notifications/${notificationId}/read`)).data;