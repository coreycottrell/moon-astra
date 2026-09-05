#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# The tower has a standalone Python from another app. System Blender must use
# the system stdlib to find _ctypes; existing user-site NumPy remains available.
if [[ -x /usr/bin/blender && -d /usr/lib/python3.12 ]]; then
  export PYTHONHOME=/usr
  export PYTHONPATH=/usr/lib/python3/dist-packages
fi
exec blender --factory-startup --background --threads 8 --python-exit-code 1 --python art/blender/build_foundry_assets.py -- "$@"
