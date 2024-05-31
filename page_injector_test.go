package web_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/qor5/web/v3"
	"github.com/qor5/web/v3/multipartestutils"
	h "github.com/theplant/htmlgo"
	"github.com/theplant/testingutils"
)

var cases = []struct {
	name      string
	operation func(b *web.PageInjector)
	expected  string
}{
	{
		name: "title",
		operation: func(b *web.PageInjector) {
			b.Title("Hello")
		},
		expected: `<title>Hello</title>

<meta charset='utf8'>

<meta name='viewport' content='width=device-width, initial-scale=1, shrink-to-fit=no'>
		`,
	},
	{
		name: "title and charset",
		operation: func(b *web.PageInjector) {
			b.Title("Hello")
			b.Meta(web.MetaKey("charset"), "charset", "shiftjis")
		},
		expected: `<title>Hello</title>

<meta charset='shiftjis'>

<meta name='viewport' content='width=device-width, initial-scale=1, shrink-to-fit=no'>
`,
	},
	{
		name: "title and charset double",
		operation: func(b *web.PageInjector) {
			b.Title("Hello")
			b.Meta(web.MetaKey("charset"), "charset", "shiftjis")
			b.Meta(web.MetaKey("charset"), "charset", "utf8")
			b.MetaNameContent("keywords", "Hello")
		},
		expected: `<title>Hello</title>

<meta charset='utf8'>

<meta name='keywords' content='Hello'>

<meta name='viewport' content='width=device-width, initial-scale=1, shrink-to-fit=no'>
`,
	},

	{
		name: "script tag",
		operation: func(b *web.PageInjector) {
			b.HeadHTML(`
<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=UA-123123-1"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'UA-123123-1');
</script>
`)
		},
		expected: `
<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=UA-123123-1"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'UA-123123-1');
</script>

<meta charset='utf8'>

<meta name='viewport' content='width=device-width, initial-scale=1, shrink-to-fit=no'>
`,
	},
}

func TestDefaultPageInjector(t *testing.T) {
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			var b web.PageInjector
			c.operation(&b)
			diff := testingutils.PrettyJsonDiff(
				strings.TrimSpace(c.expected),
				strings.TrimSpace(h.MustString(b.GetHeadHTMLComponent(), context.TODO())))
			if len(diff) > 0 {
				t.Error(diff)
			}
		})
	}
}

func TestLayoutFunc(t *testing.T) {
	cases := []multipartestutils.TestCase{
		{
			Debug: true,
			Name:  "customized layout",
			HandlerMaker: func() http.Handler {
				b := web.New().LayoutFunc(func(in web.PageFunc) web.PageFunc {
					return func(ctx *web.EventContext) (r web.PageResponse, err error) {
						r, err = in(ctx)
						r.Body = h.Div(r.Body)
						return
					}
				})
				return web.Page(func(ctx *web.EventContext) (r web.PageResponse, err error) {
					r.PageTitle = "Hello"
					r.Body = h.Div().Text("Main")
					return
				}).Builder(b)
			},
			ReqFunc: func() *http.Request {
				return httptest.NewRequest("GET", "/hello", nil)
			},
			ExpectPageBodyNotContains: []string{"<head>", "utf8", "viewport", "<body>"},
		},
		{
			Debug: true,
			Name:  "default layout",
			HandlerMaker: func() http.Handler {
				return web.Page(func(ctx *web.EventContext) (r web.PageResponse, err error) {
					r.PageTitle = "Hello"
					r.Body = h.Div().Text("Main")
					return
				}).Builder(web.New())
			},
			ReqFunc: func() *http.Request {
				return httptest.NewRequest("GET", "/hello", nil)
			},
			ExpectPageBodyContainsInOrder: []string{"utf8", "viewport"},
		},

		{
			Debug: true,
			Name:  "skip default",
			HandlerMaker: func() http.Handler {
				return web.Page(func(ctx *web.EventContext) (r web.PageResponse, err error) {
					ctx.Injector.SkipDefaultSetting()
					return
				}).Builder(web.New())
			},
			ReqFunc: func() *http.Request {
				return httptest.NewRequest("GET", "/hello", nil)
			},
			ExpectPageBodyNotContains: []string{"utf8"},
		},
		{
			Debug: true,
			Name:  "no op layout",
			HandlerMaker: func() http.Handler {
				return web.Page(func(ctx *web.EventContext) (r web.PageResponse, err error) {
					r.Body = h.Div().Text("hello")
					return
				}).Builder(web.New().LayoutFunc(web.NoopLayoutFunc))
			},
			ReqFunc: func() *http.Request {
				return httptest.NewRequest("GET", "/hello", nil)
			},
			ExpectPageBodyContainsInOrder: []string{"<div>hello</div>"},
		},
	}

	for _, c := range cases {
		t.Run(c.Name, func(t *testing.T) {
			multipartestutils.RunCase(t, c, nil)
		})
	}
}
