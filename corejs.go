package web

// @snippet_begin(PackrSample)
import (
	"embed"
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
	v, err := box.ReadFile("corejs/dist/vue.global.prod.js")
	if err != nil {
		panic(err)
	}

	return ComponentsPack(v)
}

// @snippet_end
