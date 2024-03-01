package web

import (
	"context"
	"strings"

	h "github.com/theplant/htmlgo"
)

type ScopeBuilder struct {
	tag *h.HTMLTagBuilder
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

func (b *ScopeBuilder) Init(vs ...interface{}) (r *ScopeBuilder) {
	if len(vs) == 0 {
		return
	}
	var js = make([]string, 0)
	for _, v := range vs {
		switch vt := v.(type) {
		case string:
			js = append(js, vt)
		default:
			js = append(js, h.JSONString(v))
		}
	}
	var initVal = js[0]
	if len(js) > 1 {
		initVal = "[" + strings.Join(js, ", ") + "]"
	}
	b.tag.Attr(":init", initVal)
	return b
}

func (b *ScopeBuilder) MarshalHTML(ctx context.Context) (r []byte, err error) {
	return b.tag.MarshalHTML(ctx)
}
