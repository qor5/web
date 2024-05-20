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
	Name                           string
	ReqFunc                        func() *http.Request
	EventResponseMatch             func(t *testing.T, er *TestEventResponse)
	PageMatch                      func(t *testing.T, body *bytes.Buffer)
	Debug                          bool
	ExpectPageBodyContains         []string
	ExpectPortalUpdate0Contains    []string
	ExpectPageBodyNotContains      []string
	ExpectPortalUpdate0NotContains []string
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
		t.Log(w.Header())
		t.Log(w.Body.String())
	}

	var er TestEventResponse
	if strings.Contains(w.Header().Get("Content-Type"), "application/json") {
		err := json.NewDecoder(w.Body).Decode(&er)
		if err != nil {
			t.Errorf("%s for: %s", err, w.Body.String())
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
	if len(c.ExpectPageBodyNotContains) > 0 {
		for _, v := range c.ExpectPageBodyNotContains {
			if strings.Contains(w.Body.String(), v) {
				t.Errorf("page body %s should not contains: %s", w.Body.String(), v)
			}
		}
	}

	if c.EventResponseMatch != nil {
		c.EventResponseMatch(t, &er)
	}
	if len(c.ExpectPortalUpdate0Contains) > 0 {
		portalUpdate0AssertFunc(t, &er, c.Debug, c.ExpectPortalUpdate0Contains, w.Body, true)
	}
	if len(c.ExpectPortalUpdate0NotContains) > 0 {
		portalUpdate0AssertFunc(t, &er, c.Debug, c.ExpectPortalUpdate0NotContains, w.Body, false)
	}
}

func portalUpdate0AssertFunc(t *testing.T, er *TestEventResponse, debug bool, candidates []string, body *bytes.Buffer,
	contains bool,
) {
	if len(er.UpdatePortals) == 0 {
		t.Errorf("No UpdatePortals in : %#+v", er)
		return
	}
	if debug {
		t.Log("======== Response UpdatePortal[0] Body ========")
		t.Log(er.UpdatePortals[0].Body)
	}
	for _, u := range candidates {
		if contains {
			if !strings.Contains(er.UpdatePortals[0].Body, u) {
				t.Errorf("portal %s doesn't contains: %s", er.UpdatePortals[0].Body, u)
			}
		} else {
			if strings.Contains(er.UpdatePortals[0].Body, u) {
				t.Errorf("portal %s should not contains: %s", er.UpdatePortals[0].Body, u)
			}
		}
	}
}
