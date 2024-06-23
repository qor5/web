package examples

import (
	"fmt"
	"net/url"
	"time"

	"github.com/qor5/web/v3"
	. "github.com/theplant/htmlgo"
)

// @snippet_begin(EventHandlingURLSample)
func EventHandlingURL(ctx *web.EventContext) (pr web.PageResponse, err error) {
	pr.Body = Div(
		Div(
			H2("URL"),
			Button("Go").Attr("@click", web.GET().URL(EventExamplePagePath).Go()),
		),
	)
	return
}

// @snippet_end

// @snippet_begin(EventHandlingPushStateSample)
func EventHandlingPushState(ctx *web.EventContext) (pr web.PageResponse, err error) {
	pr.Body = Div(
		H2("PushState"),

		Button("Go").Attr("@click", web.GET().
			URL(EventExamplePagePath).
			PushState(true).
			Go()),
	)
	return
}

// @snippet_end

// @snippet_begin(EventHandlingReloadSample)
func EventHandlingReload(ctx *web.EventContext) (pr web.PageResponse, err error) {
	pr.Body = Div(
		H2("Reload"),
		Text(fmt.Sprintf("Now: %s", time.Now().Format(time.RFC3339Nano))),
		Button("Reload").Attr("@click", web.POST().Reload().Go()),
	)
	return
}

// @snippet_end

// @snippet_begin(EventHandlingQuerySample)
func EventHandlingQuery(ctx *web.EventContext) (pr web.PageResponse, err error) {
	pr.Body = Div(
		H2("Query"),
		Button("Go").Attr("@click", web.GET().URL(EventExamplePagePath).PushState(true).Query("address", "tokyo").Go()),
	)

	return
}

// @snippet_end

// @snippet_begin(EventHandlingMergeQuerySample)
func EventHandlingMergeQuery(ctx *web.EventContext) (pr web.PageResponse, err error) {
	pr.Body = Div(
		H2("MergeQuery"),

		Button("Go").Attr("@click", web.GET().URL(EventExamplePagePath+"?address=beijing&name=qor5&email=qor5@theplant.jp").PushState(true).Query("address", "tokyo").MergeQuery(true).Go()),
	)
	return
}

// @snippet_end

// @snippet_begin(EventHandlingClearMergeQuerySample)
func EventHandlingClearMergeQueryQuery(ctx *web.EventContext) (pr web.PageResponse, err error) {
	pr.Body = Div(
		H2("ClearMergeQuery"),

		Button("Go").Attr("@click", web.GET().
			URL(EventExamplePagePath+"?address=beijing&name=qor5&email=qor5@theplant.jp").
			PushState(true).
			Query("address", "tokyo").
			ClearMergeQuery([]string{"name"}).
			Go()),
	)
	return
}

// @snippet_end

// @snippet_begin(EventHandlingStringQuerySample)
func EventHandlingStringQuery(ctx *web.EventContext) (pr web.PageResponse, err error) {
	pr.Body = Div(
		H2("StringQuery"),

		Button("Go").Attr("@click", web.GET().
			URL(EventExamplePagePath).
			PushState(true).
			StringQuery("address=tokyo").
			Go()),
	)
	return
}

// @snippet_end

// @snippet_begin(EventHandlingQueriesSample)
func EventHandlingQueries(ctx *web.EventContext) (pr web.PageResponse, err error) {
	pr.Body = Div(
		H2("Queries"),

		Button("Go").Attr("@click", web.GET().
			URL(EventExamplePagePath).
			PushState(true).
			Queries(url.Values{"address": []string{"tokyo"}}).
			Go()),
	)
	return
}

// @snippet_end

// @snippet_begin(EventHandlingPushStateURLSample)
func EventHandlingPushStateURL(ctx *web.EventContext) (pr web.PageResponse, err error) {
	pr.Body = Div(
		H2("PushStateURL"),

		Button("Go").Attr("@click", web.GET().
			PushStateURL(EventExamplePagePath).
			Go()),
	)
	return
}

// @snippet_end

