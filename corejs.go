package web

// @snippet_begin(PackrSample)
import (
	"embed"

	"github.com/theplant/osenv"
)

//go:embed corejs/dist/*.js
var box embed.FS

func JSComponentsPack() ComponentsPack {
	v, err := box.ReadFile("corejs/dist/index.js")
	if err != nil {
		panic(err)
	}

	return ComponentsPack(v)
}

var webVueDebug = osenv.GetBool("WEB_VUE_DEBUG", "Use dev vue.js javascript source code to debug vue components", false)

func JSVueComponentsPack() ComponentsPack {
	name := "corejs/dist/vue.global.prod.js"
	if webVueDebug {
		name = "corejs/dist/vue.global.dev.js"
	}
	v, err := box.ReadFile(name)
	if err != nil {
		panic(err)
	}

	return ComponentsPack(v)
}

// @snippet_end
