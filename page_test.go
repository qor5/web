package web_test

import (
	"bytes"
	"context"
	"io/ioutil"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	h "github.com/theplant/htmlgo"
	"github.com/theplant/htmltestingutils"
	"github.com/theplant/testingutils"

	. "github.com/qor5/web/v3"
	"github.com/qor5/web/v3/multipartestutils"
)

type User struct {
	Name    string
	Address *Address
}

type Address struct {
	Zipcode string
	City    string
}

func runEvent(
	eventFunc EventFunc,
	renderChanger func(ctx *EventContext, pr *PageResponse),
	eventFormChanger func(builder *multipartestutils.Builder),
) (indexResp *bytes.Buffer, eventResp *bytes.Buffer) {
	pb := New()

	f := func(ctx *EventContext) (r EventResponse, err error) {
		r.Reload = true
		return
	}

	if eventFunc != nil {
		f = eventFunc
	}

	p := pb.Page(func(ctx *EventContext) (pr PageResponse, err error) {
		if renderChanger != nil {
			renderChanger(ctx, &pr)
		} else {
			pr.Body = h.H1("Hello")
		}
		return
	}).EventFunc("call", f)

	r := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()
	p.ServeHTTP(w, r)

	indexResp = w.Body

	builder := multipartestutils.NewMultipartBuilder().
		EventFunc("call")

	if eventFormChanger != nil {
		eventFormChanger(builder)
	}

	r = builder.BuildEventFuncRequest()
	w = httptest.NewRecorder()
	p.ServeHTTP(w, r)

	eventResp = w.Body
	return
}

func TestFileUpload(t *testing.T) {
	type mystate struct {
		File1 []*multipart.FileHeader `form:"-"`
	}

	uploadFile := func(ctx *EventContext) (r EventResponse, err error) {
		s := &mystate{}
		ctx.MustUnmarshalForm(s)

		ctx.Flash = s
		r.Reload = true
		return
	}

	pb := New()
	p := pb.Page(func(ctx *EventContext) (pr PageResponse, err error) {
		s := &mystate{}
		if ctx.Flash != nil {
			s = ctx.Flash.(*mystate)
		}

		var data []byte
		if len(s.File1) > 0 {
			var mf multipart.File
			mf, err = s.File1[0].Open()
			if err != nil {
				panic(err)
			}
			data, err = ioutil.ReadAll(mf)
			if err != nil {
				panic(err)
			}
		}

		pr.Body = h.H1(string(data))
		return
	}).EventFunc("uploadFile", uploadFile)

	b := multipartestutils.NewMultipartBuilder().
		EventFunc("uploadFile").
		AddReader("File1", "myfile.txt", strings.NewReader("Hello"))

	r := b.BuildEventFuncRequest()
	w := httptest.NewRecorder()
	p.ServeHTTP(w, r)

	diff := testingutils.PrettyJsonDiff(`
{
	"body": "\n\u003ch1\u003eHello\u003c/h1\u003e\n",
	"reload": true,
	"pushState": null
}
	`, w.Body.String())
	if len(diff) > 0 {
		t.Error(diff)
	}
}

type DummyComp struct{}

func (dc *DummyComp) MarshalHTML(ctx context.Context) (r []byte, err error) {
	r = []byte("<div>hello</div>")
	return
}

