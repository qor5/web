package web

import (
	"context"

	h "github.com/theplant/htmlgo"
)

type PortalBuilder struct {
	tag *h.HTMLTagBuilder
}

func Portal(children ...h.HTMLComponent) (r *PortalBuilder) {
	r = &PortalBuilder{
		tag: h.Tag("go-plaid-portal").Children(children...),
	}
	r.Visible("true").Form("form").Locals("locals").Dash("dash")
	return
}

func (b *PortalBuilder) Loader(v *VueEventTagBuilder) (r *PortalBuilder) {
	b.tag.SetAttr(":loader", v.String())
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

func (b *PortalBuilder) Form(v string) (r *PortalBuilder) {
	b.tag.Attr(":form", v)
	return b
}

func (b *PortalBuilder) Locals(v string) (r *PortalBuilder) {
	b.tag.Attr(":locals", v)
	return b
}

func (b *PortalBuilder) Dash(v string) (r *PortalBuilder) {
	b.tag.Attr(":dash", v)
	return b
}
func (b *PortalBuilder) AutoReloadInterval(v interface{}) (r *PortalBuilder) {
	b.tag.Attr(":auto-reload-interval", v)
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
	return b.tag.MarshalHTML(ctx)
}