// @snippet_begin(EventHandlingLocationSample)
func EventHandlingLocation(ctx *web.EventContext) (pr web.PageResponse, err error) {
	pr.Body = Div(
		H2("Location"),

		Button("Go").Attr("@click", web.POST().
			PushState(true).
			Location(&web.LocationBuilder{MyURL: EventExamplePagePath, MyStringQuery: "address=test"}).
			Go()),
	)
	return
}

// @snippet_end

// @snippet_begin(EventHandlingFieldValueSample)
func EventHandlingFieldValue(ctx *web.EventContext) (pr web.PageResponse, err error) {
	pr.Body = Div(
		H2("FieldValue"),

		Button("Go").Attr("@click", web.POST().
			EventFunc("form").
			FieldValue("name", "qor5").
			Go()),
	)
	return
}

// @snippet_end

// @snippet_begin(EventHandlingEventFuncSample)
func EventHandlingEventFunc(ctx *web.EventContext) (pr web.PageResponse, err error) {
	pr.Body = Div(
		H2("EventFunc"),
		Button("Go").Attr("@click", web.POST().
			EventFunc("hello").
			Go()),
	)
	return
}

// @snippet_end

// @snippet_begin(EventHandlingBeforeScriptSample)
func EventHandlingScript(ctx *web.EventContext) (pr web.PageResponse, err error) {
	addMessageScript := func(msg string) string {
		return fmt.Sprintf(`vars.messages ||= []; vars.messages.push(%q)`, msg)
	}
	pr.Body = Div(
		H2("Script"),

		Button("Go").Attr("@click",
			web.POST().
				BeforeScript(addMessageScript("this is before script")).
				AfterScript(addMessageScript("this is after script")).
				ThenScript(addMessageScript("this is then script")).
				Go(),
		),
		Div().Text(`{{ vars.messages }}`),
	)
	return
}

// @snippet_end

// @snippet_begin(EventHandlingRawSample)
func EventHandlingRaw(ctx *web.EventContext) (pr web.PageResponse, err error) {
	pr.Body = Div(
		H2("Raw"),
		Button("Go").Attr("@click", web.POST().
			Raw(`pushStateURL("/samples/event_handling/example")`).
			Go()),
	)
	return
}

// @snippet_end

var apiExamples = []struct {
	key  string
	page web.PageFunc
}{
	{"url", EventHandlingURL},
	{"pushstate", EventHandlingPushState},
	{"eventfunc", EventHandlingEventFunc},
	{"reload", EventHandlingReload},
	{"query", EventHandlingQuery},
	{"merge_query", EventHandlingMergeQuery},
	{"clear_merge_query", EventHandlingClearMergeQueryQuery},
	{"string_query", EventHandlingStringQuery},
	{"queries", EventHandlingQueries},
	{"pushstateurl", EventHandlingPushStateURL},
	{"fieldvalue", EventHandlingFieldValue},
	{"script", EventHandlingScript},
	{"location", EventHandlingLocation},
	{"raw", EventHandlingRaw},
}

func EventHandlingPage(ctx *web.EventContext) (pr web.PageResponse, err error) {
	api := ctx.R.URL.Query().Get("api")
	for _, apiEx := range apiExamples {
		if apiEx.key == api {
			return apiEx.page(ctx)
		}
	}

	body := Ul()

	for _, k := range apiExamples {
		body.AppendChildren(
			Li(A().Text(k.key).Attr("href", "?api="+k.key)),
		)
	}

	pr.Body = body
	return
}

func ExamplePage(ctx *web.EventContext) (pr web.PageResponse, err error) {
	pr.Body = Div(
		H1("ExamplePage"),
	)
	return
}

var ExamplePagePB = web.Page(ExamplePage)

var EventHandlingPagePB = web.Page(EventHandlingPage).
	EventFunc("form", func(ctx *web.EventContext) (r web.EventResponse, err error) {
		r.RunScript = fmt.Sprintf(`alert("form data is %s")`, ctx.R.FormValue("name"))
		return
	}).
	EventFunc("hello", func(ctx *web.EventContext) (r web.EventResponse, err error) {
		r.RunScript = `alert("Hello World")`
		return
	})

var (
	EventHandlingPagePath = URLPathByFunc(EventHandlingPage)
	EventExamplePagePath  = URLPathByFunc(ExamplePage)
)
