package stateful

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"reflect"
	"strings"

	cmap "github.com/orcaman/concurrent-map/v2"
	"github.com/pkg/errors"
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
	ActionableType string          `json:"actionable_type"`
	Actionable     json.RawMessage `json:"actionable"`
	Injector       string          `json:"injector"`
	SyncQuery      bool            `json:"sync_query"`
	Method         string          `json:"method"`
	Request        json.RawMessage `json:"request"`
}

const (
	LocalsKeyNewAction   = "newAction"
	LocalsKeyEncodeQuery = "encodeQuery"
)

func DefaultVarActionableLocals(c any) string {
	hash := ""
	if named, ok := any(c).(Named); ok {
		hash = MurmurHash3(fmt.Sprintf("%T:%s", c, named.CompoName()))
	} else {
		hash = MurmurHash3(fmt.Sprintf("%T", c))
	}
	return fmt.Sprintf(`_stateful_%s_`, hash)
}

func Actionable[T h.HTMLComponent](ctx context.Context, c T, children ...h.HTMLComponent) (r h.HTMLComponent) {
	defer func() {
		if named, ok := any(c).(Named); ok {
			r = Reloadable(named, r)
		}
	}()
	actionBase := PrettyJSONString(Action{
		ActionableType: fmt.Sprintf("%T", c),
		Actionable:     json.RawMessage(PrettyJSONString(c)),
		Injector:       InjectorNameFromContext(ctx),
		SyncQuery:      IsSyncQuery(ctx),
		Method:         "",
		Request:        json.RawMessage("{}"),
	})
	queryTags, err := GetQueryTags(c)
	if err != nil {
		panic(err)
	}
	return web.Scope(children...).
		VSlot(fmt.Sprintf("{ locals: %s }", DefaultVarActionableLocals(c))).
		Init(fmt.Sprintf(`{
	%s: function() {
		return %s;
	},
	%s: function(v) {
		if (!v.sync_query) {
			return "";
		}
		return vars.__encodeObjectToQuery(v.actionable, %s || []);
	},
}`, LocalsKeyNewAction, actionBase, LocalsKeyEncodeQuery, h.JSONString(queryTags)))
}

const eventDispatchAction = "__dispatch_actionable_action__"

const (
	fieldKeyAction = "__action__"
)

func PostAction(ctx context.Context, c any, method any, request any) *web.VueEventTagBuilder {
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

	action := Action{
		ActionableType: fmt.Sprintf("%T", c),
		Actionable:     json.RawMessage(h.JSONString(c)),
		Injector:       InjectorNameFromContext(ctx),
		Method:         methodName,
		Request:        json.RawMessage(h.JSONString(request)),
	}

	if IsSyncQuery(ctx) {
		action.SyncQuery = true

		queries, err := queryEncoder.Encode(c)
		if err != nil {
			panic(err)
		}
		b.Queries(queries).MergeQuery(true).PushState(true)
	}

	return b.FieldValue(fieldKeyAction, web.Var(
		fmt.Sprintf(`JSON.stringify(%s, null, "\t")`, PrettyJSONString(action)),
	))
}

type postActionOptions struct {
	fixes []string
}

type PostActionOption func(*postActionOptions)

func WithAppendFix(v string) PostActionOption {
	return func(o *postActionOptions) {
		o.fixes = append(o.fixes, v)
	}
}

func PostActionX(ctx context.Context, c any, method any, request any, opts ...PostActionOption) *web.VueEventTagBuilder {
	o := new(postActionOptions)
	for _, opt := range opts {
		opt(o)
	}

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

	fix := ""
	if len(o.fixes) > 0 {
		fix = "\n" + strings.Join(o.fixes, "\n")
		// TODO: 这个需要优化成，先只移除最小的空格数，然后再统一添加 prefix
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

	locals := DefaultVarActionableLocals(c)
	b.Run(web.Var(fmt.Sprintf(`function(b){
		const stateful = b.parent ? b.parent.__stateful__ : %s;
		b.__stateful__ = stateful;

		let v = stateful.%s(); // %T
		v.method = %q;
		v.request = %s;%s

		b.__action__ = v;
		b.__stringQuery__ = stateful.%s(v);
	}`,
		locals,
		LocalsKeyNewAction, c,
		methodName,
		PrettyJSONString(request),
		fix,
		LocalsKeyEncodeQuery,
	)))
	b.StringQuery(web.Var(`(b) => b.__stringQuery__`))
	b.PushState(web.Var(`(b) => !!b.__stringQuery__`))
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
		return r, errors.Wrap(err, "failed to unmarshal action")
	}

	v, err := newActionable(action.ActionableType)
	if err != nil {
		return r, err
	}

	err = json.Unmarshal(action.Actionable, v)
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
			return r, errors.Errorf("action method %q has incorrect signature", action.Method)
		}

		numIn := methodType.NumIn()
		if numIn <= 0 || numIn > 2 {
			return r, errors.Errorf("action method %q has incorrect number of arguments", action.Method)
		}
		if methodType.In(0) != inType0 {
			return r, errors.Errorf("action method %q has incorrect signature", action.Method)
		}
		ctxValue := reflect.ValueOf(evCtx.R.Context())

		params := []reflect.Value{ctxValue}
		if numIn == 2 {
			argType := methodType.In(1)
			argValue := reflect.New(argType).Interface()
			err := json.Unmarshal([]byte(action.Request), &argValue)
			if err != nil {
				return r, errors.Wrapf(err, "failed to unmarshal action request to %T", argValue)
			}
			params = append(params, reflect.ValueOf(argValue).Elem())
		}

		result := method.Call(params)
		if len(result) != 2 || !result[0].CanInterface() || !result[1].CanInterface() {
			return r, errors.Errorf("action method %q has incorrect return values", action.Method)
		}
		r = result[0].Interface().(web.EventResponse)
		if result[1].IsNil() {
			return r, nil
		}
		err = result[1].Interface().(error)
		return r, errors.Wrapf(err, "failed to call action method %q", action.Method)
	}

	switch action.Method {
	case actionMethodReload:
		rc, ok := v.(Named)
		if !ok {
			return r, errors.Errorf("actionable %T does not implement Named", v)
		}
		return OnReload(rc)
	default:
		return r, errors.Errorf("action method %q not found", action.Method)
	}
}

var actionableTypeRegistry = cmap.New[reflect.Type]()

func RegisterActionableType(vs ...any) {
	for _, v := range vs {
		registerActionableType(v)
	}
}

func registerActionableType(v any) {
	if !actionableTypeRegistry.SetIfAbsent(fmt.Sprintf("%T", v), reflect.TypeOf(v)) {
		panic(fmt.Sprintf("actionable type %T already registered", v))
	}
}

func newActionable(typeName string) (any, error) {
	if t, ok := actionableTypeRegistry.Get(typeName); ok {
		return reflect.New(t.Elem()).Interface(), nil
	}
	return nil, errors.Errorf("type not found: %s", typeName)
}
