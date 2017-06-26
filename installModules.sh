#!/bin/bash
set -e

ACTION=${1:-install}

if [[ ! -d "./modules" ]]; then
  1>&2 echo "$0 must be run from the base directory of the repo"
  exit 1
fi

for dir in `find . -mindepth 2 -maxdepth 3 -name "package.json" -and -not -path "./node_modules/*" -exec dirname {} \;`; do
  echo "Installing modules for $f"
  pushd "$dir"
  yarn "${ACTION}"
  popd
done
