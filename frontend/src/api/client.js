// API client for SmartCamera backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Generic fetch wrapper with error handling
 */
async function fetchAPI(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

/**
 * Upload file (for voice commands)
 */
async function uploadFile(endpoint, file) {
    const url = `${API_BASE_URL}${endpoint}`;
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('File upload failed:', error);
        throw error;
    }
}

// ============= Places API =============

export async function getPlaces() {
    return fetchAPI('/places');
}

export async function createPlace(placeData) {
    return fetchAPI('/places', {
        method: 'POST',
        body: JSON.stringify(placeData),
    });
}

export async function deletePlace(id) {
    return fetchAPI(`/places/${id}`, {
        method: 'DELETE',
    });
}

// ============= Cameras API =============

export async function getCameras(placeId = null) {
    const endpoint = placeId ? `/cameras?placeId=${placeId}` : '/cameras';
    return fetchAPI(endpoint);
}

export async function createCamera(cameraData) {
    return fetchAPI('/cameras', {
        method: 'POST',
        body: JSON.stringify(cameraData),
    });
}

export async function deleteCamera(id) {
    return fetchAPI(`/cameras/${id}`, {
        method: 'DELETE',
    });
}

export async function updateCamera(id, updates) {
    return fetchAPI(`/cameras/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
    });
}

// ============= Voice API =============

export async function processVoiceCommand(audioBlob) {
    return uploadFile('/voice', audioBlob);
}

// ============= Health Check =============

export async function healthCheck() {
    return fetchAPI('/');
}
