const configuredBase = (import.meta.env.VITE_API_URL || '/api').trim()
const API_BASE = configuredBase.replace(/\/+$/, '')

async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
        ...options,
    });

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const payload = isJson ? await response.json() : null;

    if (!response.ok) {
        const error = new Error((payload && payload.detail) || `Request failed: ${response.status}`);
        error.status = response.status;
        throw error;
    }

    return payload;
}

export const authApi = {
    login: async (payload) => {
        return apiRequest('/auth/login/', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    signup: async (payload) => {
        return apiRequest('/auth/signup/', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    logout: async () => {
        return apiRequest('/auth/logout/', {
            method: 'POST',
            body: JSON.stringify({}),
        });
    },

    session: async () => {
        const data = await apiRequest('/auth/session/', { method: 'GET' });
        if (!data?.authenticated) {
            const err = new Error('Not logged in');
            err.status = 401;
            throw err;
        }
        return { user: data.user };
    },
};

export const leadApi = {
    list: async () => {
        return apiRequest('/leads/', { method: 'GET' });
    },

    create: async (payload) => {
        return apiRequest('/leads/', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    update: async (leadId, payload) => {
        return apiRequest(`/leads/${leadId}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },

    listNotes: async (leadId) => {
        return apiRequest(`/leads/${leadId}/notes/list/`, { method: 'GET' });
    },

    addNote: async (leadId, payload) => {
        return apiRequest(`/leads/${leadId}/notes/`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    listReminders: async (leadId) => {
        return apiRequest(`/leads/${leadId}/reminders/`, { method: 'GET' });
    },

    createReminder: async (leadId, payload) => {
        return apiRequest(`/leads/${leadId}/reminders/`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    updateReminder: async (reminderId, payload) => {
        return apiRequest(`/reminders/${reminderId}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
    },

    dashboard: async () => {
        return apiRequest('/dashboard/', { method: 'GET' });
    },
};

export const aiApi = {
    overview: async () => {
        return apiRequest('/ai/insights/', { method: 'GET' });
    },

    chat: async (prompt) => {
        return apiRequest('/ai/chat/', {
            method: 'POST',
            body: JSON.stringify({ prompt }),
        });
    },
};
