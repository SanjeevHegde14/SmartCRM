let mockLeads = [
    { id: 1, company_name: 'Acme Corp', contact_name: 'Wile E. Coyote', contact_email: 'wile@acme.com', contact_phone: '555-0199', source: 'Referral', stage: 'proposal', estimated_value: 50000, assigned_to: 'admin', last_touch: '2026-04-10', notes: 'Needs heavy iron.' },
    { id: 2, company_name: 'Stark Industries', contact_name: 'Tony Stark', contact_email: 'tony@stark.com', contact_phone: '555-0200', source: 'Website', stage: 'negotiation', estimated_value: 1200000, assigned_to: 'admin', last_touch: '2026-04-11', notes: 'Asking about arc reactor tech scale.' },
    { id: 3, company_name: 'Wayne Enterprises', contact_name: 'Bruce Wayne', contact_email: 'bruce@wayne.com', contact_phone: '555-0300', source: 'Direct', stage: 'won', estimated_value: 850000, assigned_to: 'admin', last_touch: '2026-04-12', notes: 'Deal closed.' },
    { id: 4, company_name: 'Daily Planet', contact_name: 'Clark Kent', contact_email: 'ckent@dailyplanet.com', contact_phone: '555-0400', source: 'Event', stage: 'new', estimated_value: 15000, assigned_to: 'admin', last_touch: '', notes: 'Just picked up a card at the event.' },
    { id: 5, company_name: 'Oscorp', contact_name: 'Norman Osborn', contact_email: 'norman@oscorp.com', contact_phone: '555-0500', source: 'Organic Search', stage: 'qualified', estimated_value: 400000, assigned_to: 'admin', last_touch: '2026-04-11', notes: 'Wants a meeting next week.' }
];

let currentUser = { username: 'admin', role: 'Sales Manager' };

// Delay to simulate realistic network latency for the UI
const delay = (ms = 400) => new Promise(resolve => setTimeout(resolve, ms));

export const authApi = {
    login: async (payload) => {
        await delay();
        if (payload.username === 'test' && payload.password === 'wrong') throw new Error('Invalid credentials');
        currentUser = { username: payload.username, role: 'AE' };
        return { user: currentUser };
    },
    logout: async () => {
        await delay();
        currentUser = null;
        return {};
    },
    session: async () => {
        await delay(200);
        if (!currentUser) {
            const error = new Error('Not logged in');
            error.status = 401;
            throw error;
        }
        return { user: currentUser };
    },
};

export const leadApi = {
    list: async () => {
        await delay(300);
        return { items: [...mockLeads] };
    },
    create: async (payload) => {
        await delay(500);
        const newLead = { ...payload, id: mockLeads.length + 1 };
        mockLeads.push(newLead);
        return newLead;
    },
    dashboard: async () => {
        await delay(300);
        const total_value = mockLeads.reduce((sum, l) => sum + Number(l.estimated_value || 0), 0);
        const wonLeads = mockLeads.filter(l => l.stage === 'won');
        const won_value = wonLeads.reduce((sum, l) => sum + Number(l.estimated_value || 0), 0);
        const conversion_rate = mockLeads.length ? Math.round((wonLeads.length / mockLeads.length) * 100) : 0;
        
        return { metrics: { total_value, won_value, conversion_rate } };
    },
};

const STAGE_PROBABILITY = {
    new: 0.12,
    qualified: 0.28,
    proposal: 0.46,
    negotiation: 0.66,
    won: 1,
    lost: 0.02,
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function buildInsight(lead) {
    const now = new Date();
    const lastTouch = lead.last_touch ? new Date(lead.last_touch) : null;
    const daysSinceTouch = lastTouch ? Math.floor((now - lastTouch) / (1000 * 60 * 60 * 24)) : 999;

    const base = STAGE_PROBABILITY[lead.stage] ?? 0.2;
    const value = Number(lead.estimated_value || 0);
    const valueBonus = value >= 100000 ? 0.08 : value >= 25000 ? 0.03 : 0;
    const stalePenalty = daysSinceTouch > 14 ? 0.22 : daysSinceTouch > 7 ? 0.1 : 0;

    const text = String(lead.notes || '').toLowerCase();
    const hasPositiveSignal = ['budget', 'approved', 'signed', 'pilot', 'urgent'].some((t) => text.includes(t));
    const hasRiskSignal = ['delay', 'silent', 'no response', 'price', 'blocked', 'later'].some((t) => text.includes(t));

    const probability = clamp(base + valueBonus + (hasPositiveSignal ? 0.05 : 0) - (hasRiskSignal ? 0.08 : 0) - stalePenalty, 0.03, 0.99);
    const ai_score = Math.round(probability * 100);
    const risk_level = ai_score < 35 ? 'high' : ai_score < 65 ? 'medium' : 'low';

    let next_action = 'Run qualification checklist and identify decision maker';
    if (lead.stage === 'won' || lead.stage === 'lost') {
        next_action = 'Capture win/loss notes for future playbooks';
    } else if (daysSinceTouch > 14) {
        next_action = 'High urgency: schedule a call in the next 24h';
    } else if (lead.stage === 'proposal' || lead.stage === 'negotiation') {
        next_action = 'Send a concise value recap and ask for decision date';
    } else if (lead.stage === 'qualified') {
        next_action = 'Book discovery meeting and validate buying timeline';
    }

    return {
        lead_id: lead.id,
        company_name: lead.company_name,
        stage: lead.stage,
        estimated_value: value,
        expected_value: Number((value * probability).toFixed(2)),
        win_probability: Number((probability * 100).toFixed(1)),
        ai_score,
        risk_level,
        days_since_touch: lastTouch ? daysSinceTouch : null,
        next_action,
    };
}

export const aiApi = {
    overview: async () => {
        await delay(280);
        const all = mockLeads.map(buildInsight).sort((a, b) => b.ai_score - a.ai_score);
        const top_opportunities = all.slice(0, 5);
        const at_risk = all.filter((item) => item.risk_level !== 'low').sort((a, b) => a.ai_score - b.ai_score).slice(0, 5);
        const expected_revenue = all.reduce((sum, item) => sum + Number(item.expected_value || 0), 0);
        const pipeline_value = all.reduce((sum, item) => sum + Number(item.estimated_value || 0), 0);
        const average_win_probability = all.length ? Number((all.reduce((sum, item) => sum + item.win_probability, 0) / all.length).toFixed(1)) : 0;

        return {
            summary: {
                lead_count: all.length,
                average_win_probability,
                expected_revenue,
                pipeline_value,
                forecast_gap: Number((pipeline_value - expected_revenue).toFixed(2)),
            },
            top_opportunities,
            at_risk,
            all,
        };
    },
    chat: async (prompt) => {
        const response = await fetch('http://127.0.0.1:8000/api/ai/chat/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });

        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload.detail || 'AI chat request failed');
        }

        return payload;
    },
};
