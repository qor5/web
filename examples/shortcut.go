package examples

// @snippet_begin(ShortCutSample)
import (
	"github.com/qor5/web/v3"
	. "github.com/theplant/htmlgo"
)

func ShortCutSample(ctx *web.EventContext) (pr web.PageResponse, err error) {
	clickEvent := "locals.count += 1"
	pr.Body = Div(
		web.Scope(

			Button("count+1").Attr("@click", clickEvent).Class("mr-4"),
			Text("Shortcut: enter"),
			Button("toggle shortcut").Attr("@click", "locals.shortCutEnabled = !locals.shortCutEnabled"),

			Div(
				H2("Shortcut Enabled"),
				Span("").Attr("v-text", "locals.shortCutEnabled"),
			).Class("mb-10"),

			Div(
				H2("Count"),
				Span("").Attr("v-text", "locals.count"),
			),

			web.GlobalEvents().Attr(":filter", `(event, handler, eventName) => locals.shortCutEnabled == true`).Attr("@keydown.enter", clickEvent),
		).Init(`{ shortCutEnabled: true, count: 0 }`).
			VSlot("{ locals, form }"),
	)
	return
}

var ShortCutSamplePB = web.Page(ShortCutSample)

var ShortCutSamplePath = URLPathByFunc(ShortCutSample)

// @snippet_end
