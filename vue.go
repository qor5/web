package web

import (
	"context"
	"fmt"
	"net/url"

	h "github.com/theplant/htmlgo"
)

type VueEventTagBuilder struct {
	tag           h.MutableAttrHTMLComponent
	fieldName     *string
	eventType     string
	eventFunc     *EventFuncID
	url           *string
	eventScript   *string
	debouncedWait *int
}

func Bind(b h.MutableAttrHTMLComponent) (r *VueEventTagBuilder) {
	r = &VueEventTagBuilder{
		eventType: "click",
		eventFunc: &EventFuncID{},
	}
	r.tag = b
	return
}

// request page url without push state
func (b *VueEventTagBuilder) URL(url string) (r *VueEventTagBuilder) {
	b.url = &url
	return b
}

func (b *VueEventTagBuilder) Debounce(wait int) (r *VueEventTagBuilder) {
	b.debouncedWait = &wait
	return b
}

func (b *VueEventTagBuilder) PushStateURL(pageURL string) (r *VueEventTagBuilder) {
	if b.eventFunc.PushState == nil {
		b.eventFunc.PushState = PushState(nil)
	}
	b.eventFunc.PushState.URL(pageURL)
	return b
}

func (b *VueEventTagBuilder) PushStateQuery(q url.Values) (r *VueEventTagBuilder) {
	if b.eventFunc.PushState == nil {
		b.eventFunc.PushState = PushState(nil)
	}
	b.eventFunc.PushState.Query(q)
	return b
}

func (b *VueEventTagBuilder) MergeQuery(mergeQuery bool) (r *VueEventTagBuilder) {
	if b.eventFunc.PushState == nil {
		b.eventFunc.PushState = PushState(nil)
	}
	b.eventFunc.PushState.MergeQuery(mergeQuery)
	return b
}

func (b *VueEventTagBuilder) OnClick(eventFuncId string, params ...string) (r *VueEventTagBuilder) {
	return b.On("click").EventFunc(eventFuncId, params...)
}

func (b *VueEventTagBuilder) On(eventType string) (r *VueEventTagBuilder) {
	b.eventType = eventType
	return b
}

func (b *VueEventTagBuilder) EventScript(eventScript string) (r *VueEventTagBuilder) {
	b.eventScript = &eventScript
	return b
}

func (b *VueEventTagBuilder) EventFunc(eventFuncId string, params ...string) (r *VueEventTagBuilder) {
	b.eventFunc.ID = eventFuncId
	b.eventFunc.Params = params
	return b
}

func (b *VueEventTagBuilder) FieldName(v string) (r *VueEventTagBuilder) {
	b.fieldName = &v
	return b
}

func (b *VueEventTagBuilder) PushState(ps *PushStateBuilder) (r *VueEventTagBuilder) {
	b.eventFunc.PushState = ps
	return b
}

func (b *VueEventTagBuilder) setupChange() {
	if b.fieldName == nil {
		return
	}

	b.tag.SetAttr("v-field-name", h.JSONString(b.fieldName))
}

func (b *VueEventTagBuilder) Update() {
	b.setupChange()

	callFunc := ""

	if len(b.eventFunc.ID) > 0 {
		callFunc = fmt.Sprintf("triggerEventFunc(%s, $event, %s, %s, %s, vars)",
			h.JSONString(b.eventFunc),
			h.JSONString(b.url),
			h.JSONString(b.debouncedWait),
			h.JSONString(b.fieldName),
		)
	} else if b.eventFunc.PushState != nil {
		callFunc = fmt.Sprintf("loadPage(%s, %s)",
			h.JSONString(b.eventFunc.PushState),
			h.JSONString(b.debouncedWait),
		)
	}

	if b.eventScript != nil {
		callFunc = fmt.Sprintf("%s; %s", *b.eventScript, callFunc)
	}

	if len(callFunc) > 0 {
		b.tag.SetAttr(fmt.Sprintf("v-on:%s", b.eventType), callFunc)
	}
}

func (b *VueEventTagBuilder) MarshalHTML(ctx context.Context) (r []byte, err error) {
	b.Update()
	return b.tag.MarshalHTML(ctx)
}

const InitContextVars = "v-init-context-vars"
