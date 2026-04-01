#!/usr/bin/env bash
set -euo pipefail

BUMP="${1:-patch}"

echo "==> Bumping version ($BUMP)..."

# Bump version in package.json, creates git commit + tag
VERSION=$(npm version "$BUMP" --no-git-tag-version)

# Sync version to CLI --version output
sed -i '' "s/.version(\"[^\"]*\")/.version(\"${VERSION#v}\")/" src/index.ts

echo "==> Building..."
pnpm build

echo "==> Committing version bump..."
git add package.json src/index.ts
git commit -m "$VERSION"
git tag "$VERSION"

echo "==> Pushing to git..."
git push && git push --tags

echo "==> Publishing to npm..."
npm publish --access public

echo "==> Done! Published $VERSION"
