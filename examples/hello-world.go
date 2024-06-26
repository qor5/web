package examples

// @snippet_begin(HelloWorldSample)
import (
	"github.com/qor5/web/v3"
	. "github.com/theplant/htmlgo"
)

func HelloWorld(ctx *web.EventContext) (pr web.PageResponse, err error) {
	pr.Body = H1("Hello World")
	return
}

var HelloWorldPB = web.Page(HelloWorld) // this is already a http.Handler

var HelloWorldPath = URLPathByFunc(HelloWorld)

// @snippet_end