var eventCases = []struct {
	name              string
	eventFunc         EventFunc
	renderChanger     func(ctx *EventContext, pr *PageResponse)
	eventFormChanger  func(b *multipartestutils.Builder)
	expectedIndexResp string
	expectedEventResp string
}{
	{
		name: "run event reload states",
		renderChanger: func(ctx *EventContext, pr *PageResponse) {
			s := &User{
				Address: &Address{},
			}
			if ctx.Flash != nil {
				s = ctx.Flash.(*User)
			}
			pr.Body = h.Text(s.Name + " " + s.Address.City)
			s.Name = "Felix"
		},
		eventFunc: func(ctx *EventContext) (r EventResponse, err error) {
			s := &User{}
			ctx.MustUnmarshalForm(s)
			r.Reload = true
			s.Name = "Felix1"
			s.Address = &Address{City: "Hangzhou"}

			ctx.Flash = s
			return
		},
		expectedEventResp: `{
	"body": "Felix1 Hangzhou",
	"reload": true,
	"pushState": null
}
`,
	},
	{
		name: "render body in event func",
		eventFunc: func(ctx *EventContext) (r EventResponse, err error) {
			r.Body = h.Div(
				h.H1("hello"),
			)
			return
		},
		expectedEventResp: `{
	"body": "\n\u003cdiv\u003e\n\u003ch1\u003ehello\u003c/h1\u003e\n\u003c/div\u003e\n",
	"pushState": null
}`,
	},

	{
		name: "case 1",
		renderChanger: func(ctx *EventContext, pr *PageResponse) {
			pr.Body = h.RawHTML("<h1>Hello</h1>")
		},
		expectedEventResp: `
	{
		"body": "\u003ch1\u003eHello\u003c/h1\u003e",
		"reload": true,
		"pushState": null
	}
			`,
	},
	{
		name: "case 2",
		renderChanger: func(ctx *EventContext, pr *PageResponse) {
			ctx.Injector.TailHTMLComponent("mainjs", h.RawHTML("<script src='/assets/main.js'></script>"), false)
			pr.Body = &DummyComp{}
		},
		expectedEventResp: `{
	"body": "\u003cdiv\u003ehello\u003c/div\u003e",
	"reload": true,
	"pushState": null
}`,
		expectedIndexResp: `<!DOCTYPE html>

<html>
<head>
<meta charset='utf8'>

<meta name='viewport' content='width=device-width, initial-scale=1, shrink-to-fit=no'>
</head>

<body class='front'>
<div id='app' v-cloak><div>hello</div></div>
<script src='/assets/main.js'></script></body>
</html>

`,
	},
}

func TestEvents(t *testing.T) {
	for _, c := range eventCases {
		t.Run(c.name, func(t *testing.T) {
			indexResp, eventResp := runEvent(c.eventFunc, c.renderChanger, c.eventFormChanger)
			var diff string
			if len(c.expectedIndexResp) > 0 {
				diff = testingutils.PrettyJsonDiff(c.expectedIndexResp, indexResp)

				if len(diff) > 0 {
					t.Error(c.name, diff)
				}
			}

			if len(c.expectedEventResp) > 0 {
				diff = testingutils.PrettyJsonDiff(c.expectedEventResp, eventResp.String())
				if len(diff) > 0 {
					t.Error(c.name, diff)
				}
			}
		})
	}
}

var mountCases = []struct {
	name     string
	method   string
	path     string
	bodyFunc func(b *multipartestutils.Builder)
	expected string
}{
	{
		name:     "with param get",
		method:   "GET",
		path:     "/home/topics/xgb123",
		bodyFunc: nil,
		expected: `
<div>
	<a href="#" v-on:click='plaid().vars(vars).locals(locals).form(form).dash(dash).eventFunc("bookmark").go()'>xgb123</a>
	<a href="#" v-on:blur='alert(1); plaid().vars(vars).locals(locals).form(form).dash(dash).fieldValue("Text1", $event).eventFunc("doIt").go()'>hello</a>
</div>
`,
	},
	{
		name:   "with param post",
		method: "POST",
		path:   "/home/topics/xgb123",
		bodyFunc: func(b *multipartestutils.Builder) {
			b.EventFunc("bookmark")
		},
		expected: `{"body":"\n\u003ch1\u003exgb123 bookmarked\u003c/h1\u003e\n","pushState":null}`,
	},
}

