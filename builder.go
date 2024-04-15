package web

import (
	"bytes"
	"context"
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
	var buf = bytes.NewBuffer(nil)
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

func NoopLayoutFunc(r *http.Request, injector *PageInjector, body string) (output string, err error) {
	output = body
	return
}

func defaultLayoutFunc(r *http.Request, injector *PageInjector, body string) (output string, err error) {
	root := h.HTMLComponents{
		h.RawHTML("<!DOCTYPE html>\n"),
		h.Tag("html").Children(
			h.Head(
				injector.GetHeadHTMLComponent(),
			),
			h.Body(
				h.Div(
					h.RawHTML(body),
				).Id("app").Attr("v-cloak", true),
				injector.GetTailHTMLComponent(),
			).Class("front"),
		).AttrIf("lang", injector.GetHTMLLang(), injector.GetHTMLLang() != ""),
	}

	buf := bytes.NewBuffer(nil)
	ctx := new(EventContext)
	ctx.R = r

	err = h.Fprint(buf, root, WrapEventContext(context.TODO(), ctx))
	if err != nil {
		return
	}

	output = buf.String()
	return
}
