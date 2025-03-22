package web

import (
	"context"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/go-playground/form/v4"
	"github.com/sunfmin/reflectutils"
	h "github.com/theplant/htmlgo"
)

type PageResponse struct {
	PageTitle string
	Body      h.HTMLComponent
}

type PortalUpdate struct {
	Name string          `json:"name,omitempty"`
	Body h.HTMLComponent `json:"body,omitempty"`
}

// @snippet_begin(EventResponseDefinition)
type EventResponse struct {
	PageTitle     string           `json:"pageTitle,omitempty"`
	Body          h.HTMLComponent  `json:"body,omitempty"`
	Reload        bool             `json:"reload,omitempty"`
	PushState     *LocationBuilder `json:"pushState"`             // This we don't omitempty, So that {} can be kept when use url.Values{}
	RedirectURL   string           `json:"redirectURL,omitempty"` // change window url without push state
	ReloadPortals []string         `json:"reloadPortals,omitempty"`
	UpdatePortals []*PortalUpdate  `json:"updatePortals,omitempty"`
	Data          interface{}      `json:"data,omitempty"`      // used for return collection data like TagsInput data source
	RunScript     string           `json:"runScript,omitempty"` // used with InitContextVars to set values for example vars.show to used by v-model
}

// @snippet_end

// @snippet_begin(PageFuncAndEventFuncDefinition)
type (
	PageFunc  func(ctx *EventContext) (r PageResponse, err error)
	EventFunc func(ctx *EventContext) (r EventResponse, err error)
)

// @snippet_end

type LayoutFunc func(in PageFunc) PageFunc

// @snippet_begin(EventFuncHubDefinition)
type EventFuncHub interface {
	RegisterEventFunc(eventFuncId string, ef EventFunc) (key string)
}

// @snippet_end

func AppendRunScripts(er *EventResponse, scripts ...string) {
	if er.RunScript != "" {
		scripts = append([]string{er.RunScript}, scripts...)
	}
	er.RunScript = strings.Join(scripts, "; ")
}

type EventFuncID struct {
	ID string `json:"id,omitempty"`
}

type EventContext struct {
	R        *http.Request
	W        http.ResponseWriter
	Injector *PageInjector
	Flash    interface{} // pass value from actions to index
}

func (e *EventContext) WithContextValue(key any, value any) (r *EventContext) {
	e.R = e.R.WithContext(context.WithValue(e.R.Context(), key, value))
	return e
}

func (e *EventContext) ContextValue(key any) any {
	return e.R.Context().Value(key)
}

func (e *EventContext) Param(key string) (r string) {
	r = e.R.PathValue(key)
	if len(r) == 0 {
		r = e.R.FormValue(key)
	}
	return
}

func (e *EventContext) ParamAsInt(key string) (r int) {
	strVal := e.Param(key)
	if len(strVal) == 0 {
		return
	}
	r, _ = strconv.Atoi(strVal)
	return
}

func (e *EventContext) ParamAsBool(key string) (r bool) {
	strVal := e.Param(key)
	if len(strVal) == 0 {
		return
	}
	r, _ = strconv.ParseBool(strVal)
	return
}

func (e *EventContext) Queries() (r url.Values) {
	r = e.R.URL.Query()
	delete(r, EventFuncIDName)
	return
}

func (ctx *EventContext) MustUnmarshalForm(v interface{}) {
	err := ctx.UnmarshalForm(v)
	if err != nil {
		panic(err)
	}
}

func (ctx *EventContext) UnmarshalForm(v interface{}) (err error) {
	mf := ctx.R.MultipartForm
	if ctx.R.MultipartForm == nil {
		return
	}

	dec := form.NewDecoder()
	err = dec.Decode(v, mf.Value)
	if err != nil {
		// panic(err)
		return
	}

	if len(mf.File) > 0 {
		for k, vs := range mf.File {
			_ = reflectutils.Set(v, k, vs)
		}
	}
	return
}

type contextKey int

const eventKey contextKey = iota

func (e *EventContext) withSelf() (r *EventContext) {
	e.R = e.R.WithContext(context.WithValue(e.R.Context(), eventKey, e))
	return e
}

func WrapEventContext(parent context.Context, ctx *EventContext) (r context.Context) {
	r = context.WithValue(parent, eventKey, ctx)
	return
}

func MustGetEventContext(c context.Context) (r *EventContext) {
	r, _ = GetEventContext(c)
	if r == nil {
		panic("EventContext required")
	}
	return
}

func GetEventContext(c context.Context) (*EventContext, bool) {
	r, ok := c.Value(eventKey).(*EventContext)
	return r, ok
}

func Injector(c context.Context) (r *PageInjector) {
	ctx := MustGetEventContext(c)
	r = ctx.Injector
	return
}
