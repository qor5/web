package stateful

import (
	"context"
	"fmt"
	"net/http"

	"github.com/qor5/web/v3"
	h "github.com/theplant/htmlgo"
)

type syncQueryCtxKey struct{}

func withSyncQuery(ctx context.Context) context.Context {
	return context.WithValue(ctx, syncQueryCtxKey{}, struct{}{})
}

func IsSyncQuery(ctx context.Context) bool {
	_, ok := ctx.Value(syncQueryCtxKey{}).(struct{})
	return ok
}

func IdentifiableCookieKey(v Identifiable) string {
	hash := MurmurHash3(fmt.Sprintf("%T:%s", v, v.CompoID()))
	return fmt.Sprintf("__sync_cookie_%s__", hash)
}

type querySyncer struct {
	h.HTMLComponent
	onlyParse bool
}

func (s *querySyncer) MarshalHTML(ctx context.Context) ([]byte, error) {
	evCtx := web.MustGetEventContext(ctx)

	tags, err := ParseQueryTags(s.HTMLComponent)
	if err != nil {
		return nil, err
	}

	ident, ok := s.HTMLComponent.(Identifiable)
	if ok {
		cookie, err := evCtx.R.Cookie(IdentifiableCookieKey(ident))
		if err != nil && err != http.ErrNoCookie {
			return nil, err
		}
		if cookie != nil {
			if err := tags.CookieTags().Decode(cookie.Value, s.HTMLComponent); err != nil {
				return nil, err
			}
		}
	}

	if err := tags.Decode(evCtx.R.URL.RawQuery, s.HTMLComponent); err != nil {
		return nil, err
	}
	if !s.onlyParse {
		ctx = withSyncQuery(ctx)
	}
	return s.HTMLComponent.MarshalHTML(ctx)
}

func (c *querySyncer) Unwrap() h.HTMLComponent {
	return c.HTMLComponent
}

func SyncQuery(c h.HTMLComponent) h.HTMLComponent {
	return &querySyncer{HTMLComponent: c}
}

func ParseQuery(c h.HTMLComponent) h.HTMLComponent {
	return &querySyncer{HTMLComponent: c, onlyParse: true}
}
