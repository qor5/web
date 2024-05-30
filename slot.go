package web

import (
	"context"
	"fmt"

	h "github.com/theplant/htmlgo"
)

type SlotBuilder struct {
	tag   *h.HTMLTagBuilder
	scope string
	name  string
}

func Slot(children ...h.HTMLComponent) (r *SlotBuilder) {
	r = &SlotBuilder{
		tag: h.Tag("template").Children(children...),
	}
	return
}

func (b *SlotBuilder) Scope(v string) (r *SlotBuilder) {
	b.scope = v
	return b
}

func (b *SlotBuilder) Name(v string) (r *SlotBuilder) {
	b.name = v
	return b
}

func (b *SlotBuilder) Children(comps ...h.HTMLComponent) (r *SlotBuilder) {
	b.tag.Children(comps...)
	return b
}

func (b *SlotBuilder) MarshalHTML(ctx context.Context) (r []byte, err error) {
	if len(b.name) == 0 {
		panic("Slot(...).Name(name) required")
	}

	attrName := fmt.Sprintf("v-slot:%s", b.name)
	if len(b.scope) == 0 {
		b.tag.Attr(attrName, true)
	} else {
		b.tag.Attr(attrName, b.scope)
	}
	return b.tag.MarshalHTML(ctx)
}
