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
	h "github.com/theplant/htmlgo"
)

func init() {
	Install(web.Default)
}

func Install(b *web.Builder) {
	b.RegisterEventFunc(eventDispatchAction, eventDispatchActionHandler)
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
	LocalsKeyEncodeQuery = "encodeQuery"
)

func LocalsActionable(c any) string {
	hash := ""
	if named, ok := any(c).(Named); ok {
		hash = MurmurHash3(fmt.Sprintf("%T:%s", c, named.CompoName()))
	} else {
		hash = MurmurHash3(fmt.Sprintf("%T", c))
	}
	return fmt.Sprintf(`__actionable_%s__`, hash)
}

func Actionable[T h.HTMLComponent](ctx context.Context, c T, children ...h.HTMLComponent) (r h.HTMLComponent) {
	defer func() {
		if named, ok := any(c).(Named); ok {
			r = reloadable(named, r)
		}
	}()
	actionBase := PrettyJSONString(Action{
		CompoType: fmt.Sprintf("%T", c),
		Compo:     json.RawMessage(PrettyJSONString(c)),
		Injector:  InjectorNameFromContext(ctx),
		SyncQuery: IsSyncQuery(ctx),
		Method:    "",
		Request:   json.RawMessage("{}"),
	})
	queryTags, err := GetQueryTags(c)
	if err != nil {
		panic(err)
	}
	return web.Scope(children...).
		VSlot(fmt.Sprintf("{ locals: %s }", LocalsActionable(c))).
		Init(fmt.Sprintf(`{
	%s: function() {
		return %s;
	},
	%s: function(v) {
		if (!v.sync_query) {
			return "";
		}
		return vars.__encodeObjectToQuery(v.compo, %s || []);
	},
}`, LocalsKeyNewAction, actionBase, LocalsKeyEncodeQuery, h.JSONString(queryTags)))
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

func postAction(_ context.Context, c any, method any, request any, o *postActionOptions) *web.VueEventTagBuilder {
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

	if o.useProvidedCompo {
		o.fixes = append([]string{fmt.Sprintf("v.compo = %s;", PrettyJSONString(c))}, o.fixes...)
	}

	fix := ""
	if len(o.fixes) > 0 {
		fix = "\n" + strings.Join(o.fixes, "\n")
		// TODO: This needs to be optimized to remove only the smallest number of spaces first, and then add the prefixes uniformly
		lines := strings.Split(fix, "\n")
		for i, line := range lines {
			line := strings.TrimSpace(line)
			if line == "" {
				lines[i] = line
				continue
			}
			lines[i] = "\t" + line
		}
		fix = strings.Join(lines, "\n")
	}

	locals := LocalsActionable(c)
	b.Run(web.Var(fmt.Sprintf(`function(b){
		const actionable = b.parent ? b.parent.__actionable__ : %s;
		b.__actionable__ = actionable;

		let v = actionable.%s(); // %T
		v.method = %q;
		v.request = %s;%s

		b.__action__ = v;
		b.__stringQuery__ = actionable.%s(v);
	}`,
		locals,
		LocalsKeyNewAction, c,
		methodName,
		PrettyJSONString(request),
		fix,
		LocalsKeyEncodeQuery,
	)))
	b.StringQuery(web.Var(`(b) => b.__stringQuery__`))
	b.PushState(web.Var(`(b) => !!b.__stringQuery__`)) // TODO: duplicate path?query should not actually be executed
	return b.FieldValue(fieldKeyAction, web.Var(`(b) => JSON.stringify(b.__action__, null, "\t")`))
}

var (
	outType0 = reflect.TypeOf(web.EventResponse{})
	outType1 = reflect.TypeOf((*error)(nil)).Elem()
	inType0  = reflect.TypeOf((*context.Context)(nil)).Elem()
)

func eventDispatchActionHandler(evCtx *web.EventContext) (r web.EventResponse, err error) {
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
		evCtx.R = evCtx.R.WithContext(WithInjectorName(evCtx.R.Context(), action.Injector))
		if err := Apply(evCtx.R.Context(), v); err != nil {
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
		rc, ok := v.(Named)
		if !ok {
			return r, fmt.Errorf("compo %T does not implement Named", v)
		}
		return OnReload(rc)
	default:
		return r, fmt.Errorf("action method %q not found", action.Method)
	}
}

var actionableCompoTypeRegistry = new(sync.Map)

func RegisterActionableCompoType(vs ...any) {
	for _, v := range vs {
		registerActionableCompoType(v)
	}
}

func registerActionableCompoType(v any) {
	_, loaded := actionableCompoTypeRegistry.LoadOrStore(fmt.Sprintf("%T", v), reflect.TypeOf(v))
	if loaded {
		panic(fmt.Sprintf("actionable compo type %T already registered", v))
	}
}

func newActionableCompo(typeName string) (any, error) {
	if t, ok := actionableCompoTypeRegistry.Load(typeName); ok {
		return reflect.New(t.(reflect.Type).Elem()).Interface(), nil
	}
	return nil, fmt.Errorf("type not found: %s", typeName)
}
