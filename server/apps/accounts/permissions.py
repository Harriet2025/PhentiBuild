"""
Role-based access control, enforced on the SERVER (hiding a button in the
frontend is never the security boundary).

Usage on a view:
    permission_classes = [IsAuthenticated, HasRole.of('Admin')]
"""
from __future__ import annotations

from rest_framework.permissions import SAFE_METHODS, BasePermission

from .models import ADMIN, ROLES


class HasRole(BasePermission):
    allowed_roles: tuple[str, ...] = ()
    message = 'You do not have permission to do that.'

    def has_permission(self, request, view) -> bool:
        user = request.user
        return bool(user and user.is_authenticated and getattr(user, 'role', None) in self.allowed_roles)

    @classmethod
    def of(cls, *roles: str) -> type['HasRole']:
        unknown = set(roles) - set(ROLES)
        if unknown:
            raise ValueError(f'Unknown role(s): {unknown}')
        return type(f"HasRole_{'_'.join(r.replace(' ', '') for r in roles)}", (cls,), {'allowed_roles': roles})


IsAdmin = HasRole.of(ADMIN)


class IsAdminOrReadOnly(BasePermission):
    """Any logged-in user may read (GET); only Admins may create, change or delete."""
    message = 'Only an administrator can change the materials library.'

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return request.method in SAFE_METHODS or bool(getattr(user, 'is_admin', False))
