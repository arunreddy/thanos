import os
import sys
import pytest

# Add the root directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import fixtures that can be shared across tests
pytest_plugins = []