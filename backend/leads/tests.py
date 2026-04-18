from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import TestCase

from .models import Lead, LeadNote, Reminder


class BaseApiTestCase(TestCase):
    def setUp(self):
        self.username = "alice"
        self.password = "password123"
        self.user = User.objects.create_user(username=self.username, password=self.password)

    def login(self):
        logged_in = self.client.login(username=self.username, password=self.password)
        self.assertTrue(logged_in)


class AuthApiTests(BaseApiTestCase):
    def test_signup_creates_user_and_session(self):
        response = self.client.post(
            "/api/auth/signup/",
            data={
                "username": "newuser",
                "password": "strongpass1",
                "confirm_password": "strongpass1",
            },
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(payload["user"]["username"], "newuser")
        self.assertTrue(User.objects.filter(username="newuser").exists())

        session_response = self.client.get("/api/auth/session/")
        self.assertEqual(session_response.status_code, 200)
        self.assertTrue(session_response.json()["authenticated"])

    def test_login_and_logout_flow(self):
        login_response = self.client.post(
            "/api/auth/login/",
            data={"username": self.username, "password": self.password},
            content_type="application/json",
        )

        self.assertEqual(login_response.status_code, 200)
        self.assertEqual(login_response.json()["user"]["username"], self.username)

        logout_response = self.client.post(
            "/api/auth/logout/",
            data={},
            content_type="application/json",
        )
        self.assertEqual(logout_response.status_code, 200)

        session_response = self.client.get("/api/auth/session/")
        self.assertEqual(session_response.status_code, 401)
        self.assertFalse(session_response.json()["authenticated"])


class LeadApiTests(BaseApiTestCase):
    def test_leads_list_requires_login(self):
        response = self.client.get("/api/leads/")

        self.assertEqual(response.status_code, 302)
        self.assertIn("/accounts/login/", response["Location"])

    def test_leads_get_seeds_demo_data_for_authenticated_user(self):
        self.login()

        response = self.client.get("/api/leads/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertGreaterEqual(len(payload["items"]), 4)
        self.assertEqual(Lead.objects.count(), 4)

    def test_create_and_update_lead(self):
        self.login()

        create_response = self.client.post(
            "/api/leads/",
            data={
                "company_name": "Globex",
                "contact_name": "Hank Scorpio",
                "contact_email": "hank@globex.com",
                "source": "Referral",
                "stage": "qualified",
                "estimated_value": 125000,
                "assigned_to": "alice",
                "last_touch": "2026-04-18",
                "notes": "Budget approved for pilot.",
            },
            content_type="application/json",
        )

        self.assertEqual(create_response.status_code, 201)
        created = create_response.json()["item"]
        self.assertEqual(created["company_name"], "Globex")
        self.assertEqual(created["stage"], "qualified")

        lead_id = created["id"]
        update_response = self.client.patch(
            f"/api/leads/{lead_id}/",
            data='{"stage":"negotiation","notes":"Procurement review started."}',
            content_type="application/json",
        )

        self.assertEqual(update_response.status_code, 200)
        updated = update_response.json()["item"]
        self.assertEqual(updated["stage"], "negotiation")
        self.assertEqual(Lead.objects.get(pk=lead_id).notes, "Procurement review started.")

    def test_create_lead_validates_required_fields(self):
        self.login()

        response = self.client.post(
            "/api/leads/",
            data={"company_name": "Incomplete"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("company_name and contact_name are required", response.json()["detail"])


class NotesAndRemindersApiTests(BaseApiTestCase):
    def setUp(self):
        super().setUp()
        self.lead = Lead.objects.create(
            company_name="Initech",
            contact_name="Peter Gibbons",
            stage=Lead.STAGE_NEW,
            estimated_value=5000,
        )

    def test_add_and_list_notes_for_a_lead(self):
        self.login()

        create_response = self.client.post(
            f"/api/leads/{self.lead.id}/notes/",
            data={"channel": "call", "note": "Discussed rollout timeline."},
            content_type="application/json",
        )

        self.assertEqual(create_response.status_code, 201)
        self.assertEqual(LeadNote.objects.count(), 1)

        list_response = self.client.get(f"/api/leads/{self.lead.id}/notes/list/")
        self.assertEqual(list_response.status_code, 200)
        payload = list_response.json()
        self.assertEqual(len(payload["items"]), 1)
        self.assertEqual(payload["items"][0]["owner"], self.username)

    def test_create_list_and_update_reminders(self):
        self.login()

        create_response = self.client.post(
            f"/api/leads/{self.lead.id}/reminders/",
            data={"task": "Send proposal", "due_at": "2026-04-20T10:30:00Z"},
            content_type="application/json",
        )

        self.assertEqual(create_response.status_code, 201)
        reminder_id = create_response.json()["item"]["id"]

        list_response = self.client.get(f"/api/leads/{self.lead.id}/reminders/")
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()["items"]), 1)

        update_response = self.client.patch(
            f"/api/reminders/{reminder_id}/",
            data='{"is_done": true}',
            content_type="application/json",
        )

        self.assertEqual(update_response.status_code, 200)
        self.assertTrue(Reminder.objects.get(pk=reminder_id).is_done)


class DashboardAndAiApiTests(BaseApiTestCase):
    def setUp(self):
        super().setUp()
        self.lead = Lead.objects.create(
            company_name="Initrode",
            contact_name="Samir",
            stage=Lead.STAGE_PROPOSAL,
            estimated_value=90000,
            assigned_to=self.username,
            notes="Interested in pilot with approved budget.",
        )
        LeadNote.objects.create(
            lead=self.lead,
            owner=self.username,
            channel=LeadNote.CHANNEL_EMAIL,
            note="Sent revised pricing.",
        )
        Reminder.objects.create(
            lead=self.lead,
            task="Follow up on proposal",
            due_at="2026-04-21T09:00:00Z",
        )

    def test_dashboard_returns_metrics_for_authenticated_user(self):
        self.login()

        response = self.client.get("/api/dashboard/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["metrics"]["total_value"], 90000.0)
        self.assertEqual(payload["pipeline"]["proposal"], 1)
        self.assertEqual(len(payload["activity"]), 1)
        self.assertEqual(len(payload["reminders"]), 1)

    def test_ai_insights_returns_ranked_pipeline_summary(self):
        response = self.client.get("/api/ai/insights/")

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["summary"]["lead_count"], 1)
        self.assertEqual(payload["top_opportunities"][0]["company_name"], "Initrode")

    @patch("leads.views._call_ollama", return_value=(None, "offline"))
    def test_ai_chat_falls_back_when_ollama_is_unavailable(self, mocked_call):
        response = self.client.post(
            "/api/ai/chat/",
            data={"prompt": "What should I do next?"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["model"], "rule-based-fallback")
        self.assertTrue(payload["degraded"])
        self.assertIn("Model status: offline", payload["reply"])
        mocked_call.assert_called_once()
