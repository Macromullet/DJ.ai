#!/usr/bin/env bash
# DJ.ai Backend Setup Tool (macOS/Linux wrapper)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
pwsh "$SCRIPT_DIR/setup.ps1" "$@"
