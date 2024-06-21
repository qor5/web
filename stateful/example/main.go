package main

import (
	"fmt"
	"net/http"

	"github.com/qor5/web/v3"
	"github.com/qor5/web/v3/stateful/example/todomvc"
	"github.com/theplant/osenv"
)

func main() {
	port := osenv.Get("PORT", "The port to serve the admin on", "9000")
	fmt.Println("Served at http://localhost:" + port)

	mainJsPath := "/main.js"

	mux := http.NewServeMux()
	mux.Handle(mainJsPath,
		web.Default.PacksHandler(
			"text/javascript",
			web.JSVueComponentsPack(),
			web.JSComponentsPack(),
		),
	)
	mux.Handle("/", todomvc.TodoMVCExamplePB.Wrap(func(in web.PageFunc) web.PageFunc {
		return func(ctx *web.EventContext) (pr web.PageResponse, err error) {
			ctx.Injector.TailHTML(fmt.Sprintf(`<script src=%q></script>`, mainJsPath))
			return in(ctx)
		}
	}))

	err := http.ListenAndServe(":"+port, mux)
	if err != nil {
		panic(err)
	}
}
