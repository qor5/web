package examples_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/qor5/web/v3/examples"
	"github.com/qor5/web/v3/multipartestutils"
)

func TestHelloButtonPB(t *testing.T) {
	cases := []multipartestutils.TestCase{
		{
			Name: "index",
			ReqFunc: func() *http.Request {
				return httptest.NewRequest("GET", "/", nil)
			},
			ExpectPageBodyContainsInOrder: []string{
				">Hello</button>",
			},
		},
	}

	for _, c := range cases {
		t.Run(c.Name, func(t *testing.T) {
			multipartestutils.RunCase(t, c, examples.HelloButtonPB)
		})
	}
}
