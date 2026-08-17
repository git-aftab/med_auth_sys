const API_BASE = import.meta.env.VITE_API_URL || '';

/**
 * Common fetch helper with JSON parsing and error handling
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.detail || `HTTP Error ${response.status}: ${response.statusText}`);
      error.status = response.status;
      error.data = errorData;
      throw error;
    }
    return await response.json();
  } catch (err) {
    console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Patients
  getPatients: () => request('/api/patients'),
  getPatientByRfid: (rfidUid) => request(`/api/patients/${encodeURIComponent(rfidUid)}`),
  getPatientPrescription: (rfidUid) => request(`/api/patients/${encodeURIComponent(rfidUid)}/prescription`),

  // Medications
  getMedications: () => request('/api/medications'),
  getMedicationById: (id) => request(`/api/medications/${id}`),

  // Verifications
  getVerifications: (limit = 50) => request(`/api/verifications?limit=${limit}`),
  submitVerification: (data) => request('/api/verifications', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // System Health
  getHealth: () => request('/health'),
};

export default api;
