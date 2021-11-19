package web

import (
	"context"

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

func (b *ScopeBuilder) Init(v string) (r *ScopeBuilder) {
	b.tag.Attr(":init", v)
	return b
}

func (b *ScopeBuilder) MarshalHTML(ctx context.Context) (r []byte, err error) {
	return b.tag.MarshalHTML(ctx)
}
