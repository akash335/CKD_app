import api from './api';

export const getTeleconsultationsForPatient = async (patientId) =>
  (await api.get(`/teleconsultations/patient/${patientId}`)).data;

export const getTeleconsultationsForDoctor = async (doctorId) =>
  (await api.get(`/teleconsultations/doctor/${doctorId}`)).data;

export const getRecentTeleconsultationHistory = async () =>
  (await api.get('/teleconsultations/history/recent')).data;

export const getPastTeleconsultationHistory = async () =>
  (await api.get('/teleconsultations/history/past')).data;

export const archiveRecentTeleconsultationHistory = async () =>
  (await api.put('/teleconsultations/history/archive')).data;

export const createTeleconsultation = async (payload) =>
  (await api.post('/teleconsultations', payload)).data;

// Old name kept so old screens don't crash
export const clearTeleconsultationHistory = archiveRecentTeleconsultationHistory;