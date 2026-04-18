import { initializeApp } from 'firebase/app'
import {
    createUserWithEmailAndPassword,
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
} from 'firebase/auth'
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    getFirestore,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore'

const configuredBase = (import.meta.env.VITE_API_URL || '/api').trim()
const API_BASE = configuredBase.replace(/\/+$/, '')

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const hasFirebaseConfig = Boolean(
    firebaseConfig.apiKey
    && firebaseConfig.authDomain
    && firebaseConfig.projectId
    && firebaseConfig.appId,
)

const useFirebaseDirect =
    (String(import.meta.env.VITE_USE_FIREBASE || '').toLowerCase() === 'true' && hasFirebaseConfig)
    || (hasFirebaseConfig && String(import.meta.env.VITE_USE_FIREBASE || '').toLowerCase() !== 'false')

const firebaseApp = useFirebaseDirect ? initializeApp(firebaseConfig) : null
const firebaseAuth = useFirebaseDirect ? getAuth(firebaseApp) : null
const firebaseDb = useFirebaseDirect ? getFirestore(firebaseApp) : null

const fallbackEmailDomain = (import.meta.env.VITE_FIREBASE_FALLBACK_EMAIL_DOMAIN || 'smartcrm.local').trim()

function normalizeEmail(identity) {
    const value = String(identity || '').trim()
    if (!value) return ''
    if (value.includes('@')) return value
    return `${value}@${fallbackEmailDomain}`
}

function displayNameFromUser(user) {
    return user?.displayName || user?.email?.split('@')[0] || 'user'
}

function mapLeadDoc(snapshot) {
    const data = snapshot.data() || {}
    const mapped = {
        id: snapshot.id,
        company_name: data.company_name || data.company || '',
        contact_name: data.contact_name || data.name || '',
        contact_email: data.contact_email || data.email || '',
        contact_phone: data.contact_phone || data.phone || '',
        source: data.source || 'Unknown',
        stage: data.stage || data.status || 'new',
        estimated_value: Number(data.estimated_value ?? data.value ?? 0),
        assigned_to: data.assigned_to || '',
        last_touch: data.last_touch || '',
        notes: data.notes || '',
        owner_uid: data.owner_uid || '',
        created_at: data.createdAt?.toDate?.()?.toISOString?.() || null,
    }
    if (!mapped.company_name) {
        console.warn('Lead missing company_name; raw data:', data)
    }
    return mapped
}

function leadWritePayload(payload, currentUser) {
    const stage = payload.stage || payload.status || 'new'
    const value = Number(payload.estimated_value ?? payload.value ?? 0)
    return {
        company_name: payload.company_name || payload.company || '',
        company: payload.company || payload.company_name || '',
        contact_name: payload.contact_name || payload.name || '',
        name: payload.name || payload.contact_name || '',
        contact_email: payload.contact_email || payload.email || '',
        email: payload.email || payload.contact_email || '',
        contact_phone: payload.contact_phone || payload.phone || '',
        phone: payload.phone || payload.contact_phone || '',
        source: payload.source || 'Unknown',
        stage,
        status: stage,
        estimated_value: value,
        value,
        assigned_to: payload.assigned_to || '',
        last_touch: payload.last_touch || '',
        notes: payload.notes || '',
        owner_uid: currentUser?.uid || '',
        updatedAt: serverTimestamp(),
    }
}

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

async function withFallback(primaryFn, fallbackFn) {
    try {
        return await primaryFn()
    } catch (error) {
        if (!fallbackFn) {
            throw error
        }
        console.warn('Primary data provider failed, falling back to backend API.', error)
        return fallbackFn()
    }
}

const backendAuthApi = {
    login: async (payload) => {
        return apiRequest('/auth/login/', {
            method: 'POST',
            body: JSON.stringify(payload),
        })
    },

    signup: async (payload) => {
        return apiRequest('/auth/signup/', {
            method: 'POST',
            body: JSON.stringify(payload),
        })
    },

    logout: async () => {
        return apiRequest('/auth/logout/', {
            method: 'POST',
            body: JSON.stringify({}),
        })
    },

    session: async () => {
        const data = await apiRequest('/auth/session/', { method: 'GET' })
        if (!data?.authenticated) {
            const err = new Error('Not logged in')
            err.status = 401
            throw err
        }
        return { user: data.user }
    },
}

