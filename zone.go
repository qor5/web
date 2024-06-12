package web

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"

	h "github.com/theplant/htmlgo"
)

type zoneKey struct{}

const zoneParam = "__zone__"

type Zone interface {
	PortalName(n string) string
}

type plaidZone interface {
	Plaid() *VueEventTagBuilder
}

type zoneRequestScanner interface {
	Scan(r *http.Request)
}

func contextWithZone(ctx context.Context, zone Zone) context.Context {
	return context.WithValue(ctx, zoneKey{}, zone)
}

func ComponentWithZone(z Zone, c h.HTMLComponent) h.HTMLComponent {
	return h.ComponentFunc(func(ctx context.Context) (r []byte, err error) {
		ctx = contextWithZone(ctx, z)
		return c.MarshalHTML(ctx)
	})
}

func ZonePortalUpdate(z Zone, portalName string, body h.HTMLComponent) *PortalUpdate {
	return &PortalUpdate{
		Name: z.PortalName(portalName),
		Body: ComponentWithZone(z, body),
	}
}

func ZonedPlaid(ctx context.Context) *VueEventTagBuilder {
	z := ctx.Value(zoneKey{})
	if pz, ok := z.(plaidZone); ok {
		return pz.Plaid()
	}
	vs := url.Values{}
	vs.Set(zoneParam, h.JSONString(z))
	return Plaid().StringQuery(vs.Encode())
}

func MustGetZone[T Zone](r *http.Request) T {
	zjson := r.FormValue(zoneParam)
	var z T
	if sc, ok := any(z).(zoneRequestScanner); ok {
		sc.Scan(r)
		return z
	}

	err := json.Unmarshal([]byte(zjson), &z)
	if err != nil {
		panic(err)
	}
	return z
}
