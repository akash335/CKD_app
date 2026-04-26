import api from './api';

export const createPatientProfile = async (payload) =>
    (await api.post('/patients', payload)).data;

export const getMyPatientProfile = async () =>
    (await api.get('/patients/me')).data;

export const listPatients = async () =>
    (await api.get('/patients')).data;

export const getPatientById = async (patientId) =>
    (await api.get(`/patients/${patientId}`)).data;

export const listRecentOverviewPatients = async () =>
    (await api.get('/patients/overview/recent')).data;

export const listPastOverviewPatients = async () =>
    (await api.get('/patients/overview/past')).data;

export const archiveRecentPatientOverview = async () =>
    (await api.put('/patients/overview/archive')).data;

// Backward-compatible aliases used by earlier screens
export const createPatient = createPatientProfile;
export const getMyPatient = getMyPatientProfile;
export const getPatient = getPatientById;