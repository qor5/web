package examples_test

import (
	"bytes"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/qor5/web/v3"
	"github.com/qor5/web/v3/examples"
	"github.com/qor5/web/v3/multipartestutils"
	. "github.com/theplant/htmlgo"
)

func TestExamples(t *testing.T) {
	cases := []multipartestutils.TestCase{
		{
			Name: "Page Reload 1",
			HandlerMaker: func() http.Handler {
				return examples.HelloWorldReloadPB
			},
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/").
					EventFunc(web.ReloadEventFuncID).
					BuildEventFuncRequest()
			},
			EventResponseMatch: func(t *testing.T, er *multipartestutils.TestEventResponse) {
				if !strings.Contains(er.Body, "Hello World") {
					t.Errorf("%v", er.Body)
				}
			},
		},
		{
			Name: "Page Reload 2",
			HandlerMaker: func() http.Handler {
				return examples.HelloWorldReloadPB
			},
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/").
					EventFunc("reload").
					BuildEventFuncRequest()
			},
			EventResponseMatch: func(t *testing.T, er *multipartestutils.TestEventResponse) {
				if !strings.Contains(er.Body, "Hello World") {
					t.Errorf("%v", er.Body)
				}
			},
		},
		{
			Name: "Page Wrap",
			HandlerMaker: func() http.Handler {
				return examples.HelloWorldReloadPB.Wrap(func(in web.PageFunc) web.PageFunc {
					return func(ctx *web.EventContext) (r web.PageResponse, err error) {
						inPr, _ := in(ctx)
						r.Body = Article(inPr.Body)
						r.PageTitle = fmt.Sprintf("Wrapped: %s", inPr.PageTitle)
						return
					}
				})
			},
			ReqFunc: func() *http.Request {
				return httptest.NewRequest("GET", "/", nil)
			},
			PageMatch: func(t *testing.T, body *bytes.Buffer) {
				if !strings.Contains(body.String(), "<article>") {
					t.Errorf("%v", body.String())
				}
			},
		},
		{
			Name: "Event Func Wrap",
			HandlerMaker: func() http.Handler {
				return examples.HelloWorldReloadPB.
					WrapEventFunc(func(in web.EventFunc) web.EventFunc {
						return func(ctx *web.EventContext) (r web.EventResponse, err error) {
							r.Data = "Hello123"
							return
						}
					}).
					WrapEventFunc(func(in web.EventFunc) web.EventFunc {
						return func(ctx *web.EventContext) (r web.EventResponse, err error) {
							inEr, _ := in(ctx)
							r.Data = "NICE:" + fmt.Sprint(inEr.Data)
							return
						}
					})
			},
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/").
					EventFunc("reload").
					BuildEventFuncRequest()
			},
			EventResponseMatch: func(t *testing.T, er *multipartestutils.TestEventResponse) {
				if !strings.Contains(fmt.Sprint(er.Data), "NICE:Hello123") {
					t.Error(er.Data)
				}
			},
		},
	}

	for _, c := range cases {
		t.Run(c.Name, func(t *testing.T) {
			multipartestutils.RunCase(t, c, nil)
		})
	}
}
