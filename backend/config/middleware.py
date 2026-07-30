"""Project middleware."""

from urllib.parse import urlsplit

from django.conf import settings
from django.core.exceptions import DisallowedHost

# Hostnames that can only ever resolve to this machine.
LOOPBACK_HOSTS = frozenset({"localhost", "127.0.0.1", "::1"})


class LoopbackCsrfOriginMiddleware:
    """Trust a loopback CSRF origin on any port, but only while DEBUG is on.

    Django compares CSRF origins as exact "scheme://host:port" strings and
    supports no port wildcard, so CSRF_TRUSTED_ORIGINS cannot express "any
    localhost port". Editor port forwarding (VS Code, JetBrains) allocates an
    arbitrary local port whenever the canonical one is already taken, so the
    browser sends e.g. "Origin: http://localhost:59478". Reads keep working
    and every unsafe request fails the origin check, which reads as "saving is
    broken" rather than as a configuration problem.

    Rewriting the header to the request's own origin makes that check pass.
    The CSRF token itself is still verified as usual — only the origin
    comparison is relaxed, and only for hosts that cannot be reached from
    another machine.

    This must stay ahead of CsrfViewMiddleware in MIDDLEWARE. It also covers
    DRF, which builds its own CSRFCheck per request rather than using the
    configured middleware instance, and so can only be reached through
    request.META.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if settings.DEBUG:
            origin = request.META.get("HTTP_ORIGIN")
            if origin and urlsplit(origin).hostname in LOOPBACK_HOSTS:
                try:
                    host = request.get_host()
                except DisallowedHost:
                    pass
                else:
                    scheme = "https" if request.is_secure() else "http"
                    request.META["HTTP_ORIGIN"] = f"{scheme}://{host}"
        return self.get_response(request)
