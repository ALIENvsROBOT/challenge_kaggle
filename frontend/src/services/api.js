/**
 * API Service for MedGemma Bridge
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const handleResponse = async (response) => {
    if (!response.ok) {
        let errorMsg = `Server Error (${response.status})`;
        try {
            const errorData = await response.json();
            if (errorData.detail) {
                errorMsg = typeof errorData.detail === 'string' 
                    ? errorData.detail 
                    : JSON.stringify(errorData.detail);
            }
        } catch {
            const text = await response.text();
            if (text) errorMsg += `: ${text}`;
        }
        throw new Error(errorMsg);
    }
    return await response.json();
};

/**
 * Ingest multiple medical records (images or PDFs)
 * @param {string} patientId 
 * @param {Array<File>} files 
 * @param {string} apiKey 
 * @returns {Promise<Object>}
 */
export const ingestMedicalRecord = async (patientId, files, apiKey) => {
    const formData = new FormData();
    formData.append('patient_id', patientId);
    
    // Multi-file support: append all files to the 'files' field
    files.forEach(file => {
        formData.append('files', file);
    });

    try {
        const response = await fetch(`${API_URL}/api/v1/ingest`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            },
            body: formData
        });

        return await handleResponse(response);
    } catch (error) {
        console.error("Ingest failed:", error);
        throw error;
    }
};

/**
 * Fetch recent submissions from the backend
 * @param {string} apiKey 
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
export const fetchSubmissions = async (apiKey, limit = 15) => {
    try {
        const response = await fetch(`${API_URL}/api/v1/submissions?limit=${limit}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        return await handleResponse(response);
    } catch (error) {
        console.error("Fetch submissions failed:", error);
        throw error;
    }
};

/**
 * Rerun MedGemma pipeline for an existing submission
 * @param {string} submissionId 
 * @param {string} apiKey 
 * @returns {Promise<Object>}
 */
export const rerunMedGemma = async (submissionId, apiKey) => {
    try {
        const response = await fetch(`${API_URL}/api/v1/rerun/${submissionId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`
            }
        });

        return await handleResponse(response);
    } catch (error) {
        console.error("Rerun failed:", error);
        throw error;
    }
};

/**
 * Get stored API keys from localStorage (Helper)
 */
/**
 * Fetch patient directory
 */
export const fetchPatients = async (apiKey) => {
    try {
        const response = await fetch(`${API_URL}/api/v1/patients`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        return await handleResponse(response);
    } catch (error) {
        console.error("Fetch patients failed:", error);
        throw error;
    }
};

/**
 * Fetch history for a specific patient
 */
export const fetchPatientHistory = async (patientId, apiKey) => {
    try {
        const response = await fetch(`${API_URL}/api/v1/patients/${patientId}/history`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        return await handleResponse(response);
    } catch (error) {
        console.error("Fetch patient history failed:", error);
        throw error;
    }
};

export const getStoredApiKeys = () => {
    try {
        const stored = localStorage.getItem('medgemma_api_keys');
        return stored ? JSON.parse(stored) : [];
    } catch (e) {
        console.error("Error parsing API keys from localStorage", e);
        return [];
    }
};

/**
 * Save API keys to localStorage (Helper)
 */
export const saveApiKeys = (keys) => {
    localStorage.setItem('medgemma_api_keys', JSON.stringify(keys));
};

/**
 * Safe ID generator
 */
export const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15);
};

/**
 * Safe Key generator
 */
export const generateKey = (length = 24) => {
    const chars = 'abcdef0123456789';
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const bytes = new Uint8Array(length);
        crypto.getRandomValues(bytes);
        return Array.from(bytes).map(b => chars[b % chars.length]).join('');
    }
    return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

/**
 * Auto-provision a new API key if none exists
 */
export const autoProvisionApiKey = () => {
    const keys = getStoredApiKeys();
    if (keys.length === 0) {
        const newKey = {
            id: generateId(),
            name: 'Auto-Generated Demo Key',
            key: 'sk-' + generateKey(48),
            created: new Date().toISOString(),
            role: 'Internal'
        };
        saveApiKeys([newKey]);
        return newKey;
    }
    return keys[0];

};
