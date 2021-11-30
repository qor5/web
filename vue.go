package web

import (
	"fmt"
	"net/url"
	"strings"

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
}

func Plaid() (r *VueEventTagBuilder) {
	r = &VueEventTagBuilder{
		calls: []jsCall{
			{
				method: "$plaid",
			},
		},
	}
	r. /*Event(Var("$event")).*/
		Vars(Var("vars")).
		Form(Var("plaidForm"))
	return
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

func (b *VueEventTagBuilder) Reload() (r *VueEventTagBuilder) {
	b.Raw("reload()")
	return b
}

func (b *VueEventTagBuilder) Event(v interface{}) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "event",
		args:   []interface{}{v},
	})
	return b
}

func (b *VueEventTagBuilder) Vars(v interface{}) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "vars",
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

func (b *VueEventTagBuilder) PushState(v interface{}) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "pushState",
		args:   []interface{}{v},
	})
	return b
}

func (b *VueEventTagBuilder) Location(v *LocationBuilder) (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "pushState",
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

func (b *VueEventTagBuilder) FormClear() (r *VueEventTagBuilder) {
	b.calls = append(b.calls, jsCall{
		method: "formClear",
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

func (b *VueEventTagBuilder) BeforeScript(script string) (r *VueEventTagBuilder) {
	b.beforeScript = script
	return b
}

func (b *VueEventTagBuilder) AfterScript(script string) (r *VueEventTagBuilder) {
	b.afterScript = script
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

const InitContextVars = "v-init-context:vars"
const InitContextLocals = "v-init-context:locals"

type VFieldNameOption interface {
	private()
}

type UseForm string

func (UseForm) private() {}

func VFieldName(v string, opts ...VFieldNameOption) []interface{} {
	formVar := "plaidForm"
	for _, op := range opts {
		if vf, ok := op.(UseForm); ok {
			formVar = string(vf)
		}
	}

	return []interface{}{
		"v-field-name",
		fmt.Sprintf("[%s, %s]", formVar, h.JSONString(v)),
	}
}

func GlobalEvents() *h.HTMLTagBuilder {
	return h.Tag("global-events")
}
