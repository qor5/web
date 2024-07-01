package stateful

import (
	"context"
	"fmt"
	"net/http"

	"github.com/qor5/web/v3"
	"github.com/samber/lo"
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

func NamedCookieKey(named Named) string {
	hash := MurmurHash3(fmt.Sprintf("%T:%s", named, named.CompoName()))
	return fmt.Sprintf("__sync_cookie_%s__", hash)
}

type querySyncer struct {
	h.HTMLComponent
}

func (s *querySyncer) MarshalHTML(ctx context.Context) ([]byte, error) {
	evCtx := web.MustGetEventContext(ctx)

	tags, err := GetQueryTags(s.HTMLComponent)
	if err != nil {
		return nil, err
	}

	named, ok := s.HTMLComponent.(Named)
	if ok {
		cookie, err := evCtx.R.Cookie(NamedCookieKey(named))
		if err != nil && err != http.ErrNoCookie {
			return nil, err
		}
		if cookie != nil {
			cookieTags := QueryTags(lo.Filter(tags, func(tag QueryTag, _ int) bool { return tag.Cookie }))
			if err := cookieTags.Decode(cookie.Value, s.HTMLComponent); err != nil {
				return nil, err
			}
		}
	}

	if err := tags.Decode(evCtx.R.URL.RawQuery, s.HTMLComponent); err != nil {
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
