CUR=$(pwd)/$(dirname $0)

if test "$1" = 'clean'; then
    echo "Removing node_modules"
    rm -rf $CUR/corejs/node_modules/
fi

rm -r $CUR/corejs/dist/*
echo "Building corejs"
cd $CUR/corejs && pnpm install && pnpm format && pnpm run build
curl -fsSL https://unpkg.com/vue@3.x/dist/vue.global.prod.js > $CUR/corejs/dist/vue.global.prod.js
curl -fsSL https://unpkg.com/vue@3.x/dist/vue.global.js > $CUR/corejs/dist/vue.global.dev.js
