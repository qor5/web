CUR=$(pwd)/$(dirname $0)

if test "$1" = 'clean'; then
    echo "Removing node_modules"
    rm -rf $CUR/corejs/node_modules/
fi

rm -r $CUR/corejs/dist
echo "Building corejs"
cd $CUR/corejs && npm install && npm run build
curl -fsSL https://cdn.jsdelivr.net/npm/vue@2.6.14/dist/vue.min.js > $CUR/corejs/dist/vue.min.js
