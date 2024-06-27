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

const localsKeyActionBase = "actionBase"

func DefaultVarActionableLocals(c any) string {
	hash := ""
	if named, ok := any(c).(Named); ok {
		hash = MurmurHash3(fmt.Sprintf("%T:%s", c, named.CompoName()))
	} else {
		hash = MurmurHash3(fmt.Sprintf("%T", c))
	}
	return fmt.Sprintf(`_stateful_%s_`, hash)
}

func DefaultVarActionBase(c any) string {
	return DefaultVarActionableLocals(c) + "." + localsKeyActionBase
}

func Actionable[T h.HTMLComponent](ctx context.Context, c T, children ...h.HTMLComponent) (r h.HTMLComponent) {
	defer func() {
		if named, ok := any(c).(Named); ok {
			r = reloadable(named, r)
		}
	}()
	return web.Scope(children...).
		VSlot(fmt.Sprintf("{ locals: %s }", DefaultVarActionableLocals(c))).
		Init(fmt.Sprintf(`{%s: %s}`, localsKeyActionBase, PrettyJSONString(Action{
			ActionableType: fmt.Sprintf("%T", c),
			Actionable:     json.RawMessage(PrettyJSONString(c)),
			Injector:       InjectorNameFromContext(ctx),
			SyncQuery:      IsSyncQuery(ctx),
			Method:         "",
			Request:        json.RawMessage("{}"),
		})))
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
	varActionBase string
	fixes         []string
}

type PostActionOption func(*postActionOptions)

func WithVarActionBase(v string) PostActionOption {
	return func(o *postActionOptions) {
		o.varActionBase = v
	}
}

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
	if o.varActionBase == "" {
		o.varActionBase = DefaultVarActionBase(c)
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
	}
	return b.FieldValue(fieldKeyAction,
		web.Var(fmt.Sprintf(`JSON.stringify(function(){
	let v = vars.__clonedeep(%s);
	v.method = %q;
	v.request = %s;%s
	return v
}(), null, "\t")`,
			o.varActionBase,
			methodName,
			PrettyJSONString(request),
			fix,
		)),
	)
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
