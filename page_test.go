package web_test

import (
	"bytes"
	"context"
	"fmt"
	"io/ioutil"
	"mime/multipart"
	"net/http/httptest"
	"testing"

	. "github.com/goplaid/web"
	h "github.com/theplant/htmlgo"
	"github.com/theplant/htmltestingutils"
	"github.com/theplant/testingutils"
	goji "goji.io"
	"goji.io/pat"
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
	eventFormChanger func(mw *multipart.Writer),
) (indexResp *bytes.Buffer, eventResp *bytes.Buffer) {
	pb := New()

	var f = func(ctx *EventContext) (r EventResponse, err error) {
		r.Reload = true
		return
	}

	if eventFunc != nil {
		f = eventFunc
	}

	var p = pb.Page(func(ctx *EventContext) (pr PageResponse, err error) {
		ctx.Hub.RegisterEventFunc("call", f)

		if renderChanger != nil {
			renderChanger(ctx, &pr)
		} else {
			pr.Body = h.H1("Hello")
		}
		return
	})

	r := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()
	p.ServeHTTP(w, r)

	indexResp = w.Body

	body := bytes.NewBuffer(nil)

	mw := multipart.NewWriter(body)
	_ = mw.WriteField("__event_data__", `{"eventFuncId":{"id":"call","pushState":null},"event":{"value":""}}
	`)

	if eventFormChanger != nil {
		eventFormChanger(mw)
	}

	_ = mw.Close()

	r = httptest.NewRequest("POST", "/?__execute_event__=call", body)
	r.Header.Add("Content-Type", fmt.Sprintf("multipart/form-data; boundary=%s", mw.Boundary()))

	w = httptest.NewRecorder()
	p.ServeHTTP(w, r)

	eventResp = w.Body
	return
}

func TestFileUpload(t *testing.T) {
	type mystate struct {
		File1 []*multipart.FileHeader `form:"-"`
	}

	var uploadFile = func(ctx *EventContext) (r EventResponse, err error) {
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

		ctx.Hub.RegisterEventFunc("uploadFile", uploadFile)

		pr.Body = h.H1(string(data))
		return
	})

	body := bytes.NewBuffer(nil)

	mw := multipart.NewWriter(body)
	_ = mw.WriteField("__event_data__", `{"eventFuncId":{"id":"uploadFile","pushState":null},"event":{"value":""}}
	`)
	fw, _ := mw.CreateFormFile("File1", "myfile.txt")
	_, _ = fw.Write([]byte("Hello"))

	_ = mw.Close()

	r := httptest.NewRequest("POST", "/?__execute_event__=uploadFile", body)
	r.Header.Add("Content-Type", fmt.Sprintf("multipart/form-data; boundary=%s", mw.Boundary()))

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

type DummyComp struct {
}

func (dc *DummyComp) MarshalHTML(ctx context.Context) (r []byte, err error) {
	r = []byte("<div>hello</div>")
	return
}

var eventCases = []struct {
	name              string
	eventFunc         EventFunc
	renderChanger     func(ctx *EventContext, pr *PageResponse)
	eventFormChanger  func(mw *multipart.Writer)
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
			ctx.Injector.TailHTML("<script src='/assets/main.js'></script>")
			pr.Body = &DummyComp{}
		},
		expectedEventResp: `{
	"body": "\u003cdiv\u003ehello\u003c/div\u003e",
	"reload": true,
	"pushState": null
}`,
		expectedIndexResp: `<!DOCTYPE html>

<html>
<head><meta charset="utf8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"/>
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
	}
}

var mountCases = []struct {
	name     string
	method   string
	path     string
	bodyFunc func(w *multipart.Writer)
	expected string
}{
	{
		name:     "with param get",
		method:   "GET",
		path:     "/home/topics/xgb123",
		bodyFunc: nil,
		expected: `<div><a href="#" v-on:click='triggerEventFunc({"id":"bookmark","pushState":null}, $event, null)'>xgb123</a></div>`,
	},
	{
		name:   "with param post",
		method: "POST",
		path:   "/home/topics/xgb123?__execute_event__",
		bodyFunc: func(w *multipart.Writer) {
			_ = w.WriteField("__event_data__", `{"eventFuncId":{"id":"bookmark","pushState":null},"event":{"value":""}}`)
		},
		expected: `{"body":"\n\u003ch1\u003exgb123 bookmarked\u003c/h1\u003e\n","pushState":null}`,
	},
}

func TestMultiplePagesAndEvents(t *testing.T) {
	var topicIndex = func(ctx *EventContext) (r PageResponse, err error) {
		r.Body = h.H1("Hello Topic List")
		return
	}

	var bookmark = func(ctx *EventContext) (r EventResponse, err error) {
		topicId := pat.Param(ctx.R, "topicID")
		r.Body = h.H1(topicId + " bookmarked")
		return
	}

	var topicDetail = func(ctx *EventContext) (r PageResponse, err error) {
		ctx.Hub.RegisterEventFunc("bookmark", bookmark)

		topicId := pat.Param(ctx.R, "topicID")
		r.Body = h.Div(
			Bind(h.A().Href("#").Text(topicId)).
				OnClick("bookmark"),
		)
		return
	}

	pb := New()

	mux := goji.NewMux()
	mux.Handle(pat.New("/home/topics/:topicID"), pb.Page(topicDetail))
	mux.Handle(pat.New("/home/topics"), pb.Page(topicIndex))

	for _, c := range mountCases {

		buf := new(bytes.Buffer)
		var mw *multipart.Writer
		if c.bodyFunc != nil {
			mw = multipart.NewWriter(buf)
			c.bodyFunc(mw)
			_ = mw.Close()
		}

		r := httptest.NewRequest(c.method, c.path, buf)
		if mw != nil {
			r.Header.Add("Content-Type", fmt.Sprintf("multipart/form-data; boundary=%s", mw.Boundary()))
		}
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		selector := "#app div"
		if mw != nil {
			selector = "*"
		}
		diff := htmltestingutils.PrettyHtmlDiff(w.Body, selector, c.expected)
		if len(diff) > 0 {
			t.Error(c.name, diff)
		}

	}

}
