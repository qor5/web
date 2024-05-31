package multipartestutils_test

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/qor5/web/v3/multipartestutils"
)

func TestCases(t *testing.T) {
	cases := []multipartestutils.TestCase{
		{
			Name: "contains in order",
			ReqFunc: func() *http.Request {
				return httptest.NewRequest("GET", "/", nil)
			},
			ExpectPageBodyContainsInOrder: []string{
				"1",
				"2",
			},
		},
	}

	for _, c := range cases {
		multipartestutils.RunCase(t, c, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			_, _ = fmt.Fprint(w, "2, 1, 2, 3")
		}))
	}
}
