package stateful

import (
	"context"
	"fmt"

	"github.com/qor5/web/v3"
	h "github.com/theplant/htmlgo"
	"github.com/wI2L/jsondiff"
)

type portalize struct {
	c        Identifiable
	children []h.HTMLComponent
}

type portalNameCtxKey struct{}

func WithPortalName(ctx context.Context, name string) context.Context {
	return context.WithValue(ctx, portalNameCtxKey{}, name)
}

type skipPortalNameCtxKey struct{}

func SkipPortalize(c Identifiable) h.HTMLComponent {
	return h.ComponentFunc(func(ctx context.Context) (r []byte, err error) {
		portalName, _ := ctx.Value(portalNameCtxKey{}).(string)
		if portalName == "" {
			portalName = c.CompoID()
		}
		ctx = context.WithValue(ctx, skipPortalNameCtxKey{}, portalName)
		return c.MarshalHTML(ctx)
	})
}

func (p *portalize) MarshalHTML(ctx context.Context) ([]byte, error) {
	portalName, _ := ctx.Value(portalNameCtxKey{}).(string)
	if portalName == "" {
		portalName = p.c.CompoID()
	}
	skipName, _ := ctx.Value(skipPortalNameCtxKey{}).(string)
	if skipName == portalName {
		return h.Components(p.children...).MarshalHTML(ctx)
	}
	return web.Portal(p.children...).Name(portalName).MarshalHTML(ctx)
}

func reloadable[T Identifiable](c T, children ...h.HTMLComponent) h.HTMLComponent {
	return &portalize{
		c:        c,
		children: children,
	}
}

const (
	actionMethodReload = "OnReload"
)

func ReloadAction[T Identifiable](ctx context.Context, source T, f func(target T), opts ...PostActionOption) *web.VueEventTagBuilder {
	if f == nil {
		return PostAction(ctx, source, actionMethodReload, struct{}{}, opts...)
	}

	target := MustClone(source)
	f(target)
	o := newPostActionOptions(opts...)
	if o.useProvidedCompo {
		return postAction(ctx, target, actionMethodReload, struct{}{}, o)
	}

	patch, err := jsondiff.Compare(source, target)
	if err != nil {
		panic(err)
	}
	if patch == nil {
		return postAction(ctx, target, actionMethodReload, struct{}{}, o)
	}

	o.fixes = append([]string{
		fmt.Sprintf(`b.applyJsonPatch(v.compo, %s);`, h.JSONString(patch)),
	}, o.fixes...)
	return postAction(ctx, target, actionMethodReload, struct{}{}, o)
}

func AppendReloadToResponse(r *web.EventResponse, c Identifiable) {
	r.UpdatePortals = append(r.UpdatePortals, &web.PortalUpdate{
		Name: c.CompoID(),
		Body: SkipPortalize(c),
	})
}

func OnReload(c Identifiable) (r web.EventResponse, err error) {
	r.UpdatePortals = append(r.UpdatePortals, &web.PortalUpdate{
		Name: c.CompoID(),
		Body: SkipPortalize(c),
	})
	return
}
