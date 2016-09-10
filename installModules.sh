#!/bin/bash
set -e

BASEDIR=`pwd`
for f in `find . -mindepth 2 -maxdepth 3 -name "package.json" -and -not -path "./node_modules/*" -exec dirname {} \;`; do
  echo "Installing modules for $f"
  cd "$BASEDIR/$f"
  npm install
done
