import api from './api';

export const getLatestPrediction = async (patientId) => (await api.get(`/predictions/latest/${patientId}`)).data;
export const getPredictions = async (patientId) => (await api.get(`/predictions/${patientId}`)).data;
