package stateful

import (
	"context"

	"github.com/go-playground/form/v4"
	"github.com/qor5/web/v3"
	h "github.com/theplant/htmlgo"
)

var queryEncoder = func() *form.Encoder {
	encoder := form.NewEncoder()
	encoder.SetMode(form.ModeExplicit)
	encoder.SetTagName("query")
	return encoder
}()

type syncQueryCtxKey struct{}

func withSyncQuery(ctx context.Context) context.Context {
	return context.WithValue(ctx, syncQueryCtxKey{}, struct{}{})
}

func IsSyncQuery(ctx context.Context) bool {
	_, ok := ctx.Value(syncQueryCtxKey{}).(struct{})
	return ok
}

type querySyncer struct {
	h.HTMLComponent
}

func (s *querySyncer) MarshalHTML(ctx context.Context) ([]byte, error) {
	evCtx := web.MustGetEventContext(ctx)
	if err := QueryUnmarshal(evCtx.R.URL.RawQuery, s.HTMLComponent); err != nil {
		return nil, err
	}
	ctx = withSyncQuery(ctx)
	return s.HTMLComponent.MarshalHTML(ctx)
}

func (c *querySyncer) Unwrap() h.HTMLComponent {
	return c.HTMLComponent
}

func SyncQuery(c h.HTMLComponent) h.HTMLComponent {
	return &querySyncer{HTMLComponent: c}
}
