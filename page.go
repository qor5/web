package web

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	h "github.com/theplant/htmlgo"
)

var Default = New()

const ReloadEventFuncID = "__reload__"

func Page(pf PageFunc, efs ...interface{}) (p *PageBuilder) {
	p = &PageBuilder{
		b: Default,
	}
	p.pageRenderFunc = pf
	p.RegisterEventFunc(ReloadEventFuncID, reload)
	p.EventFuncs(efs...)
	return
}

type PageBuilder struct {
	EventsHub
	b                *Builder
	pageRenderFunc   PageFunc
	eventFuncWrapper func(in EventFunc) EventFunc
}

func (b *Builder) Page(pf PageFunc) (p *PageBuilder) {
	p = Page(pf).Builder(b)
	return
}

func (p *PageBuilder) Builder(v *Builder) (r *PageBuilder) {
	p.b = v
	r = p
	return
}

func (p *PageBuilder) Wrap(middlewares ...func(in PageFunc) PageFunc) (r *PageBuilder) {
	pf := p.pageRenderFunc
	for _, m := range middlewares {
		pf = m(pf)
	}
	p.pageRenderFunc = pf
	r = p
	return
}

func (p *PageBuilder) EventFuncs(vs ...interface{}) (r *PageBuilder) {
	p.addMultipleEventFuncs(vs...)
	return p
}

func (p *PageBuilder) EventFunc(name string, ef EventFunc) (r *PageBuilder) {
	p.RegisterEventFunc(name, ef)
	return p
}

func (p *PageBuilder) WrapEventFunc(w func(in EventFunc) EventFunc) (r *PageBuilder) {
	eventFuncWrapper := p.eventFuncWrapper
	p.eventFuncWrapper = func(in EventFunc) EventFunc {
		if eventFuncWrapper != nil {
			in = eventFuncWrapper(in)
		}
		return w(in)
	}
	return p
}

func (p *PageBuilder) MergeHub(hub *EventsHub) (r *PageBuilder) {
	p.EventsHub.eventFuncs = append(hub.eventFuncs, p.EventsHub.eventFuncs...)
	return p
}

func (p *PageBuilder) render(
	ctx *EventContext,
	event bool,
) (pager *PageResponse, body string) {
	if p.pageRenderFunc == nil {
		return
	}
	rf := p.pageRenderFunc
	if !event {
		rf = p.b.layoutFunc(p.pageRenderFunc)
	}

	pr, err := rf(ctx)
	if err != nil {
		panic(err)
	}
	pager = &pr

	if pager.Body == nil {
		return
	}

	// fmt.Println("eventFuncs count: ", len(p.eventFuncs))
	b, err := pager.Body.MarshalHTML(ctx.R.Context())
	if err != nil {
		panic(err)
	}
	body = string(b)

	return
}

func (p *PageBuilder) index(w http.ResponseWriter, r *http.Request) {
	var err error

	ctx := new(EventContext)
	ctx.R = r
	ctx.W = w
	ctx.Injector = &PageInjector{}
	ctx.withSelf()
	_, body := p.render(ctx, false)

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, err = fmt.Fprintln(ctx.W, body)
	if err != nil {
		panic(err)
	}
}

const EventFuncIDName = "__execute_event__"

func (p *PageBuilder) executeEvent(w http.ResponseWriter, r *http.Request) {
	ctx := new(EventContext)
	ctx.R = r
	ctx.W = w
	ctx.Injector = &PageInjector{}
	ctx.withSelf()

	eventFuncID := ctx.R.FormValue(EventFuncIDName)

	// for server side restart and lost all the eventFuncs,
	// but user keep clicking page without refresh page to call p.render to fill up eventFuncs
	// because default added reload
	if len(p.eventFuncs) <= 1 &&
		p.eventFuncById(eventFuncID) == nil &&
		p.b.eventFuncById(eventFuncID) == nil {
		log.Println("Re-render because event funcs gone, might server restarted")
		p.render(ctx, true)
	}

	ef := p.eventFuncById(eventFuncID)
	if ef == nil {
		ef = p.b.eventFuncById(eventFuncID)
	}

	if ef == nil {
		log.Printf("event %s not found in %s\n", eventFuncID, p.EventsHub.String())
		http.NotFound(ctx.W, ctx.R)
		return
	}

	if p.eventFuncWrapper != nil {
		ef = p.eventFuncWrapper(ef)
	}
	er, err := ef(ctx)
	if err != nil {
		panic(err)
	}

	if er.Reload {
		pr, body := p.render(ctx, true)
		er.Body = h.RawHTML(body)
		if len(er.PageTitle) == 0 {
			er.PageTitle = pr.PageTitle
		}
	}

	er.Body = h.RawHTML(h.MustString(er.Body, ctx.R.Context()))

	for _, up := range er.UpdatePortals {
		up.Body = h.RawHTML(h.MustString(up.Body, ctx.R.Context()))
	}

	ctx.W.Header().Set("Content-Type", "application/json; charset=utf-8")
	err = json.NewEncoder(ctx.W).Encode(er)
	if err != nil {
		panic(err)
	}
}

func reload(ctx *EventContext) (r EventResponse, err error) {
	r.Reload = true
	return
}

func (p *PageBuilder) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if r.URL.Query().Has(EventFuncIDName) {
		p.executeEvent(w, r)
		return
	}
	p.index(w, r)
}
