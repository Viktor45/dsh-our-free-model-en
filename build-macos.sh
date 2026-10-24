#!/usr/bin/env bash
#
# Build Our Free Model for macOS, for the architecture of this machine.
#
# The desktop shell is a Tauri app that bundles the standalone service and a
# copy of the Node runtime, so a build needs four things to be true:
#
#   1. this is macOS, with the Xcode command line tools installed;
#   2. Node.js is new enough (22.19+ or 24+) and matches the host CPU;
#   3. a Rust toolchain is installed (the crate declares rust-version 1.77.2,
#      but the locked dependencies may need more than that);
#   4. the npm dependencies of the repository, of the standalone service and
#      of the desktop shell are installed, and the standalone web console has
#      been rebuilt from source before Tauri packages it.
#
# Everything the script writes lands under packages/desktop/src-tauri/target
# (git-ignored) plus packages/standalone/web and packages/desktop/src-tauri/
# resources, which are also git-ignored build products.
#
# The result is an unsigned .dmg: this build has no Apple Developer identity,
# so Gatekeeper blocks the first launch. The script prints how to open it.

set -Eeuo pipefail

readonly SCRIPT_NAME="$(basename "$0")"
readonly REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
readonly DESKTOP_DIR="$REPO_ROOT/packages/desktop"
readonly TAURI_DIR="$DESKTOP_DIR/src-tauri"
readonly STANDALONE_DIR="$REPO_ROOT/packages/standalone"

# Node versions the standalone service and the desktop runtime accept.
readonly MIN_NODE_MAJOR=22
readonly MIN_NODE_MINOR=19
# The crate's own declaration; the locked dependencies may require more.
readonly MIN_RUST_VERSION="1.77.2"

CLEAN=0
DEBUG=0
SKIP_INSTALL=0
BUNDLE_TARGETS="dmg"
NO_BUNDLE=0

# ── output helpers ───────────────────────────────────────────────────────────

info() { printf '\033[0;36m==>\033[0m %s\n' "$*"; }
step() { printf '\033[0;32m  ->\033[0m %s\n' "$*"; }
warn() { printf '\033[0;33mwarning:\033[0m %s\n' "$*" >&2; }
fail() { printf '\033[0;31merror:\033[0m %s\n' "$*" >&2; exit 1; }

# Print the failing command with its line number, then stop.
on_error() {
  local line="$1" command="$2" status="$3"
  printf '\033[0;31merror:\033[0m build failed at %s line %s (exit %s)\n' "$SCRIPT_NAME" "$line" "$status" >&2
  printf '  command: %s\n' "$command" >&2
  exit "$status"
}
trap 'on_error "$LINENO" "$BASH_COMMAND" "$?"' ERR

usage() {
  cat <<'USAGE'
Build Our Free Model for macOS, for the architecture of this machine.

Usage:
  ./build-macos.sh [options]

Options:
  --clean             remove the Rust target directory before building
  --debug             build the debug profile instead of release
  --skip-install      do not run npm ci (use the dependencies already present)
  --bundle <targets>  Tauri bundle targets: dmg (default), app, or all
  --no-bundle         build the binary only, no .dmg / .app
  -h, --help          show this help

Environment:
  OFM_DESKTOP_NODE_LICENSE   path to the full Node LICENSE for the exact
                              Node version in use; needed only when the
                              machine cannot reach raw.githubusercontent.com
                              and the license cache is cold
USAGE
}

# ── arguments ────────────────────────────────────────────────────────────────

while [ $# -gt 0 ]; do
  case "$1" in
    --clean) CLEAN=1 ;;
    --debug) DEBUG=1 ;;
    --skip-install) SKIP_INSTALL=1 ;;
    --no-bundle) NO_BUNDLE=1 ;;
    --bundle)
      [ $# -ge 2 ] || fail "--bundle needs a target: dmg, app or all"
      BUNDLE_TARGETS="$2"
      shift
      ;;
    --bundle=*) BUNDLE_TARGETS="${1#--bundle=}" ;;
    -h|--help) usage; exit 0 ;;
    *) fail "unknown option: $1 (try --help)" ;;
  esac
  shift
