package multipartestutils

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/http/httputil"
	"strings"
	"testing"
)

type TestCase struct {
	Name                        string
	ReqFunc                     func() *http.Request
	EventResponseMatch          func(t *testing.T, er *TestEventResponse)
	PageMatch                   func(t *testing.T, body *bytes.Buffer)
	Debug                       bool
	ExpectPageBodyContains      []string
	ExpectPortalUpdate0Contains []string
}

type TestPortalUpdate struct {
	Name        string `json:"name,omitempty"`
	Body        string `json:"body,omitempty"`
	AfterLoaded string `json:"afterLoaded,omitempty"`
}

type TestEventResponse struct {
	PageTitle     string              `json:"pageTitle,omitempty"`
	Body          string              `json:"body,omitempty"`
	Reload        bool                `json:"reload,omitempty"`
	ReloadPortals []string            `json:"reloadPortals,omitempty"`
	UpdatePortals []*TestPortalUpdate `json:"updatePortals,omitempty"`
	Data          interface{}         `json:"data,omitempty"`
}

func RunCase(t *testing.T, c TestCase, handler http.Handler) {
	w := httptest.NewRecorder()
	r := c.ReqFunc()
	if c.Debug {
		bs, _ := httputil.DumpRequest(r, true)
		t.Log("======== Request ========")
		t.Log(string(bs))
	}
	handler.ServeHTTP(w, r)
	if c.Debug {
		t.Log("======== Response ========")
		t.Log(w.Body.String())
	}

	if c.EventResponseMatch != nil {
		var er TestEventResponse
		err := json.NewDecoder(w.Body).Decode(&er)
		if err != nil {
			t.Errorf("%s for: %s", err, w.Body.String())
		}
		c.EventResponseMatch(t, &er)
	}
	if len(c.ExpectPortalUpdate0Contains) > 0 {
		var er TestEventResponse
		err := json.NewDecoder(w.Body).Decode(&er)
		if err != nil {
			t.Errorf("%s for: %s", err, w.Body.String())
		}
		if len(er.UpdatePortals) == 0 {
			t.Errorf("No UpdatePortals in : %#+v", er)
		}
		for _, u := range c.ExpectPortalUpdate0Contains {
			if !strings.Contains(er.UpdatePortals[0].Body, u) {
				t.Errorf("portal %s doesn't contains: %s", er.UpdatePortals[0].Body, u)
			}
		}
	}

	if c.PageMatch != nil {
		c.PageMatch(t, w.Body)
	}
	if len(c.ExpectPageBodyContains) > 0 {
		for _, v := range c.ExpectPageBodyContains {
			if !strings.Contains(w.Body.String(), v) {
				t.Errorf("page body %s doesn't contains: %s", w.Body.String(), v)
			}
		}
	}
}
