import api from './api';

export const addReading = async (patientId, payload) =>
    (await api.post(`/readings/${patientId}`, payload)).data;

export const getReadings = async (patientId) =>
    (await api.get(`/readings/${patientId}`)).data;

export const getLatestReading = async (patientId) =>
    (await api.get(`/readings/latest/${patientId}`)).data;

export const uploadReportImage = async (imageUri) => {
    const formData = new FormData();

    const filename = imageUri.split('/').pop() || 'report.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const ext = match?.[1]?.toLowerCase();

    let mimeType = 'image/jpeg';
    if (ext === 'png') mimeType = 'image/png';
    if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
    if (ext === 'webp') mimeType = 'image/webp';

    formData.append('file', {
        uri: imageUri,
        name: filename,
        type: mimeType,
    });

    const { data } = await api.post('/uploads/report-image', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });

    return data;
};

export const extractReportValues = async (reportImagePath) =>
    (
        await api.post('/uploads/report-extract', {
            report_image_path: reportImagePath,
        })
    ).data;