done

case "$BUNDLE_TARGETS" in
  dmg|app|all) ;;
  *) fail "unsupported bundle target: $BUNDLE_TARGETS (use dmg, app or all)" ;;
esac

if [ "$NO_BUNDLE" -eq 1 ]; then
  TAURI_BUNDLE_ARGS=(--no-bundle)
elif [ "$BUNDLE_TARGETS" = "all" ]; then
  # "all" means the two macOS targets. The config also lists nsis, which is
  # Windows-only, so the list is stated here rather than taken from the config.
  TAURI_BUNDLE_ARGS=(--bundles dmg app)
else
  TAURI_BUNDLE_ARGS=(--bundles "$BUNDLE_TARGETS")
fi

# ── preconditions ────────────────────────────────────────────────────────────

[ "$(uname -s)" = "Darwin" ] || fail "this script builds the macOS app only; it is running on $(uname -s)"

# The machine's real architecture, not the one the current shell happens to run
# under: on Apple Silicon a Rosetta shell reports x86_64 for `uname -m`, and a
# native build has to happen in a native shell.
UNAME_ARCH="$(uname -m)"
if [ "$(sysctl -n hw.optional.arm64 2>/dev/null || echo 0)" = "1" ]; then
  MACHINE_ARCH="arm64"
  if [ "$UNAME_ARCH" != "arm64" ]; then
    fail "this shell runs under Rosetta on an Apple Silicon Mac; run the build natively (for example: arch -arm64 zsh) or install an arm64 Node.js and Rust toolchain"
  fi
else
  MACHINE_ARCH="x86_64"
fi

case "$MACHINE_ARCH" in
  arm64) RUST_HOST_TARGET="aarch64-apple-darwin" ;;
  x86_64) RUST_HOST_TARGET="x86_64-apple-darwin" ;;
  *) fail "unsupported macOS architecture: $MACHINE_ARCH" ;;
esac

info "Our Free Model · macOS build (${MACHINE_ARCH}, ${RUST_HOST_TARGET})"

command -v xcode-select >/dev/null 2>&1 || fail "xcode-select is missing; install the Xcode command line tools (xcode-select --install)"
if ! xcode-select -p >/dev/null 2>&1; then
  fail "the Xcode command line tools are not installed (xcode-select --install)"
fi
step "Xcode command line tools: $(xcode-select -p 2>/dev/null)"

command -v node >/dev/null 2>&1 || fail "node is not installed; this project needs Node.js ${MIN_NODE_MAJOR}.${MIN_NODE_MINOR}+ or 24+"
command -v npm >/dev/null 2>&1 || fail "npm is not installed (it ships with Node.js)"

NODE_VERSION="$(node -p 'process.version')"
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
NODE_MINOR="$(node -p 'process.versions.node.split(".")[1]')"
NODE_ARCH="$(node -p 'process.arch')"
if [ "$NODE_MAJOR" -lt "$MIN_NODE_MAJOR" ] \
  || { [ "$NODE_MAJOR" -eq "$MIN_NODE_MAJOR" ] && [ "$NODE_MINOR" -lt "$MIN_NODE_MINOR" ]; } \
  || [ "$NODE_MAJOR" -eq 23 ]; then
  fail "Node.js ${NODE_VERSION} is not a supported release; this project needs ${MIN_NODE_MAJOR}.${MIN_NODE_MINOR}+ or 24+"
fi
# Node reports its architecture as "arm64" / "x64"; the machine's is
# "arm64" / "x86_64".
NODE_MACHINE_ARCH="$NODE_ARCH"
[ "$NODE_MACHINE_ARCH" = "x64" ] && NODE_MACHINE_ARCH="x86_64"
[ "$NODE_MACHINE_ARCH" = "$MACHINE_ARCH" ] \
  || fail "node runs as ${NODE_ARCH} but this machine is ${MACHINE_ARCH}; install a matching Node.js (the desktop runtime copies the node binary verbatim)"
