package examples_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"regexp"

	"github.com/qor5/web/v3/examples"
	"github.com/qor5/web/v3/multipartestutils"
)

type eventResponse struct {
	Body         string      `json:"body"`
	PushState    interface{} `json:"pushState"`
	ReloadPortals []string   `json:"reloadPortals"`
	RunScript    string      `json:"runScript"`
	Data         []string    `json:"data"`
}

func TestPartialReloadPage(t *testing.T) {
	// Test main page rendering
	req := httptest.NewRequest("GET", "/", nil)
	recorder := httptest.NewRecorder()
	handler := examples.PartialReloadPagePB
	handler.ServeHTTP(recorder, req)

	body := recorder.Body.String()
	if !strings.Contains(body, "Portal Reload Automatically") {
		t.Errorf("main page should contain 'Portal Reload Automatically'")
	}
	if !strings.Contains(body, "Load Data Only") {
		t.Errorf("main page should contain 'Load Data Only'")
	}
	if !strings.Contains(body, "Related Products") {
		t.Errorf("main page should contain 'Related Products'")
	}

	cases := []multipartestutils.TestCase{
		{
			Name: "Auto Reload",
			HandlerMaker: func() http.Handler {
				return examples.PartialReloadPagePB
			},
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/").
					EventFunc("autoReload").
					BuildEventFuncRequest()
			},
			EventResponseMatch: func(t *testing.T, er *multipartestutils.TestEventResponse) {
				var resp eventResponse
				if err := json.Unmarshal([]byte(er.Body), &resp); err != nil {
					t.Errorf("failed to parse response: %v", err)
					return
				}
				timestampPattern := regexp.MustCompile(`\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}`)
				if !timestampPattern.MatchString(resp.Body) {
					t.Errorf("unexpected body: %s", resp.Body)
				}
			},
		},
		{
			Name: "Load Data",
			HandlerMaker: func() http.Handler {
				return examples.PartialReloadPagePB
			},
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/").
					EventFunc("loadData").
					BuildEventFuncRequest()
			},
			EventResponseMatch: func(t *testing.T, er *multipartestutils.TestEventResponse) {
				var resp eventResponse
				if err := json.Unmarshal([]byte(er.Body), &resp); err != nil {
					t.Errorf("failed to parse response: %v", err)
					return
				}
				if len(resp.Data) != 10 {
					t.Errorf("expected 10 data items, got %d", len(resp.Data))
				}
			},
		},
		{
			Name: "Reload Portal",
			HandlerMaker: func() http.Handler {
				return examples.PartialReloadPagePB
			},
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/").
					EventFunc("reload3").
					BuildEventFuncRequest()
			},
			EventResponseMatch: func(t *testing.T, er *multipartestutils.TestEventResponse) {
				var resp eventResponse
				if err := json.Unmarshal([]byte(er.Body), &resp); err != nil {
					t.Errorf("failed to parse response: %v", err)
					return
				}
				if len(resp.ReloadPortals) != 1 || resp.ReloadPortals[0] != "related_products" {
					t.Errorf("expected reload portal 'related_products', got %v", resp.ReloadPortals)
				}
			},
		},
	}

	for _, tc := range cases {
		t.Run(tc.Name, func(t *testing.T) {
			req := tc.ReqFunc()
			recorder := httptest.NewRecorder()
			tc.HandlerMaker().ServeHTTP(recorder, req)
			tc.EventResponseMatch(t, &multipartestutils.TestEventResponse{Body: recorder.Body.String()})
		})
	}
}

func TestAutoReloadCounter(t *testing.T) {
	handler := examples.PartialReloadPagePB

	// Test that after 5 reloads, the interval is set to 0
	for i := 0; i < 6; i++ {
		req := multipartestutils.NewMultipartBuilder().
			PageURL("/").
			EventFunc("autoReload").
			BuildEventFuncRequest()
		recorder := httptest.NewRecorder()
		handler.ServeHTTP(recorder, req)

		if i == 5 {
			var resp eventResponse
			if err := json.Unmarshal([]byte(recorder.Body.String()), &resp); err != nil {
				t.Errorf("failed to parse response: %v", err)
				return
			}
			if resp.RunScript != "locals.interval = 0;" {
				t.Errorf("expected interval to be set to 0 after 5 reloads, got script: %s", resp.RunScript)
			}
		}
	}
}

func TestRelatedProducts(t *testing.T) {
	req := multipartestutils.NewMultipartBuilder().
		PageURL("/").
		EventFunc("related").
		BuildEventFuncRequest()

	recorder := httptest.NewRecorder()
	handler := examples.PartialReloadPagePB
	handler.ServeHTTP(recorder, req)

	if !strings.Contains(recorder.Body.String(), "Product A") {
		t.Errorf("expected related products in response")
	}
}