const backendLeadApi = {
    list: async () => {
        return apiRequest('/leads/', { method: 'GET' })
    },

    create: async (payload) => {
        return apiRequest('/leads/', {
            method: 'POST',
            body: JSON.stringify(payload),
        })
    },

    update: async (leadId, payload) => {
        return apiRequest(`/leads/${leadId}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        })
    },

    listNotes: async (leadId) => {
        return apiRequest(`/leads/${leadId}/notes/list/`, { method: 'GET' })
    },

    addNote: async (leadId, payload) => {
        return apiRequest(`/leads/${leadId}/notes/`, {
            method: 'POST',
            body: JSON.stringify(payload),
        })
    },

    listReminders: async (leadId) => {
        return apiRequest(`/leads/${leadId}/reminders/`, { method: 'GET' })
    },

    createReminder: async (leadId, payload) => {
        return apiRequest(`/leads/${leadId}/reminders/`, {
            method: 'POST',
            body: JSON.stringify(payload),
        })
    },

    updateReminder: async (reminderId, payload) => {
        return apiRequest(`/reminders/${reminderId}/`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
        })
    },

    dashboard: async () => {
        return apiRequest('/dashboard/', { method: 'GET' })
    },
}

const backendAiApi = {
    overview: async () => {
        return apiRequest('/ai/insights/', { method: 'GET' })
    },

    chat: async (prompt) => {
        return apiRequest('/ai/chat/', {
            method: 'POST',
            body: JSON.stringify({ prompt }),
        })
    },
}

export const authApi = {
    login: async (payload) => {
        if (!useFirebaseDirect) {
            return backendAuthApi.login(payload)
        }

        return withFallback(
            async () => {
                const email = normalizeEmail(payload.username)
                if (!email || !payload.password) {
                    throw new Error('Email/username and password are required')
                }
                const credential = await signInWithEmailAndPassword(firebaseAuth, email, payload.password)
                return {
                    user: {
                        id: credential.user.uid,
                        username: displayNameFromUser(credential.user),
                        email: credential.user.email,
                    },
                }
            },
            () => backendAuthApi.login(payload),
        )
    },

    signup: async (payload) => {
        if (!useFirebaseDirect) {
            return backendAuthApi.signup(payload)
        }

        return withFallback(
            async () => {
                const email = normalizeEmail(payload.username)
                if (!email || !payload.password) {
                    throw new Error('Email/username and password are required')
                }
                if (payload.password !== payload.confirm_password) {
                    throw new Error('Passwords do not match')
                }
                const credential = await createUserWithEmailAndPassword(firebaseAuth, email, payload.password)
                const profileName = String(payload.username || '').trim()
                if (profileName) {
                    await updateProfile(credential.user, { displayName: profileName })
                }
                return {
                    user: {
                        id: credential.user.uid,
                        username: profileName || displayNameFromUser(credential.user),
                        email: credential.user.email,
                    },
                }
            },
            () => backendAuthApi.signup(payload),
        )
    },

    logout: async () => {
        if (!useFirebaseDirect) {
            return backendAuthApi.logout()
        }

        return withFallback(
            async () => {
                await signOut(firebaseAuth)
                return { ok: true }
            },
            () => backendAuthApi.logout(),
        )
    },

    session: async () => {
        if (!useFirebaseDirect) {
            return backendAuthApi.session()
        }

        return withFallback(
            async () => {
                const user = firebaseAuth.currentUser
                if (!user) {
                    const err = new Error('Not logged in')
                    err.status = 401
                    throw err
                }
                return {
                    user: {
                        id: user.uid,
                        username: displayNameFromUser(user),
                        email: user.email,
                    },
                }
            },
            () => backendAuthApi.session(),
        )
    },
}

export const leadApi = {
    list: async () => {
        if (!useFirebaseDirect) {
            return backendLeadApi.list()
        }

        return withFallback(
            async () => {
                const snapshots = await getDocs(collection(firebaseDb, 'leads'))
                const items = snapshots.docs.map(mapLeadDoc)
                return { items }
            },
            () => backendLeadApi.list(),
        )
    },

    create: async (payload) => {
        if (!useFirebaseDirect) {
            return backendLeadApi.create(payload)
        }

        return withFallback(
            async () => {
                const currentUser = firebaseAuth.currentUser
                const docRef = await addDoc(collection(firebaseDb, 'leads'), {
                    ...leadWritePayload(payload, currentUser),
                    createdAt: serverTimestamp(),
                })
                return { id: docRef.id }
            },
            () => backendLeadApi.create(payload),
        )
    },

    update: async (leadId, payload) => {
        if (!useFirebaseDirect) {
            return backendLeadApi.update(leadId, payload)
        }

        return withFallback(
            async () => {
                await updateDoc(doc(firebaseDb, 'leads', String(leadId)), {
                    ...leadWritePayload(payload, firebaseAuth.currentUser),
                })
                return { ok: true }
            },
            () => backendLeadApi.update(leadId, payload),
        )
    },

    listNotes: async (leadId) => {
        if (!useFirebaseDirect) {
            return backendLeadApi.listNotes(leadId)
        }

        return withFallback(
            async () => {
                const snapshots = await getDocs(collection(firebaseDb, 'leads', String(leadId), 'notes'))
                const items = snapshots.docs.map((snapshot) => ({
                    id: snapshot.id,
                    ...snapshot.data(),
                }))
                return { items }
            },
            () => backendLeadApi.listNotes(leadId),
        )
    },

    addNote: async (leadId, payload) => {
        if (!useFirebaseDirect) {
            return backendLeadApi.addNote(leadId, payload)
        }

        return withFallback(
            async () => {
                const docRef = await addDoc(collection(firebaseDb, 'leads', String(leadId), 'notes'), {
                    channel: payload.channel || 'note',
                    note: payload.note || '',
                    created_at: new Date().toISOString(),
                    createdAt: serverTimestamp(),
                })
                return { id: docRef.id }
            },
            () => backendLeadApi.addNote(leadId, payload),
        )
    },

    listReminders: async (leadId) => {
        if (!useFirebaseDirect) {
            return backendLeadApi.listReminders(leadId)
        }

        return withFallback(
            async () => {
                const snapshots = await getDocs(collection(firebaseDb, 'leads', String(leadId), 'reminders'))
                const items = snapshots.docs.map((snapshot) => ({
                    id: snapshot.id,
                    ...snapshot.data(),
                }))
                return { items }
            },
            () => backendLeadApi.listReminders(leadId),
        )
    },

    createReminder: async (leadId, payload) => {
        if (!useFirebaseDirect) {
            return backendLeadApi.createReminder(leadId, payload)
        }

        return withFallback(
            async () => {
                const docRef = await addDoc(collection(firebaseDb, 'leads', String(leadId), 'reminders'), {
                    task: payload.task || '',
                    due_at: payload.due_at || null,
                    is_done: false,
                    createdAt: serverTimestamp(),
                })
                return { id: docRef.id }
            },
            () => backendLeadApi.createReminder(leadId, payload),
        )
    },

    updateReminder: async (reminderId, payload) => {
        if (!useFirebaseDirect) {
            return backendLeadApi.updateReminder(reminderId, payload)
        }

        return withFallback(
            async () => {
                const leadSnapshots = await getDocs(collection(firebaseDb, 'leads'))
                for (const leadSnapshot of leadSnapshots.docs) {
                    const reminderRef = doc(firebaseDb, 'leads', leadSnapshot.id, 'reminders', String(reminderId))
                    try {
                        await updateDoc(reminderRef, payload)
                        return { ok: true }
                    } catch {
                        // Try next lead if reminder doc is not under this lead.
                    }
                }
                throw new Error('Reminder not found')
            },
            () => backendLeadApi.updateReminder(reminderId, payload),
        )
    },

    dashboard: async () => {
        if (!useFirebaseDirect) {
            return backendLeadApi.dashboard()
        }

        return withFallback(
            async () => {
                const leadResponse = await leadApi.list()
                const leads = leadResponse.items || []
                const totalValue = leads.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0)
                const wonValue = leads
                    .filter((lead) => lead.stage === 'won')
                    .reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0)
                const conversionRate = leads.length
                    ? Math.round((leads.filter((lead) => lead.stage === 'won').length / leads.length) * 100)
                    : 0

                return {
                    metrics: {
                        total_value: totalValue,
                        won_value: wonValue,
                        conversion_rate: conversionRate,
                    },
                }
            },
            () => backendLeadApi.dashboard(),
        )
    },
}

export const aiApi = {
    overview: async () => {
        if (!useFirebaseDirect) {
            return backendAiApi.overview()
        }

        return withFallback(
            async () => {
                const response = await leadApi.list()
                const leads = response.items || []
                const pipelineValue = leads.reduce((sum, lead) => sum + Number(lead.estimated_value || 0), 0)
                const expectedRevenue = Math.round(pipelineValue * 0.3)
                return {
                    summary: {
                        lead_count: leads.length,
                        average_win_probability: leads.length ? 30 : 0,
                        expected_revenue: expectedRevenue,
                        forecast_gap: Math.max(0, pipelineValue - expectedRevenue),
                        pipeline_value: pipelineValue,
                    },
                    all: [],
                }
            },
            () => backendAiApi.overview(),
        )
    },

    chat: async (prompt) => {
        return withFallback(
            async () => backendAiApi.chat(prompt),
            async () => ({
                reply:
                    'AI backend is currently unavailable. Your Firebase data is working; connect a hosted LLM endpoint to enable Ask AI.',
            }),
        )
    },
}

export const providerInfo = {
    useFirebaseDirect,
}