step "Node.js ${NODE_VERSION} (${NODE_ARCH}), npm $(npm --version)"

command -v cargo >/dev/null 2>&1 || fail "cargo is not installed; install Rust from https://rustup.rs"
command -v rustc >/dev/null 2>&1 || fail "rustc is not installed; install Rust from https://rustup.rs"
RUST_VERSION="$(rustc --version | awk '{print $2}')"
# Succeeds when the installed version is at least the required one; the
# comparison is numeric per dotted field, so 1.100.0 sorts above 1.99.0.
version_at_least() {
  [ "$(printf '%s\n%s\n' "$2" "$1" | sort -t. -k1,1n -k2,2n -k3,3n | head -1)" = "$2" ]
}
version_at_least "$RUST_VERSION" "$MIN_RUST_VERSION" \
  || fail "rustc ${RUST_VERSION} is older than the crate's rust-version ${MIN_RUST_VERSION}; run: rustup update stable"
RUST_HOST="$(rustc -vV | awk -F': ' '/^host/ {print $2}')"
[ "$RUST_HOST" = "$RUST_HOST_TARGET" ] \
  || fail "the active Rust toolchain targets ${RUST_HOST}, but this machine is ${RUST_HOST_TARGET}; the build must run natively"
step "Rust ${RUST_VERSION} (${RUST_HOST})"

# The license of the bundled Node runtime is fetched from the network the first
# time and cached afterwards. Say so before a build fails on it.
LICENSE_CACHE="$TAURI_DIR/.node-license-cache/${NODE_VERSION}.txt"
if [ -n "${OFM_DESKTOP_NODE_LICENSE:-}" ]; then
  [ -f "$OFM_DESKTOP_NODE_LICENSE" ] || fail "OFM_DESKTOP_NODE_LICENSE points at a missing file: $OFM_DESKTOP_NODE_LICENSE"
  step "Node license taken from OFM_DESKTOP_NODE_LICENSE"
elif [ -f "$LICENSE_CACHE" ]; then
  step "Node license cached at ${LICENSE_CACHE#"$REPO_ROOT/"}"
else
  warn "the Node ${NODE_VERSION} license is not cached; the build will fetch it from raw.githubusercontent.com"
  warn "set OFM_DESKTOP_NODE_LICENSE to a local copy if this machine has no access to GitHub"
fi

if [ "$SKIP_INSTALL" -eq 0 ]; then
  command -v curl >/dev/null 2>&1 || fail "curl is missing; npm needs it to reach the registry"
  if ! curl -fsS --max-time 15 -o /dev/null https://registry.npmjs.org/ 2>/dev/null; then
    fail "the npm registry is unreachable; the build needs to download dependencies (or use --skip-install with everything already installed)"
  fi
fi

# ── dependencies ─────────────────────────────────────────────────────────────

if [ "$SKIP_INSTALL" -eq 0 ]; then
  info "Installing dependencies"
  (cd "$REPO_ROOT" && npm ci --ignore-scripts) || fail "npm ci failed in the repository root"
  (cd "$STANDALONE_DIR" && npm ci --ignore-scripts) || fail "npm ci failed in packages/standalone"
  # --ignore-scripts: the desktop package's own prepare hook stages the
  # resources, and Tauri runs it as beforeBuildCommand at the right moment.
  (cd "$DESKTOP_DIR" && npm ci --ignore-scripts) || fail "npm ci failed in packages/desktop"
  step "npm dependencies installed"
else
  info "Skipping dependency installation (--skip-install)"
  [ -d "$STANDALONE_DIR/node_modules" ] || fail "packages/standalone/node_modules is missing; drop --skip-install"
  [ -d "$DESKTOP_DIR/node_modules" ] || fail "packages/desktop/node_modules is missing; drop --skip-install"
