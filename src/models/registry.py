"""
Import every ORM model module so SQLAlchemy's mapper registry is fully
populated before any mapper gets configured.

SQLAlchemy resolves string-based `relationship("SomeClass", ...)` arguments
lazily, the first time any mapper in the registry is configured (which
happens the first time any model is instantiated or queried). If a
cross-module relationship refers to a class whose module hasn't been
imported yet, configuration fails with `InvalidRequestError: ... failed to
locate a name`. Because Python import order is otherwise arbitrary --
different tests, scripts, or the app itself may only import the handful of
model modules they directly need -- this failure is order-dependent and can
appear in one entrypoint but not another.

The fix is to guarantee all model modules are imported exactly once, in one
place, before anything touches the database. Import this module (for its
side effects) from any entrypoint that talks to the database: the FastAPI
app, Alembic's `env.py`, and the test suite's `conftest.py` all do this.
"""

# Core models
import src.models.base  # noqa: F401

# Module models
import src.modules.admin.models.admin  # noqa: F401
import src.modules.analytics.models.analytics  # noqa: F401
import src.modules.conversion.models.base  # noqa: F401
import src.modules.gateway.models.gateway  # noqa: F401
import src.modules.license.models.license  # noqa: F401
import src.modules.license.models.device  # noqa: F401
import src.modules.license.models.activation  # noqa: F401
import src.modules.license.models.plan  # noqa: F401
import src.modules.license.models.subscription  # noqa: F401
import src.modules.license.models.feature  # noqa: F401
import src.modules.license.models.audit  # noqa: F401
import src.modules.mime.models.base  # noqa: F401
import src.modules.monitoring.models.monitoring  # noqa: F401
import src.modules.notification.models.notification  # noqa: F401
import src.modules.notification.models.template  # noqa: F401
import src.modules.payment.models.payment  # noqa: F401
import src.modules.payment.models.transaction  # noqa: F401
import src.modules.payment.models.invoice  # noqa: F401
import src.modules.payment.models.refund  # noqa: F401
import src.modules.payment.models.coupon  # noqa: F401
import src.modules.payment.models.webhook_event  # noqa: F401
import src.modules.payment.models.billing_address  # noqa: F401
import src.modules.search.models.search  # noqa: F401
import src.modules.security.models.security  # noqa: F401
import src.modules.uploads.models.base  # noqa: F401
