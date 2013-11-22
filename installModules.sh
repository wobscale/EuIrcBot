BASEDIR=`pwd`;
for f in `find . -mindepth 2 -maxdepth 3 -name "package.json" -and -not -path "./node_modules/*" -exec dirname {} \;`
do
  cd "$BASEDIR/$f"
  npm install
done
