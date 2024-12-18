package web

import (
	"fmt"
	"net/url"
	"strconv"
	"strings"

	"github.com/iancoleman/strcase"
	"github.com/samber/lo"
	h "github.com/theplant/htmlgo"
)

type jsCall struct {
	method string
	args   []interface{}
	raw    string
}

type Var string

type VueEventTagBuilder struct {
	beforeScript string
	calls        []jsCall
	afterScript  string
	thenScript   string
}

func Plaid() (r *VueEventTagBuilder) {
	r = &VueEventTagBuilder{
		calls: []jsCall{
			{
				method: "plaid",
			},
		},
	}
	r.Vars(Var("vars")).
		Locals(Var("locals")).
		Form(Var("form")).
		Dash(Var("dash"))
	return
}

func GET() (r *VueEventTagBuilder) {
	return Plaid().Method("GET")
}

func POST() (r *VueEventTagBuilder) {
	return Plaid().Method("POST")
}

// URL is request page url without push state
func (b *VueEventTagBuilder) URL(url interface{}) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "url",
		args:   []interface{}{url},
	})
	return b
}

func (b *VueEventTagBuilder) EventFunc(id interface{}) (r *VueEventTagBuilder) {
	c := jsCall{
		method: "eventFunc",
		args:   []interface{}{id},
	}
	b.calls = append(b.calls, c)
	return b
}

func (b *VueEventTagBuilder) Method(v interface{}) (r *VueEventTagBuilder) {
	c := jsCall{
		method: "method",
		args:   []interface{}{v},
	}
	b.calls = append(b.calls, c)
	return b
}

func (b *VueEventTagBuilder) Reload() (r *VueEventTagBuilder) {
	b.Raw("reload()")
	return b
}

func (b *VueEventTagBuilder) Vars(v interface{}) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "vars",
		args:   []interface{}{v},
	})
	return b
}

func (b *VueEventTagBuilder) Locals(v interface{}) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "locals",
		args:   []interface{}{v},
	})
	return b
}
func (b *VueEventTagBuilder) Dash(v interface{}) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "dash",
		args:   []interface{}{v},
	})
	return b
}

func (b *VueEventTagBuilder) MergeQuery(v interface{}) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "mergeQuery",
		args:   []interface{}{v},
	})
	return b
}

func (b *VueEventTagBuilder) Query(key interface{}, vs interface{}) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "query",
		args:   []interface{}{key, vs},
	})
	return b
}

func (b *VueEventTagBuilder) QueryIf(key interface{}, vs interface{}, add bool) (r *VueEventTagBuilder) {
	if !add {
		return b
	}
	b.calls = append(b.calls, jsCall{
		method: "query",
		args:   []interface{}{key, vs},
	})
	return b
}

// ClearMergeQuery param v use interface{} because you can not only pass []string,
// but also pass in javascript variables by using web.Var("$event")
func (b *VueEventTagBuilder) ClearMergeQuery(v interface{}) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "clearMergeQuery",
		args:   []interface{}{v},
	})
	return b
}

func (b *VueEventTagBuilder) StringQuery(v interface{}) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "stringQuery",
		args:   []interface{}{v},
	})
	return b
}

func (b *VueEventTagBuilder) StringifyOptions(v interface{}) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "stringifyOptions",
		args:   []interface{}{v},
	})
	return b
}

func (b *VueEventTagBuilder) PushState(v interface{}) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "pushState",
		args:   []interface{}{v},
	})
	return b
}

func (b *VueEventTagBuilder) Location(v *LocationBuilder) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "location",
		args:   []interface{}{v},
	})
	return b
}

func (b *VueEventTagBuilder) Queries(v url.Values) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "queries",
		args:   []interface{}{v},
	})
	return b
}

func (b *VueEventTagBuilder) PushStateURL(v string) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "pushStateURL",
		args:   []interface{}{v},
	})
	return b
}

func (b *VueEventTagBuilder) Form(v interface{}) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "form",
		args:   []interface{}{v},
	})
	return b
}

func (b *VueEventTagBuilder) FieldValue(name interface{}, v interface{}) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "fieldValue",
		args:   []interface{}{name, v},
	})
	return b
}

// BeforeFetch
// example: BeforeFetch(`({b, url, opts}) => { url+="#123"; opts.body.set("name", "felix"); return [url, opts] }`)
func (b *VueEventTagBuilder) BeforeFetch(f string) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "beforeFetch",
		args:   []interface{}{Var(f)},
	})
	return b
}

func (b *VueEventTagBuilder) Run(v interface{}) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "run",
		args:   []interface{}{v},
	})
	return b
}

