from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/categories", include("apps.categories.urls")),
    path("api/notes", include("apps.notes.urls")),
]
