package web

import (
	"context"
	"net/http"
	"strconv"

	"github.com/go-playground/form"
	"github.com/sunfmin/reflectutils"
	h "github.com/theplant/htmlgo"
)

type PageResponse struct {
	PageTitle string
	Body      h.HTMLComponent
}

type PortalUpdate struct {
	Name        string          `json:"name,omitempty"`
	Body        h.HTMLComponent `json:"body,omitempty"`
	AfterLoaded string          `json:"afterLoaded,omitempty"`
}

// @snippet_begin(EventResponseDefinition)
type EventResponse struct {
	PageTitle     string            `json:"pageTitle,omitempty"`
	Body          h.HTMLComponent   `json:"body,omitempty"`
	Reload        bool              `json:"reload,omitempty"`
	PushState     *PushStateBuilder `json:"pushState"`             // This we don't omitempty, So that {} can be keeped when use url.Values{}
	RedirectURL   string            `json:"redirectURL,omitempty"` // change window url without push state
	ReloadPortals []string          `json:"reloadPortals,omitempty"`
	UpdatePortals []*PortalUpdate   `json:"updatePortals,omitempty"`
	Data          interface{}       `json:"data,omitempty"` // used for return collection data like TagsInput data source
}

// @snippet_end

// @snippet_begin(PageFuncAndEventFuncDefinition)
type PageFunc func(ctx *EventContext) (r PageResponse, err error)
type EventFunc func(ctx *EventContext) (r EventResponse, err error)

// @snippet_end

type LayoutFunc func(r *http.Request, injector *PageInjector, body string) (output string, err error)

// @snippet_begin(EventFuncHubDefinition)
type EventFuncHub interface {
	RegisterEventFunc(eventFuncId string, ef EventFunc) (key string)
}

// @snippet_end

/*
	PushState: Whatever put into this, will do window.history.pushState to the current page url with
	it as query string, for example: /my-page-url/?key=name&value=felix. and It also pass the query string along
	to the /my-page-url/__execute_event__/?key=name&value=felix, Mostly used for setting EventResponse: `er.Reload = true` case.
	So that you can refresh the page with different query string in pushState manner, without doing a Browser redirect or refresh.
	It is used in Pager (Pagination) component.
*/
type EventFuncID struct {
	ID        string            `json:"id,omitempty"`
	Params    []string          `json:"params,omitempty"`
	PushState *PushStateBuilder `json:"pushState"` // This we don't omitempty, So that {} can be keeped when use url.Values{}
}

/*
	Event is for an individual component like checkbox, input, data picker etc's onChange callback
	will pass the Event to server side. use ctx.Event.Checked etc to get the value.
*/
type Event struct {
	Checked bool     `json:"checked,omitempty"` // For Checkbox
	From    string   `json:"from,omitempty"`    // For DatePicker
	To      string   `json:"to,omitempty"`      // For DatePicker
	Value   string   `json:"value,omitempty"`   // For Input, DatePicker
	Params  []string `json:"-"`
}

type EventContext struct {
	R        *http.Request
	W        http.ResponseWriter
	Hub      EventFuncHub
	Injector *PageInjector
	Event    *Event
	Flash    interface{} // pass value from actions to index
}

func (e *Event) ParamAsInt(i int) (r int) {
	if len(e.Params) <= i {
		return
	}
	p1 := e.Params[i]
	val, _ := strconv.ParseInt(p1, 10, 64)
	r = int(val)
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
		panic(err)
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

func WrapEventContext(parent context.Context, ctx *EventContext) (r context.Context) {
	r = context.WithValue(parent, eventKey, ctx)
	return
}

func MustGetEventContext(c context.Context) (r *EventContext) {
	r, _ = c.Value(eventKey).(*EventContext)
	if r == nil {
		panic("EventContext required")
	}
	return
}

func Injector(c context.Context) (r *PageInjector) {
	ctx := MustGetEventContext(c)
	r = ctx.Injector
	return
}
