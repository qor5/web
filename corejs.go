package web

// @snippet_begin(PackrSample)
import (
	"embed"
	"os"
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

func JSVueComponentsPack() ComponentsPack {
	name := "corejs/dist/vue.global.prod.js"
	if os.Getenv("WEB_VUE_DEBUG") == "true" {
		name = "corejs/dist/vue.global.dev.js"
	}
	v, err := box.ReadFile(name)
	if err != nil {
		panic(err)
	}

	return ComponentsPack(v)
}

// @snippet_end
