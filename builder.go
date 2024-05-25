package web

import (
	"bytes"
	"net/http"
	"strings"
	"time"

	"github.com/NYTimes/gziphandler"
	h "github.com/theplant/htmlgo"
)

type Builder struct {
	EventsHub
	layoutFunc LayoutFunc
}

func New() (b *Builder) {
	b = new(Builder)
	b.layoutFunc = defaultLayoutFunc
	return
}

func (b *Builder) LayoutFunc(mf LayoutFunc) (r *Builder) {
	if mf == nil {
		panic("layout func is nil")
	}
	b.layoutFunc = mf
	return b
}

func (p *Builder) EventFuncs(vs ...interface{}) (r *Builder) {
	p.addMultipleEventFuncs(vs...)
	return p
}

type ComponentsPack string

var startTime = time.Now()

func PacksHandler(contentType string, packs ...ComponentsPack) http.Handler {
	return Default.PacksHandler(contentType, packs...)
}

func (b *Builder) PacksHandler(contentType string, packs ...ComponentsPack) http.Handler {
	buf := bytes.NewBuffer(nil)
	for _, pk := range packs {
		// buf = append(buf, []byte(fmt.Sprintf("\n// pack %d\n", i+1))...)
		// buf = append(buf, []byte(fmt.Sprintf("\nconsole.log('pack %d, length %d');\n", i+1, len(pk)))...)
		buf.WriteString(string(pk))
		// fmt.Println(contentType)
		if strings.Contains(strings.ToLower(contentType), "javascript") {
			buf.WriteString(";")
		}
		buf.WriteString("\n\n")
	}

	body := bytes.NewReader(buf.Bytes())

	return gziphandler.GzipHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", contentType)
		http.ServeContent(w, r, "", startTime, body)
	}))
}

func NoopLayoutFunc(in PageFunc) PageFunc {
	return in
}

func defaultLayoutFunc(in PageFunc) PageFunc {
	return func(ctx *EventContext) (r PageResponse, err error) {
		r, err = in(ctx)
		if r.PageTitle != "" {
			ctx.Injector.Title(r.PageTitle)
		}
		if err != nil {
			panic(err)
		}
		r.Body = h.HTMLComponents{
			h.RawHTML("<!DOCTYPE html>\n"),
			h.Tag("html").Children(
				h.Head(
					ctx.Injector.GetHeadHTMLComponent(),
				),
				h.Body(
					h.Div(
						r.Body,
					).Id("app").Attr("v-cloak", true),
					ctx.Injector.GetTailHTMLComponent(),
				).Class("front"),
			).Attr(ctx.Injector.HTMLLangAttrs()...),
		}
		return
	}
}
