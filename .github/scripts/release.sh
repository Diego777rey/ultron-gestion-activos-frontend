#!/usr/bin/env bash
set -euo pipefail

PROJECT_TYPE="${PROJECT_TYPE:-npm}"
SKIP_RELEASE_MARKER="[skip release]"

if [[ "${GITHUB_EVENT_NAME:-}" == "push" && "$(git log -1 --pretty=%B)" == *"${SKIP_RELEASE_MARKER}"* ]]; then
  echo "Commit marcado con ${SKIP_RELEASE_MARKER}. Se omite el release."
  exit 0
fi

if [[ "$(git log -1 --pretty=%an)" == "github-actions[bot]" ]]; then
  echo "Commit del bot de Actions. Se omite el release."
  exit 0
fi

read_current_version() {
  jq -r '.version' package.json
}

write_version() {
  local new_version="$1"
  local tmp
  tmp="$(mktemp)"
  jq --arg version "${new_version}" '.version = $version' package.json > "${tmp}"
  mv "${tmp}" package.json
}

bump_version() {
  local current="$1"
  local bump_type="$2"
  python3 - <<PY
major, minor, patch = map(int, "${current}".split("."))
bump = "${bump_type}"
if bump == "patch":
    patch += 1
elif bump == "minor":
    minor += 1
    patch = 0
elif bump == "major":
    major += 1
    minor = 0
    patch = 0
print(f"{major}.{minor}.{patch}")
PY
}

create_initial_release() {
  local version
  version="$(read_current_version)"
  local tag="v${version}"

  if git rev-parse "${tag}" >/dev/null 2>&1; then
    echo "El tag ${tag} ya existe."
    return 0
  fi

  echo "Creando release inicial ${tag}"
  gh release create "${tag}" \
    --title "${tag}" \
    --notes "Release inicial ${tag}."
}

BRANCH=""
if [[ -n "${GITHUB_SHA:-}" ]]; then
  BRANCH="$(gh api "repos/${GITHUB_REPOSITORY}/commits/${GITHUB_SHA}/pulls" --jq '.[0].head.ref // empty' 2>/dev/null || true)"
fi

if ! git tag -l 'v*' | grep -q .; then
  create_initial_release
  exit 0
fi

if [[ -z "${BRANCH}" ]]; then
  echo "No hay PR asociado al commit. Se omite el versionado."
  exit 0
fi

echo "Rama del PR mergeado: ${BRANCH}"

NEW_VERSION=""
BUMP_TYPE=""

if [[ "${BRANCH}" =~ ^release/v([0-9]+\.[0-9]+\.[0-9]+)$ ]]; then
  NEW_VERSION="${BASH_REMATCH[1]}"
elif [[ "${BRANCH}" =~ ^feat/ ]]; then
  BUMP_TYPE="minor"
elif [[ "${BRANCH}" =~ ^fix/ ]]; then
  BUMP_TYPE="patch"
elif [[ "${BRANCH}" =~ ^(refactor|test)/ ]]; then
  BUMP_TYPE="patch"
elif [[ "${BRANCH}" =~ ^(docs|chore|style)/ ]]; then
  echo "La rama ${BRANCH} no genera bump de version."
  exit 0
else
  echo "Prefijo de rama no reconocido: ${BRANCH}. Se omite el versionado."
  exit 0
fi

CURRENT_VERSION="$(read_current_version)"

if [[ -z "${NEW_VERSION}" ]]; then
  NEW_VERSION="$(bump_version "${CURRENT_VERSION}" "${BUMP_TYPE}")"
fi

if [[ "${CURRENT_VERSION}" == "${NEW_VERSION}" ]]; then
  echo "La version ya es ${NEW_VERSION}."
  exit 0
fi

TAG="v${NEW_VERSION}"
if git rev-parse "${TAG}" >/dev/null 2>&1; then
  echo "El tag ${TAG} ya existe."
  exit 0
fi

PR_TITLE="$(gh api "repos/${GITHUB_REPOSITORY}/commits/${GITHUB_SHA}/pulls" --jq '.[0].title // empty' 2>/dev/null || true)"
PR_BODY="$(gh api "repos/${GITHUB_REPOSITORY}/commits/${GITHUB_SHA}/pulls" --jq '.[0].body // empty' 2>/dev/null || true)"

echo "Version: ${CURRENT_VERSION} -> ${NEW_VERSION}"
write_version "${NEW_VERSION}"

git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add .
git commit -m "chore(release): ${TAG} ${SKIP_RELEASE_MARKER}"

git tag "${TAG}"
git push origin main
git push origin "${TAG}"

RELEASE_NOTES="## ${TAG}

- PR: ${PR_TITLE:-Sin titulo}
- Rama: \`${BRANCH}\`
- Version anterior: \`${CURRENT_VERSION}\`

${PR_BODY}"

gh release create "${TAG}" \
  --title "${TAG}" \
  --notes "${RELEASE_NOTES}"

echo "Release ${TAG} publicado."
