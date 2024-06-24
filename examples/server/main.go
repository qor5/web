package main

import (
	"fmt"
	"net/http"

	"github.com/qor5/web/v3"
	"github.com/qor5/web/v3/examples"
	"github.com/theplant/osenv"
)

func main() {
	port := osenv.Get("PORT", "The port to serve the admin on", "9000")

	mux := http.NewServeMux()
	mux.Handle("/assets/main.js",
		web.PacksHandler("text/javascript",
			web.JSComponentsPack(),
		),
	)

	mux.Handle("/assets/vue.js",
		web.PacksHandler("text/javascript",
			web.JSVueComponentsPack(),
		),
	)

	im := &examples.IndexMux{Mux: mux}
	examples.Mux(im)
	mux.Handle("/", web.New().Page(im.Page))
	fmt.Println("Served at http://localhost:" + port)
	err := http.ListenAndServe(":"+port, mux)
	if err != nil {
		panic(err)
	}
}
