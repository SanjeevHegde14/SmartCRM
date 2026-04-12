from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health_view(_request):
    return JsonResponse({"status": "ok", "service": "smartcrm-backend"})

urlpatterns = [
    path("", health_view, name="health"),
    path("admin/", admin.site.urls),
    path("api/", include("leads.urls")),
]
