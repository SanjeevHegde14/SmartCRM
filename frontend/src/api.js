import { initializeApp } from 'firebase/app'
import {
    createUserWithEmailAndPassword,
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
} from 'firebase/auth'
import {
    addDoc,
    collection,
    doc,
    getFirestore,
    onSnapshot,
    query,
    serverTimestamp,
    updateDoc,
    where,
    getDocs,
} from 'firebase/firestore'

// ── Firebase init ─────────────────────────────────────────────────────────
const firebaseConfig = {
    apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId:             import.meta.env.VITE_FIREBASE_APP_ID,
}

const firebaseApp  = initializeApp(firebaseConfig)
export const firebaseAuth = getAuth(firebaseApp)
export const firebaseDb   = getFirestore(firebaseApp)

// ── AI endpoint (Hugging Face Space) ─────────────────────────────────────
const AI_BASE = 'https://crmlead-crmllm.hf.space'

// ── Helpers ───────────────────────────────────────────────────────────────
function normalizeEmail(identity) {
    const value = String(identity || '').trim()
    if (!value) return ''
    if (value.includes('@')) return value
    return `${value}@smartcrm.app`
}

function displayNameFromUser(user) {
    return user?.displayName || user?.email?.split('@')[0] || 'user'
}

function mapLeadDoc(snapshot) {
    const data = snapshot.data() || {}
    return {
        id:              snapshot.id,
        company_name:    data.company_name  || data.company       || '',
        contact_name:    data.contact_name  || data.name          || '',
        contact_email:   data.contact_email || data.email         || '',
        contact_phone:   data.contact_phone || data.phone         || '',
        source:          data.source        || 'Unknown',
        stage:           data.stage         || data.status        || 'new',
        estimated_value: Number(data.estimated_value ?? data.value ?? 0),
        assigned_to:     data.assigned_to   || '',
        last_touch:      data.last_touch    || '',
        notes:           data.notes         || '',
        owner_uid:       data.owner_uid     || '',
        created_at:      data.createdAt?.toDate?.()?.toISOString?.() || null,
    }
}

function leadWritePayload(payload, currentUser) {
    const stage = payload.stage || payload.status || 'new'
    const value = Number(payload.estimated_value ?? payload.value ?? 0)
    return {
        company_name:    payload.company_name   || payload.company      || '',
        company:         payload.company        || payload.company_name  || '',
        contact_name:    payload.contact_name   || payload.name         || '',
        name:            payload.name           || payload.contact_name  || '',
        contact_email:   payload.contact_email  || payload.email        || '',
        email:           payload.email          || payload.contact_email || '',
        contact_phone:   payload.contact_phone  || payload.phone        || '',
        phone:           payload.phone          || payload.contact_phone || '',
        source:          payload.source         || 'Unknown',
        stage,
        status:          stage,
        estimated_value: value,
        value,
        assigned_to:     payload.assigned_to    || '',
        last_touch:      payload.last_touch     || '',
        notes:           payload.notes          || '',
        owner_uid:       currentUser?.uid       || '',
        updatedAt:       serverTimestamp(),
    }
}

// ── Auth API ──────────────────────────────────────────────────────────────
export const authApi = {
    /** Subscribe to auth state changes. Returns unsubscribe fn. */
    onAuthChange(callback) {
        return onAuthStateChanged(firebaseAuth, callback)
    },

    async signIn(payload) {
        // The sign-in form now sends email directly
        const email = String(payload.email || payload.username || '').trim()
        if (!email) throw new Error('Email is required.')
        if (!payload.password) throw new Error('Password is required.')
        // Normalise: if user typed without @, append domain
        const normalizedEmail = email.includes('@') ? email : `${email}@smartcrm.app`
        const credential = await signInWithEmailAndPassword(firebaseAuth, normalizedEmail, payload.password)
        return {
            user: {
                id:       credential.user.uid,
                username: displayNameFromUser(credential.user),
                email:    credential.user.email,
            },
        }
    },

    async signUp(payload) {
        const email = payload.email || normalizeEmail(payload.username || '')
        if (!email || !payload.password) throw new Error('Email and password are required.')
        if (payload.password !== payload.confirm_password) throw new Error('Passwords do not match.')
        const credential = await createUserWithEmailAndPassword(firebaseAuth, email, payload.password)
        const displayName = String(payload.username || '').trim()
        if (displayName) await updateProfile(credential.user, { displayName })
        return {
            user: {
                id:       credential.user.uid,
                username: displayName || displayNameFromUser(credential.user),
                email:    credential.user.email,
            },
        }
    },

    async signOut() {
        await signOut(firebaseAuth)
    },

    currentUser() {
        const u = firebaseAuth.currentUser
        if (!u) return null
        return { id: u.uid, username: displayNameFromUser(u), email: u.email }
    },
}