fi

# ── the standalone web console ───────────────────────────────────────────────
#
# The desktop bundle packages packages/standalone/web, so it has to be rebuilt
# from the frontend sources before Tauri copies it in. The generated assets are
# deterministic; a run that changes them means the committed build is stale.

info "Building the standalone web console"
node "$REPO_ROOT/scripts/build-standalone-ui.mjs" || fail "the standalone web console failed to build"

# ── the Rust build ───────────────────────────────────────────────────────────

if [ "$CLEAN" -eq 1 ]; then
  info "Removing the Rust target directory"
  rm -rf "$TAURI_DIR/target"
fi

if [ "$DEBUG" -eq 1 ]; then
  PROFILE="debug"
  info "Building the desktop app (debug profile)"
else
  PROFILE="release"
  info "Building the desktop app (release profile)"
fi

# The bundle directories are build products (git-ignored). Clearing them first
# keeps the reported artefacts honest: without this, a run that builds only the
# .app would still print the .dmg of an earlier run.
rm -rf "$TAURI_DIR/target/$PROFILE/bundle/dmg" "$TAURI_DIR/target/$PROFILE/bundle/macos"

BUILD_COMMAND=(npm --prefix "$DESKTOP_DIR" run build --)
[ "$DEBUG" -eq 1 ] && BUILD_COMMAND+=(--debug)
BUILD_COMMAND+=("${TAURI_BUNDLE_ARGS[@]}")
BUILD_COMMAND+=(--ci)

# The .dmg step runs create-dmg, whose "jenkins" pass drives Finder through
# AppleScript to give the window a background picture. Finder is not reachable
# from a non-interactive session (the AppleEvent times out with -1712), and the
# image is cosmetic, so the CI environment variable is set: Tauri then passes
# --skip-jenkins to bundle_dmg.sh and the disk image is built without it.
(cd "$REPO_ROOT" && CI=true "${BUILD_COMMAND[@]}") || fail "the desktop build failed; the messages above are from cargo/tauri"

# ── results ──────────────────────────────────────────────────────────────────

BUNDLE_ROOT="$TAURI_DIR/target/$PROFILE/bundle"
BINARY="$TAURI_DIR/target/$PROFILE/ofm-desktop"

step "build finished"

APP_PATH=""
for candidate in "$BUNDLE_ROOT/macos"/*.app; do
  if [ -d "$candidate" ]; then APP_PATH="$candidate"; fi
done

DMG_PATH=""
for candidate in "$BUNDLE_ROOT/dmg"/*.dmg; do
  if [ -f "$candidate" ]; then DMG_PATH="$candidate"; fi
done

if [ "$NO_BUNDLE" -eq 0 ] && [ -z "$APP_PATH" ] && [ -z "$DMG_PATH" ]; then
  fail "the build reported success but produced neither an .app nor a .dmg under $BUNDLE_ROOT"
fi

if [ -n "$DMG_PATH" ]; then
  info "Disk image: ${DMG_PATH#"$REPO_ROOT/"}"
  step "sha256: $(shasum -a 256 "$DMG_PATH" | awk '{print $1}')"
fi
if [ -n "$APP_PATH" ]; then
  info "Application bundle: ${APP_PATH#"$REPO_ROOT/"}"
fi
if [ -x "$BINARY" ]; then
  info "Binary: ${BINARY#"$REPO_ROOT/"}"
fi

if [ -n "$DMG_PATH" ] || [ -n "$APP_PATH" ]; then
  cat <<'GUIDANCE'

This build is unsigned and not notarised: there is no Apple Developer
identity behind it, so Gatekeeper blocks the first launch. That is not damage.
Either right-click the app in Finder and choose "Open", or remove the
quarantine flag:

    xattr -cr "/Applications/Our Free Model.app"

or, if macOS still refuses, allow it in System Settings -> Privacy & Security
-> "Open Anyway".
GUIDANCE
fi

info "Done."
