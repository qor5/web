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
	Name                               string
	HandlerMaker                       func() http.Handler
	ReqFunc                            func() *http.Request
	EventResponseMatch                 func(t *testing.T, er *TestEventResponse)
	PageMatch                          func(t *testing.T, body *bytes.Buffer)
	ResponseMatch                      func(t *testing.T, w *httptest.ResponseRecorder)
	Debug                              bool
	ExpectPageBodyContainsInOrder      []string
	ExpectPortalUpdate0ContainsInOrder []string
	ExpectPageBodyNotContains          []string
	ExpectPortalUpdate0NotContains     []string
	ExpectRunScriptContainsInOrder     []string
}

type TestPortalUpdate struct {
	Name        string `json:"name,omitempty"`
	Body        string `json:"body,omitempty"`
	AfterLoaded string `json:"afterLoaded,omitempty"`
}

type TestLocationBuilder struct {
	MyMergeQuery          bool     `json:"mergeQuery,omitempty"`
	MyURL                 string   `json:"url,omitempty"`
	MyStringQuery         string   `json:"stringQuery,omitempty"`
	MyClearMergeQueryKeys []string `json:"clearMergeQueryKeys,omitempty"`
}

type TestEventResponse struct {
	PageTitle     string               `json:"pageTitle,omitempty"`
	Body          string               `json:"body,omitempty"`
	Reload        bool                 `json:"reload,omitempty"`
	PushState     *TestLocationBuilder `json:"pushState"`
	RedirectURL   string               `json:"redirectURL,omitempty"`
	ReloadPortals []string             `json:"reloadPortals,omitempty"`
	UpdatePortals []*TestPortalUpdate  `json:"updatePortals,omitempty"`
	Data          interface{}          `json:"data,omitempty"`
	RunScript     string               `json:"runScript,omitempty"`
}

func RunCase(t *testing.T, c TestCase, handler http.Handler) {
	w := httptest.NewRecorder()
	r := c.ReqFunc()
	if c.Debug {
		bs, _ := httputil.DumpRequest(r, true)
		t.Log("======== Request ========")
		t.Log(string(bs))
	}
	if c.HandlerMaker != nil {
		handler = c.HandlerMaker()
	}
	handler.ServeHTTP(w, r)
	if c.Debug {
		t.Log("======== Response ========")
		t.Log(w.Header())
		t.Log(w.Body.String())
	}

	if c.ResponseMatch != nil {
		c.ResponseMatch(t, w)
	}

	var body string = w.Body.String()
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
	if len(c.ExpectPageBodyContainsInOrder) > 0 {
		if !containsInOrder(body, c.ExpectPageBodyContainsInOrder) {
			t.Errorf("page body %s should contains in correct order: %#+v", w.Body.String(), c.ExpectPageBodyContainsInOrder)
		}
	}
	if len(c.ExpectPageBodyNotContains) > 0 {
		for _, v := range c.ExpectPageBodyNotContains {
			if strings.Contains(body, v) {
				t.Errorf("page body %s should not contains: %s", w.Body.String(), v)
			}
		}
	}

	if c.EventResponseMatch != nil {
		c.EventResponseMatch(t, &er)
	}
	if len(c.ExpectRunScriptContainsInOrder) > 0 {
		if !containsInOrder(er.RunScript, c.ExpectRunScriptContainsInOrder) {
			t.Errorf("runScript %s should contains in correct order: %#+v", er.RunScript, c.ExpectRunScriptContainsInOrder)
		}
	}
	if len(c.ExpectPortalUpdate0ContainsInOrder) > 0 {
		portalUpdate0AssertFunc(t, &er, c.Debug, c.ExpectPortalUpdate0ContainsInOrder, w.Body, true)
	}
	if len(c.ExpectPortalUpdate0NotContains) > 0 {
		portalUpdate0AssertFunc(t, &er, c.Debug, c.ExpectPortalUpdate0NotContains, w.Body, false)
	}
}

func containsInOrder(body string, candidates []string) bool {
	for _, candidate := range candidates {
		i := strings.Index(body, candidate)
		if i < 0 {
			return false
		}
		body = body[i+len(candidate):]
	}
	return true
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
	if contains {
		if !containsInOrder(er.UpdatePortals[0].Body, candidates) {
			t.Errorf("portal %s should contains in correct order: %#+v", er.UpdatePortals[0].Body, candidates)
		}
	} else {
		for _, u := range candidates {
			if strings.Contains(er.UpdatePortals[0].Body, u) {
				t.Errorf("portal %s should not contains: %s", er.UpdatePortals[0].Body, u)
			}
		}
	}
}
