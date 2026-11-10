# backend/models/__init__.py
"""
Compatibility shim to expose the project's ORM models under the package
`backend.models` while keeping mock-specific models in backend/models/.
This file imports the core model classes from backend/models_core.py
(which used to be backend/models.py) and re-exports them, while allowing
submodules like backend.models.mock_models to be importable.
"""

# Import the core ORM definitions (renamed file)
from backend import models_core as _core

# Re-export common names expected elsewhere in the codebase
# (only import the symbols you use; listing the most common ones here)
User = _core.User
Experience = _core.Experience
Education = _core.Education
Project = _core.Project
Resume = _core.Resume

# Re-export SQLAlchemy helpers used in some places (if needed)
# If these are not present in models_core, these lines can be removed.
try:
    Base = _core.Base
except Exception:
    Base = None

# Expose a clean __all__ for "from backend import models"
__all__ = [
    "User",
    "Experience",
    "Education",
    "Project",
    "Resume",
    "Base",
]

# Note: mock-specific models remain in backend/models/mock_models.py
# and can be imported as: from backend.models.mock_models import MockSession
