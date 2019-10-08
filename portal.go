package web

import (
	"context"

	h "github.com/theplant/htmlgo"
)

type PortalBuilder struct {
	loaderFunc *EventFuncID
	tag        *h.HTMLTagBuilder
}

func Portal(children ...h.HTMLComponent) (r *PortalBuilder) {
	r = &PortalBuilder{
		tag: h.Tag("go-plaid-portal").Children(children...),
	}
	r.Visible("true")
	return
}

func (b *PortalBuilder) EventFunc(eventFuncId string, params ...string) (r *PortalBuilder) {
	b.loaderFunc = &EventFuncID{
		ID:     eventFuncId,
		Params: params,
	}
	return b
}

func (b *PortalBuilder) Visible(v string) (r *PortalBuilder) {
	b.tag.Attr(":visible", v)
	return b
}

func (b *PortalBuilder) Name(v string) (r *PortalBuilder) {
	b.tag.Attr("portal-name", v)
	return b
}

func (b *PortalBuilder) Children(comps ...h.HTMLComponent) (r *PortalBuilder) {
	b.tag.Children(comps...)
	return b
}

func (b *PortalBuilder) LoadWhenParentVisible() (r *PortalBuilder) {
	b.Visible("parent.isVisible")
	return b
}

func (b *PortalBuilder) ParentForceUpdateAfterLoaded() (r *PortalBuilder) {
	b.tag.Attr(":after-loaded", "parent.forceUpdate")
	return b
}

func (b *PortalBuilder) MarshalHTML(ctx context.Context) (r []byte, err error) {
	b.tag.SetAttr(":loader-func", b.loaderFunc)
	return b.tag.MarshalHTML(ctx)
}