// ── Lead API ──────────────────────────────────────────────────────────────
export const leadApi = {
    /**
     * Real-time listener for the current user's leads.
     * Calls `callback(leads[])` on every change.
     * Returns an unsubscribe function.
     */
    subscribe(callback) {
        const uid = firebaseAuth.currentUser?.uid
        if (!uid) {
            callback([])
            return () => {}
        }
        const q = query(
            collection(firebaseDb, 'leads'),
            where('owner_uid', '==', uid),
        )
        return onSnapshot(q, (snapshots) => {
            callback(snapshots.docs.map(mapLeadDoc))
        })
    },

    async create(payload) {
        const currentUser = firebaseAuth.currentUser
        if (!currentUser) throw new Error('Not authenticated.')
        const ref = await addDoc(collection(firebaseDb, 'leads'), {
            ...leadWritePayload(payload, currentUser),
            createdAt: serverTimestamp(),
        })
        return { id: ref.id }
    },

    async update(leadId, payload) {
        const currentUser = firebaseAuth.currentUser
        if (!currentUser) throw new Error('Not authenticated.')
        await updateDoc(doc(firebaseDb, 'leads', String(leadId)), {
            ...leadWritePayload(payload, currentUser),
        })
        return { ok: true }
    },

    // ── Notes sub-collection ────────────────────────────────────────────
    subscribeNotes(leadId, callback) {
        if (!leadId) { callback([]); return () => {} }
        return onSnapshot(
            collection(firebaseDb, 'leads', String(leadId), 'notes'),
            (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        )
    },

    async addNote(leadId, payload) {
        if (!firebaseAuth.currentUser) throw new Error('Not authenticated.')
        const ref = await addDoc(collection(firebaseDb, 'leads', String(leadId), 'notes'), {
            channel:    payload.channel    || 'note',
            note:       payload.note       || '',
            created_at: new Date().toISOString(),
            createdAt:  serverTimestamp(),
        })
        return { id: ref.id }
    },

    // ── Reminders sub-collection ────────────────────────────────────────
    subscribeReminders(leadId, callback) {
        if (!leadId) { callback([]); return () => {} }
        return onSnapshot(
            collection(firebaseDb, 'leads', String(leadId), 'reminders'),
            (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        )
    },

    async createReminder(leadId, payload) {
        if (!firebaseAuth.currentUser) throw new Error('Not authenticated.')
        const ref = await addDoc(collection(firebaseDb, 'leads', String(leadId), 'reminders'), {
            task:      payload.task   || '',
            due_at:    payload.due_at || null,
            is_done:   false,
            createdAt: serverTimestamp(),
        })
        return { id: ref.id }
    },

    async updateReminder(leadId, reminderId, payload) {
        if (!firebaseAuth.currentUser) throw new Error('Not authenticated.')
        await updateDoc(
            doc(firebaseDb, 'leads', String(leadId), 'reminders', String(reminderId)),
            payload,
        )
        return { ok: true }
    },
}

// ── AI API (Hugging Face Space) ───────────────────────────────────────────
export const aiApi = {
    async chat(prompt, leadsContext = []) {
        // Build a concise context string from the user's current leads
        const ctx = leadsContext.length
            ? `\n\nCurrent pipeline summary (${leadsContext.length} leads):\n` +
              leadsContext.map((l) =>
                  `- ${l.company_name} | Stage: ${l.stage} | Value: ₹${l.estimated_value} | Source: ${l.source}`
              ).join('\n')
            : ''

        const fullPrompt = prompt + ctx

        const response = await fetch(`${AI_BASE}/generate`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ 
                user_prompt: fullPrompt,
                system_prompt: 'You are a highly capable AI assistant built for a CRM. Provide all responses in strictly well-formatted Markdown. DO NOT use markdown tables under any circumstances. Present data rows logically using bullet points or numbered lists ONLY. Ensure proper spacing, bold headings, and easily readable indentation.',
                max_new_tokens: 512,
                temperature: 0.2,
                top_p: 0.95,
                repetition_penalty: 1.05
            }),
        })

        if (!response.ok) {
            const err = await response.text().catch(() => '')
            throw new Error(err || `AI request failed (${response.status})`)
        }

        const data = await response.json()
        const reply = data.response || data.reply || data.generated_text || data.output || data.choices?.[0]?.message?.content || ''
        return { reply }
    },
}