func TestMultiplePagesAndEvents(t *testing.T) {
	topicIndex := func(ctx *EventContext) (r PageResponse, err error) {
		r.Body = h.H1("Hello Topic List")
		return
	}

	bookmark := func(ctx *EventContext) (r EventResponse, err error) {
		topicId := ctx.R.PathValue("topicID")
		r.Body = h.H1(topicId + " bookmarked")
		return
	}

	topicDetail := func(ctx *EventContext) (r PageResponse, err error) {
		// remove to test global event func with web.New().RegisterEventFunc
		// ctx.Hub.RegisterEventFunc("bookmark", bookmark)

		topicId := ctx.R.PathValue("topicID")
		r.Body = h.Div(
			h.A().Href("#").Text(topicId).
				Attr("v-on:click", Plaid().EventFunc("bookmark").Go()),
			h.A().Href("#").Text("hello").
				Attr("v-on:blur", Plaid().
					BeforeScript("alert(1)").
					FieldValue("Text1", Var("$event")).
					EventFunc("doIt").
					Go(),
				),
		)
		return
	}

	pb := New()
	pb.RegisterEventFunc("bookmark", bookmark)

	mux := http.NewServeMux()
	mux.Handle("/home/topics/{topicID}", pb.Page(topicDetail))
	mux.Handle("/home/topics", pb.Page(topicIndex))

	for _, c := range mountCases {
		t.Run(c.name, func(t *testing.T) {
			r := httptest.NewRequest(c.method, c.path, nil)
			if c.bodyFunc != nil {
				b := multipartestutils.NewMultipartBuilder().
					PageURL(c.path)
				c.bodyFunc(b)
				r = b.BuildEventFuncRequest()
			}

			w := httptest.NewRecorder()
			mux.ServeHTTP(w, r)
			selector := "#app div"
			if c.bodyFunc != nil {
				selector = "*"
			}
			diff := htmltestingutils.PrettyHtmlDiff(w.Body, selector, c.expected)
			if len(diff) > 0 {
				t.Error(c.name, diff)
			}
		})
	}
}

func TestEventFuncsOnPageAndBuilder(t *testing.T) {
	w := httptest.NewRecorder()
	r := multipartestutils.NewMultipartBuilder().
		EventFunc("g1").BuildEventFuncRequest()

	b := New().EventFuncs(
		"g1", func(ctx *EventContext) (r EventResponse, err error) {
			r.Body = h.H2("G1")
			return
		},
	)

	b.Page(func(ctx *EventContext) (r PageResponse, err error) {
		r.Body = h.H1("Page")
		return
	}).EventFuncs(
		"e1", func(ctx *EventContext) (r EventResponse, err error) {
			r.Body = h.H2("E1")
			return
		},
	).ServeHTTP(w, r)

	if !strings.Contains(w.Body.String(), "G1") {
		t.Errorf("wrong response %s", w.Body.String())
	}
}

func TestPageFuncReturnEmptyBody(t *testing.T) {
	pfWithEmptyBody := func(ctx *EventContext) (r PageResponse, err error) {
		return
	}
	b := New()
	r, w := httptest.NewRequest("get", "/", nil), httptest.NewRecorder()
	b.Page(pfWithEmptyBody).ServeHTTP(w, r)
}

func TestEmbed(t *testing.T) {
	pack := JSComponentsPack()
	if len(pack) == 0 {
		t.Fatal("No embed string")
	}
}

func PageFunc1(ctx *EventContext) (r PageResponse, err error) {
	r.Body = h.H1("Page1")
	ctx.WithContextValue("afterTitle", h.H2("abc")).
		WithContextValue("customizeHeader", h.Components())

	ctx.R = ctx.R.WithContext(context.WithValue(ctx.R.Context(), "abc", h.H2("abc")))
	return
}

func Layout1(pf PageFunc) (r PageFunc) {
	return func(ctx *EventContext) (r PageResponse, err error) {
		pr, err := pf(ctx)
		if err != nil {
			panic(err)
		}

		var header h.HTMLComponent = h.Header()
		if ctx.ContextValue("customizeHeader") != nil {
			header = ctx.ContextValue("customizeHeader").(h.HTMLComponent)
		}
		r.Body = h.Div(
			header,
			ctx.ContextValue("afterTitle").(h.HTMLComponent),
			ctx.ContextValue("abc").(h.HTMLComponent),
			pr.Body,
		)
		return
	}
}

func TestLayoutWithExtra(t *testing.T) {
	pf := Layout1(PageFunc1)
	w := httptest.NewRecorder()
	r := httptest.NewRequest("GET", "/", nil)
	Page(pf).ServeHTTP(w, r)
	if !strings.Contains(w.Body.String(), "abc") {
		t.Errorf("wrong response %s", w.Body.String())
	}
}
