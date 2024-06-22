package web

import (
	"context"
	"fmt"
	"strings"

	h "github.com/theplant/htmlgo"
)

type ScopeBuilder struct {
	tag       *h.HTMLTagBuilder
	observers []Observer
}

func Scope(children ...h.HTMLComponent) (r *ScopeBuilder) {
	r = &ScopeBuilder{
		tag: h.Tag("go-plaid-scope").Children(children...),
	}
	return
}

func (b *ScopeBuilder) VSlot(v string) (r *ScopeBuilder) {
	b.tag.Attr("v-slot", v)
	return b
}

func (b *ScopeBuilder) init(attr string, vs ...interface{}) (r *ScopeBuilder) {
	if len(vs) == 0 {
		return
	}
	js := make([]string, 0)
	for _, v := range vs {
		switch vt := v.(type) {
		case string:
			js = append(js, vt)
		default:
			js = append(js, h.JSONString(v))
		}
	}
	initVal := js[0]
	if len(js) > 1 {
		initVal = "[" + strings.Join(js, ", ") + "]"
	}
	b.tag.Attr(attr, initVal)
	return b
}

func (b *ScopeBuilder) Init(vs ...interface{}) (r *ScopeBuilder) {
	b.init(":init", vs...)
	return b
}

func (b *ScopeBuilder) FormInit(vs ...interface{}) (r *ScopeBuilder) {
	b.init(":form-init", vs...)
	return b
}

func (b *ScopeBuilder) OnChange(v string) (r *ScopeBuilder) {
	b.tag.Attr("@change-debounced", fmt.Sprintf(`({locals, form, oldLocals, oldForm}) => { %s }`, v)).
		Attr(":use-debounce", 800)
	return b
}

func (b *ScopeBuilder) UseDebounce(v int) (r *ScopeBuilder) {
	b.tag.Attr(":use-debounce", v)
	return b
}

func (b *ScopeBuilder) Children(comps ...h.HTMLComponent) (r *ScopeBuilder) {
	b.tag.Children(comps...)
	return b
}

func (b *ScopeBuilder) MarshalHTML(ctx context.Context) (r []byte, err error) {
	if len(b.observers) > 0 {
		b.tag.Attr(":observers", h.JSONString(b.observers))
	}
	return b.tag.MarshalHTML(ctx)
}

type Observer struct {
	Name   string `json:"name"`
	Script string `json:"script"` // available parameters: name payload vars locals form plaid
}

func (b *ScopeBuilder) Observe(name string, script string) (r *ScopeBuilder) {
	b.observers = append(b.observers, Observer{name, script})
	return b
}

func (b *ScopeBuilder) Observers(vs ...Observer) (r *ScopeBuilder) {
	b.observers = append(b.observers, vs...)
	return b
}

func NotifyScript(name string, payload any) string {
	return fmt.Sprintf(`vars.__sendNotification(%q, %s)`, name, h.JSONString(payload))
}
