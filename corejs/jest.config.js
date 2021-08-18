module.exports = {
	preset: '@vue/cli-plugin-unit-jest/presets/typescript-and-babel',
	moduleNameMapper: {'^vue$': 'vue/dist/vue.common.dev.js'}, // for compile runtime template when run tests
}
