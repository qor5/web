module.exports = {
	runtimeCompiler: true,
	productionSourceMap: false,
	devServer: {
		port: 3100
	},
	configureWebpack: {
		output: {
			libraryExport: 'default'
		},
		externals: { vue: "Vue" },
	}
}