func (b *VueEventTagBuilder) PopState(v interface{}) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "popstate",
		args:   []interface{}{v},
	})
	return b
}

func (b *VueEventTagBuilder) Raw(script string) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		raw: script,
	})
	return b
}

func (b *VueEventTagBuilder) Go() (r string) {
	b.Raw("go()")
	return b.String()
}

func (b *VueEventTagBuilder) RunPushState() (r string) {
	b.Raw("runPushState()")
	return b.String()
}

func (b *VueEventTagBuilder) BeforeScript(script string) (r *VueEventTagBuilder) {
	b.beforeScript = script
	return b
}

func (b *VueEventTagBuilder) AfterScript(script string) (r *VueEventTagBuilder) {
	b.afterScript = script
	return b
}

func (b *VueEventTagBuilder) ThenScript(script string) (r *VueEventTagBuilder) {
	b.thenScript = script
	return b
}

func (b *VueEventTagBuilder) String() string {
	var cs []string
	for _, c := range b.calls {
		if len(c.raw) > 0 {
			cs = append(cs, c.raw)
			continue
		}

		if len(c.args) == 0 {
			cs = append(cs, fmt.Sprintf("%s()", c.method))
			continue
		}

		if len(c.args) == 1 {
			cs = append(cs, fmt.Sprintf("%s(%s)", c.method, toJsValue(c.args[0])))
			continue
		}

		var args []string
		for _, arg := range c.args {
			args = append(args, toJsValue(arg))
		}
		cs = append(cs, fmt.Sprintf("%s(%s)", c.method, strings.Join(args, ", ")))
	}

	if len(b.thenScript) > 0 {
		cs = append(cs, fmt.Sprintf("then(function(r){ %s })", b.thenScript))
	}

	var sems []string
	if len(b.beforeScript) > 0 {
		sems = append(sems, b.beforeScript)
	}
	sems = append(sems, strings.Join(cs, "."))
	if len(b.afterScript) > 0 {
		sems = append(sems, b.afterScript)
	}
	return strings.Join(sems, "; ")
}

func toJsValue(v interface{}) string {
	switch v.(type) {
	case Var:
		return fmt.Sprint(v)
	default:
		return h.JSONString(v)
	}
}

func (b *VueEventTagBuilder) MarshalJSON() ([]byte, error) {
	panic(fmt.Sprintf("call .Go() at the end, value: %s", b.String()))
}

func VAssign(varName string, v interface{}) []interface{} {
	varVal, ok := v.(string)
	if !ok {
		varVal = h.JSONString(v)
	}
	return []interface{}{
		"v-assign",
		fmt.Sprintf("[%s, %s]", varName, varVal),
	}
}

func VField(name string, value interface{}) []interface{} {
	objValue := map[string]interface{}{name: value}
	return append([]interface{}{
		"v-model",
		fmt.Sprintf("form[%s]", h.JSONString(name)),
	}, VAssign("form", objValue)...)
}

func GlobalEvents() *h.HTMLTagBuilder {
	return h.Tag("global-events")
}

func RunScript(s string) *h.HTMLTagBuilder {
	return h.Div().Style("display: none;").Attr("v-on-mounted", s)
}

func Emit(name string, payloads ...any) string {
	args := []string{
		strconv.Quote(strcase.ToCamel(name)),
	}
	args = append(args, lo.Map(payloads, func(p any, _ int) string {
		return toJsValue(p)
	})...)
	return fmt.Sprintf(`plaid().vars(vars).emit(%s)`, strings.Join(args, ", "))
}

func (r *EventResponse) Emit(name string, payloads ...any) {
	AppendRunScripts(r, Emit(name, payloads...))
}

func Listen(vs ...string) *h.HTMLTagBuilder {
	if len(vs)%2 != 0 {
		panic("Listen arguments must have an even number")
	}

	t := h.Tag("go-plaid-listener")
	for i := 0; i < len(vs); i = i + 2 {
		setOnAttr(t, vs[i], vs[i+1])
	}
	return t
}

func setOnAttr(tag *h.HTMLTagBuilder, event string, fn string) {
	fn = strings.TrimSpace(fn)
	if !strings.HasPrefix(fn, "function") && !strings.HasPrefix(fn, "(") {
		fn = fmt.Sprintf("(payload) => { %s }", fn)
	}
	tag.Attr("@"+strcase.ToKebab(strcase.ToCamel(event)), fn)
}

// ParentSizeObserver is a component that observes the size of its parent element.
// vslot example: "{ width, height }"
func ParentSizeObserver(vslot string) *h.HTMLTagBuilder {
	return h.Tag("parent-size-observer").Attr("v-slot", vslot)
}
