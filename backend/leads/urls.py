from django.urls import path

from .views import (
    ai_chat_view,
    ai_insights_view,
    dashboard_view,
    lead_note_create_view,
    lead_update_view,
    leads_collection_view,
    login_view,
    logout_view,
    session_view,
)

urlpatterns = [
    path("auth/login/", login_view, name="login"),
    path("auth/logout/", logout_view, name="logout"),
    path("auth/session/", session_view, name="session"),
    path("dashboard/", dashboard_view, name="dashboard"),
    path("ai/insights/", ai_insights_view, name="ai-insights"),
    path("ai/chat/", ai_chat_view, name="ai-chat"),
    path("leads/", leads_collection_view, name="leads"),
    path("leads/<int:lead_id>/", lead_update_view, name="lead-update"),
    path("leads/<int:lead_id>/notes/", lead_note_create_view, name="lead-note-create"),
]
