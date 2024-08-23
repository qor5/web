package stateful

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"reflect"
	"strings"
	"sync"

	"github.com/qor5/web/v3"
	"github.com/samber/lo"
	h "github.com/theplant/htmlgo"
)

func Install(b web.EventFuncHub, dc *DependencyCenter) {
	b.RegisterEventFunc(eventDispatchAction, newEventDispatchActionHandler(dc))
}

type Action struct {
	CompoType string          `json:"compo_type"`
	Compo     json.RawMessage `json:"compo"`
	Injector  string          `json:"injector"`
	SyncQuery bool            `json:"sync_query"`
	Method    string          `json:"method"`
	Request   json.RawMessage `json:"request"`
}

const (
	LocalsKeyNewAction   = "newAction"
	LocalsKeyQueryTags   = "queryTags"
	LocalsKeySetCookies  = "setCookies"
	LocalsKeyEncodeQuery = "encodeQuery"
)

func Actionable[T h.HTMLComponent](ctx context.Context, c T, children ...h.HTMLComponent) (r h.HTMLComponent) {
	defer func() {
		if ident, ok := any(c).(Identifiable); ok {
			r = reloadable(ident, r)
		}
	}()
	actionBase := PrettyJSONString(Action{
		CompoType: fmt.Sprintf("%T", c),
		Compo:     json.RawMessage(PrettyJSONString(c)),
		Injector:  injectorNameFromContext(ctx),
		SyncQuery: IsSyncQuery(ctx),
		Method:    "",
		Request:   json.RawMessage("{}"),
	})
	queryTags, err := ParseQueryTags(c)
	if err != nil {
		panic(err)
	}

	queryEncoders := lo.Map(QueryTagMethods, func(method *QueryTagMethod, _ int) string {
		return fmt.Sprintf(`__queryEncoder_%s__: %s`, method.Name, method.Encoder)
	})
	queryEncodersJs := ""
	if len(queryEncoders) > 0 {
		queryEncodersJs = strings.Join(queryEncoders, ",\n") + ",\n"
	}

	ident, ok := any(c).(Identifiable)
	if ok {
		children = append([]h.HTMLComponent{
			// borrow to get the document
			h.Div().Attr("v-on-mounted", fmt.Sprintf(`({el}) => {
	const cookieTags = locals.%s().filter(tag => tag.cookie)
	locals.%s = function(v) {
		if (!v.sync_query || !el.ownerDocument) {
			return;
		}
		el.ownerDocument.cookie = "%s=" + plaid().encodeObjectToQuery(v.compo, cookieTags);
	}
}`,
				LocalsKeyQueryTags,
				LocalsKeySetCookies, IdentifiableCookieKey(ident),
			)),
		}, children...)
	}

	return web.Scope(children...).
		VSlot(fmt.Sprintf("{ locals }")).
		Init(fmt.Sprintf(`{
	%s
	%s: function() {
		return %s;
	},
	%s: function(v) {
		let tags = %s || [];
		tags.forEach(tag => {
			if (tag.method) {
				tag.encoder = this["__queryEncoder_" + tag.method + "__"];
			}
		});
		return tags;
	},
	%s: function(v) {}, // a placeholder
	%s: function(v) {
		if (!v.sync_query) {
			return "";
		}
		return plaid().encodeObjectToQuery(v.compo, this.%s());
	},
}`,
			queryEncodersJs,
			LocalsKeyNewAction, actionBase,
			LocalsKeyQueryTags, PrettyJSONString(queryTags),
			LocalsKeySetCookies,
			LocalsKeyEncodeQuery, LocalsKeyQueryTags))
}

const eventDispatchAction = "__dispatch_stateful_action__"

const (
	fieldKeyAction = "__action__"
)

type postActionOptions struct {
	useProvidedCompo bool
	fixes            []string
}

type PostActionOption func(*postActionOptions)

func WithUseProvidedCompo() PostActionOption {
	return func(o *postActionOptions) {
		o.useProvidedCompo = true
	}
}

func WithAppendFix(v string) PostActionOption {
	return func(o *postActionOptions) {
		o.fixes = append(o.fixes, v)
	}
}

func PostAction(ctx context.Context, c any, method any, request any, opts ...PostActionOption) *web.VueEventTagBuilder {
	return postAction(ctx, c, method, request, newPostActionOptions(opts...))
}

func newPostActionOptions(opts ...PostActionOption) *postActionOptions {
	o := new(postActionOptions)
	for _, opt := range opts {
		opt(o)
	}
	return o
}

