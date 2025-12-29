package examples_test

import (
	"net/http"
	"strings"
	"testing"

	"github.com/qor5/web/v3"
	"github.com/qor5/web/v3/examples"
	"github.com/qor5/web/v3/multipartestutils"
)

func TestWebScope(t *testing.T) {
	cases := []multipartestutils.TestCase{
		{
			Name: "Page WebScopeUseLocalsPath",
			HandlerMaker: func() http.Handler {
				mux := http.NewServeMux()
				examples.Mux(mux)
				return mux
			},
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/examples/web-scope-use-locals").
					EventFunc(web.ReloadEventFuncID).
					BuildEventFuncRequest()
			},
			EventResponseMatch: func(t *testing.T, er *multipartestutils.TestEventResponse) {
				if !strings.Contains(er.Body, `:init='{ selectedItem: 0, btnLabel:"Add", items: [{text: "A", icon: "mdi-clock"}]}' :dash-init='{hello:123}' v-slot='{ locals ,dash }'`) {
					t.Errorf("%v", er.Body)
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
