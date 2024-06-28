package stateful

import (
	"context"
	"fmt"

	"github.com/qor5/web/v3"
	h "github.com/theplant/htmlgo"
	"github.com/wI2L/jsondiff"
)

type portalize struct {
	c        Named
	children []h.HTMLComponent
}

type skipPortalNameCtxKey struct{}

func skipPortalize(c Named) h.HTMLComponent {
	return h.ComponentFunc(func(ctx context.Context) (r []byte, err error) {
		ctx = context.WithValue(ctx, skipPortalNameCtxKey{}, c.CompoName())
		return c.MarshalHTML(ctx)
	})
}

func (p *portalize) MarshalHTML(ctx context.Context) ([]byte, error) {
	compoName := p.c.CompoName()
	skipName, _ := ctx.Value(skipPortalNameCtxKey{}).(string)
	if skipName == compoName {
		return h.Components(p.children...).MarshalHTML(ctx)
	}
	return web.Portal(p.children...).Name(compoName).MarshalHTML(ctx)
}

func Reloadable[T Named](c T, children ...h.HTMLComponent) h.HTMLComponent {
	return &portalize{
		c:        c,
		children: children,
	}
}

const (
	actionMethodReload = "OnReload"
)

func ReloadAction[T Named](ctx context.Context, source T, f func(target T), opts ...PostActionOption) *web.VueEventTagBuilder {
	if f == nil {
		return PostAction(ctx, source, actionMethodReload, struct{}{}, opts...)
	}

	target := MustClone(source)
	f(target)
	o := newPostActionOptions(opts...)
	if o.useProvidedActionable {
		return PostAction(ctx, target, actionMethodReload, struct{}{}, opts...)
	}

	patch, err := jsondiff.Compare(source, target)
	if err != nil {
		panic(err)
	}
	if patch == nil {
		return PostAction(ctx, target, actionMethodReload, struct{}{}, opts...)
	}

	opts = append([]PostActionOption{WithAppendFix(
		fmt.Sprintf(`vars.__applyJsonPatch(v.actionable, %s);`, h.JSONString(patch)),
	)}, opts...)
	return PostAction(ctx, target, actionMethodReload, struct{}{}, opts...)
}

func AppendReloadToResponse(r *web.EventResponse, c Named) {
	r.UpdatePortals = append(r.UpdatePortals, &web.PortalUpdate{
		Name: c.CompoName(),
		Body: skipPortalize(c),
	})
}

func OnReload(c Named) (r web.EventResponse, err error) {
	r.UpdatePortals = append(r.UpdatePortals, &web.PortalUpdate{
		Name: c.CompoName(),
		Body: skipPortalize(c),
	})
	return
}