func postAction(ctx context.Context, c any, method any, request any, o *postActionOptions) *web.VueEventTagBuilder {
	var methodName string
	switch m := method.(type) {
	case string:
		methodName = m
	default:
		methodName = GetFuncName(method)
	}

	b := web.POST().
		EventFunc(eventDispatchAction).
		Queries(url.Values{}) // force clear queries first

	evCtx := web.MustGetEventContext(ctx)
	b.URL(evCtx.R.URL.Path)

	if o.useProvidedCompo {
		o.fixes = append([]string{fmt.Sprintf("v.compo = %s;", PrettyJSONString(c))}, o.fixes...)
	}

	fix := ""
	if len(o.fixes) > 0 {
		fix = "\n" + strings.Join(o.fixes, "\n")
	}

	b.Run(web.Var(fmt.Sprintf(`function(b){
	let v = locals.%s(); // %T
	v.method = %q;
	v.request = %s;%s

	b.__action__ = v;
	b.__stringQuery__ = locals.%s(v);
	locals.%s(v);
}`,
		LocalsKeyNewAction, c,
		methodName,
		PrettyJSONString(request),
		fix,
		LocalsKeyEncodeQuery,
		LocalsKeySetCookies,
	)))
	b.StringQuery(web.Var(`(b) => b.__stringQuery__`))
	b.PushState(web.Var(`(b) => b.__action__.sync_query`))
	return b.BeforeFetch(fmt.Sprintf(`({b, url, opts}) => {
		opts.body.set(%q, JSON.stringify(b.__action__, null, "\t")); 
		return [url, opts];
	}`, fieldKeyAction))
}

var (
	outType0 = reflect.TypeOf(web.EventResponse{})
	outType1 = reflect.TypeOf((*error)(nil)).Elem()
	inType0  = reflect.TypeOf((*context.Context)(nil)).Elem()
)

func newEventDispatchActionHandler(dc *DependencyCenter) web.EventFunc {
	return func(evCtx *web.EventContext) (r web.EventResponse, err error) {
		var action Action
		if err = json.Unmarshal([]byte(evCtx.R.FormValue(fieldKeyAction)), &action); err != nil {
			return r, fmt.Errorf("failed to unmarshal action: %w", err)
		}

		v, err := newActionableCompo(action.CompoType)
		if err != nil {
			return r, err
		}

		err = json.Unmarshal(action.Compo, v)
		if err != nil {
			return r, err
		}

		if action.Injector != "" {
			evCtx.R = evCtx.R.WithContext(withInjectorName(evCtx.R.Context(), action.Injector))
			if err := dc.Apply(evCtx.R.Context(), v); err != nil {
				return r, err
			}
		}

		if action.SyncQuery {
			evCtx.R = evCtx.R.WithContext(withSyncQuery(evCtx.R.Context()))
		}

		method := reflect.ValueOf(v).MethodByName(action.Method)
		if method.IsValid() && method.Kind() == reflect.Func {
			methodType := method.Type()
			if methodType.NumOut() != 2 ||
				methodType.Out(0) != outType0 ||
				methodType.Out(1) != outType1 {
				return r, fmt.Errorf("action method %q has incorrect signature", action.Method)
			}

			numIn := methodType.NumIn()
			if numIn <= 0 || numIn > 2 {
				return r, fmt.Errorf("action method %q has incorrect number of arguments", action.Method)
			}
			if methodType.In(0) != inType0 {
				return r, fmt.Errorf("action method %q has incorrect signature", action.Method)
			}
			ctxValue := reflect.ValueOf(evCtx.R.Context())

			params := []reflect.Value{ctxValue}
			if numIn == 2 {
				argType := methodType.In(1)
				argValue := reflect.New(argType).Interface()
				err := json.Unmarshal([]byte(action.Request), &argValue)
				if err != nil {
					return r, fmt.Errorf("failed to unmarshal action request to %T: %w", argValue, err)
				}
				params = append(params, reflect.ValueOf(argValue).Elem())
			}

			result := method.Call(params)
			if len(result) != 2 || !result[0].CanInterface() || !result[1].CanInterface() {
				return r, fmt.Errorf("action method %q has incorrect return values", action.Method)
			}
			r = result[0].Interface().(web.EventResponse)
			if result[1].IsNil() {
				return r, nil
			}
			err = result[1].Interface().(error)
			return r, fmt.Errorf("failed to call action method %q: %w", action.Method, err)
		}

		switch action.Method {
		case actionMethodReload:
			rc, ok := v.(Identifiable)
			if !ok {
				return r, fmt.Errorf("compo %T does not implement Identifiable", v)
			}
			return OnReload(rc)
		default:
			return r, fmt.Errorf("action method %q not found", action.Method)
		}
	}
}

var actionableCompoTypeRegistry = new(sync.Map)

func RegisterActionableCompoType(vs ...h.HTMLComponent) {
	for _, v := range vs {
		registerActionableCompoType(v)
	}
}

func registerActionableCompoType(v h.HTMLComponent) {
	_, loaded := actionableCompoTypeRegistry.LoadOrStore(fmt.Sprintf("%T", v), reflect.TypeOf(v))
	if loaded {
		panic(fmt.Sprintf("actionable compo type %T already registered", v))
	}
}

func newActionableCompo(typeName string) (h.HTMLComponent, error) {
	if t, ok := actionableCompoTypeRegistry.Load(typeName); ok {
		return reflect.New(t.(reflect.Type).Elem()).Interface().(h.HTMLComponent), nil
	}
	return nil, fmt.Errorf("type not found: %s", typeName)
}
