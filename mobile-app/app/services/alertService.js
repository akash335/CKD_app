import api from './api';

export const getAlerts = async (patientId) => (await api.get(`/alerts/${patientId}`)).data;
