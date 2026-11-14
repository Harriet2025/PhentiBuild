"""
Every API route, in one place. All live under /api/ — Vercel forwards
/api/* from the frontend's own domain to this backend (see web/vercel.json),
so the browser only ever talks to one origin.

PHP endpoint                         → Django route
backend/api/ping.php                 → /api/ping/
backend/api/auth/login.php           → /api/auth/login/      (… register, logout, me)
backend/api/account/profile.php      → /api/account/profile/ (… password)
backend/api/company-profile/         → /api/company-profile/
backend/api/projects/?id=5           → /api/projects/5/
backend/api/materials/?id=MAT-1001   → /api/materials/MAT-1001/
backend/api/boq/?id=BOQ-0007         → /api/boq/BOQ-0007/
backend/api/measurements/ , calculations/, reports/, history/  → same pattern
backend/api/roof-designs/            → /api/roof-designs/
backend/api/roof-ai/generate.php     → /api/roof-ai/generate/
backend/api/scanner/detect.php       → /api/scanner/detect/
backend/api/export/excel.php         → /api/export/excel/
backend/api/contact/submit.php       → /api/contact/
(new, Admin only)                    → /api/users/ , /api/users/<id>/role/
"""
from django.urls import path

from apps.accounts import views as accounts
from apps.boq import views as boq
from apps.company import views as company
from apps.core.views import PingView
from apps.history import views as history
from apps.materials import views as materials
from apps.projects import views as projects
from apps.records import views as records
from apps.reports import views as reports
from apps.roofing import views as roofing
from apps.vision import views as vision

urlpatterns = [
    path('api/ping/', PingView.as_view()),

    path('api/auth/login/', accounts.LoginView.as_view()),
    path('api/auth/register/', accounts.RegisterView.as_view()),
    path('api/auth/logout/', accounts.LogoutView.as_view()),
    path('api/auth/me/', accounts.MeView.as_view()),
    path('api/auth/providers/', accounts.AuthProvidersView.as_view()),
    path('api/auth/google/', accounts.GoogleAuthView.as_view()),
    path('api/account/profile/', accounts.ProfileView.as_view()),
    path('api/account/password/', accounts.PasswordView.as_view()),
    path('api/users/', accounts.UserListView.as_view()),
    path('api/users/<int:pk>/role/', accounts.UserRoleView.as_view()),

    path('api/company-profile/', company.CompanyProfileView.as_view()),
    path('api/contact/', company.ContactSubmitView.as_view()),

    path('api/projects/', projects.ProjectListView.as_view()),
    path('api/projects/<int:pk>/', projects.ProjectDetailView.as_view()),

    path('api/materials/', materials.MaterialListView.as_view()),
    path('api/materials/<str:pk>/', materials.MaterialDetailView.as_view()),

    path('api/boq/', boq.BoqListView.as_view()),
    path('api/boq/<str:ref>/', boq.BoqDetailView.as_view()),

    path('api/measurements/', records.MeasurementListView.as_view()),
    path('api/measurements/<int:pk>/', records.MeasurementDetailView.as_view()),
    path('api/calculations/', records.CalculationListView.as_view()),
    path('api/calculations/<int:pk>/', records.CalculationDetailView.as_view()),

    path('api/roof-designs/', roofing.RoofDesignView.as_view()),
    path('api/roof-ai/generate/', roofing.RoofAIGenerateView.as_view()),
    path('api/scanner/detect/', vision.DetectView.as_view()),

    path('api/history/', history.HistoryListView.as_view()),
    path('api/history/<int:pk>/', history.HistoryDetailView.as_view()),

    path('api/reports/', reports.ReportListView.as_view()),
    path('api/reports/<int:pk>/', reports.ReportDetailView.as_view()),
    path('api/export/excel/', reports.ExcelExportView.as_view()),
]

handler400 = 'apps.core.exceptions.json_400'
handler403 = 'apps.core.exceptions.json_403'
handler404 = 'apps.core.exceptions.json_404'
handler500 = 'apps.core.exceptions.json_500'
