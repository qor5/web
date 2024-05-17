package multipartestutils

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

type TestCase struct {
	Name               string
	ReqFunc            func() *http.Request
	EventResponseMatch func(t *testing.T, er *TestEventResponse)
	PageMatch          func(t *testing.T, body *bytes.Buffer)
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
	handler.ServeHTTP(w, r)
	if c.EventResponseMatch != nil {
		var er TestEventResponse
		err := json.NewDecoder(w.Body).Decode(&er)
		if err != nil {
			t.Fatalf("%s for: %#+v", err, w.Body.String())
		}
		c.EventResponseMatch(t, &er)
	}

	if c.PageMatch != nil {
		c.PageMatch(t, w.Body)
	}
}
