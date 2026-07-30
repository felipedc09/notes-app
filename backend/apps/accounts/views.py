from django.contrib.auth import authenticate, get_user_model, login, logout
from django.db import transaction
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.categories.services import seed_default_categories

from .serializers import LoginSerializer, SignupSerializer, UserSerializer

User = get_user_model()


class SignupView(APIView):
    """POST /api/auth/signup — FR-04: create account, log in on success."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        with transaction.atomic():
            user = User.objects.create_user(
                username=email, email=email, password=password
            )
            seed_default_categories(user)  # FR-07: 3 fixed categories per user

        login(request, user)
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    """POST /api/auth/login — FR-05: generic failure message (task 1.5)."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        password = serializer.validated_data["password"]

        user = authenticate(request, username=email, password=password)
        if user is None:
            # Never discloses whether the email or the password was wrong.
            return Response(
                {"detail": "Invalid email or password."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        login(request, user)
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class LogoutView(APIView):
    """POST /api/auth/logout — 204; 403 if anonymous (default IsAuthenticated)."""

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """GET /api/auth/me — @ensure_csrf_cookie guarantees a csrftoken cookie even
    for an anonymous visitor (design.md §4), so this view stays AllowAny and
    replicates DRF's default 403 shape for the unauthenticated case itself —
    the default IsAuthenticated permission class would 403 before the
    decorated `get` ever runs, skipping the cookie."""

    permission_classes = [permissions.AllowAny]

    @method_decorator(ensure_csrf_cookie)
    def get(self, request):
        if not request.user.is_authenticated:
            return Response(
                {"detail": "Authentication credentials were not provided."},
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(UserSerializer(request.user).data)
