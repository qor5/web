package web

// @snippet_begin(PackrSample)
import (
	"github.com/gobuffalo/packr"
)

var box = packr.NewBox("./corejs/dist/")

func JSComponentsPack() ComponentsPack {
	v, err := box.FindString("core.umd.min.js")
	if err != nil {
		panic(err)
	}

	return ComponentsPack(v)
}

func JSVueComponentsPack() ComponentsPack {
	v, err := box.FindString("vue.min.js")
	if err != nil {
		panic(err)
	}

	return ComponentsPack(v)
}

// @snippet_end
