import api from './api';

export const getTeleconsultationsForPatient = async (patientId) =>
  (await api.get(`/teleconsultations/patient/${patientId}`)).data;

export const getTeleconsultationsForDoctor = async (doctorId) =>
  (await api.get(`/teleconsultations/doctor/${doctorId}`)).data;

export const createTeleconsultation = async (payload) =>
  (await api.post('/teleconsultations', payload)).data;
