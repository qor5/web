package examples

import (
	"encoding/json"
	"fmt"
	"net/http"
	"reflect"
	"runtime"
	"strings"

	"github.com/iancoleman/strcase"
	"github.com/qor5/web/v3"
	. "github.com/theplant/htmlgo"
)

func PrettyFormAsJSON(ctx *web.EventContext) HTMLComponent {
	if ctx.R.MultipartForm == nil {
		return nil
	}

	formData, err := json.MarshalIndent(ctx.R.MultipartForm, "", "\t")
	if err != nil {
		panic(err)
	}

	return Pre(
		string(formData),
	)
}

type IndexMux struct {
	Mux   *http.ServeMux
	paths []string
}

func (im *IndexMux) Page(ctx *web.EventContext) (r web.PageResponse, err error) {
	ul := Ol().Style("font-family: monospace;")
	for _, p := range im.paths {
		ul.AppendChildren(Li(A().Href(p).Text(p).Target("_blank")))
	}
	r.Body = ul
	return
}

func (im *IndexMux) Handle(pattern string, handler http.Handler) {
	im.paths = append(im.paths, pattern)
	fmt.Println("mounting", pattern)
	im.Mux.Handle(pattern, handler)
	im.Mux.Handle(pattern+"/", handler)
}

func URLPathByFunc(v interface{}) string {
	funcNameWithPkg := runtime.FuncForPC(reflect.ValueOf(v).Pointer()).Name()
	segs := strings.Split(funcNameWithPkg, ".")
	return "/examples/" + strcase.ToKebab(segs[len(segs)-1])
}
