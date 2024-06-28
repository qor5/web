package stateful

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"reflect"
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
	ActionableType string          `json:"actionable_type"`
	Actionable     json.RawMessage `json:"actionable"`
	Injector       string          `json:"injector"`
	SyncQuery      bool            `json:"sync_query"`
	Method         string          `json:"method"`
	Request        json.RawMessage `json:"request"`
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
		Injector:       injectorNameFromContext(ctx),
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

	v, err := newActionable(action.ActionableType)
	if err != nil {
		return r, err
	}

	err = json.Unmarshal(action.Actionable, v)
	if err != nil {
		return r, err
	}

	if action.Injector != "" {
		evCtx.R = evCtx.R.WithContext(withInjectorName(evCtx.R.Context(), action.Injector))
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
			return r, fmt.Errorf("actionable %T does not implement Reloadable", v)
		}
		return OnReload(rc)
	default:
		return r, fmt.Errorf("action method %q not found", action.Method)
	}
}

var actionableTypeRegistry = new(sync.Map)

func RegisterActionableType(vs ...any) {
	for _, v := range vs {
		registerActionableType(v)
	}
}

func registerActionableType(v any) {
	_, loaded := actionableTypeRegistry.LoadOrStore(fmt.Sprintf("%T", v), reflect.TypeOf(v))
	if loaded {
		panic(fmt.Sprintf("actionable type %T already registered", v))
	}
}

func newActionable(typeName string) (any, error) {
	if t, ok := actionableTypeRegistry.Load(typeName); ok {
		return reflect.New(t.(reflect.Type).Elem()).Interface(), nil
	}
	return nil, fmt.Errorf("type not found: %s", typeName)
}
