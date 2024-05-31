package web

import (
	"fmt"

	h "github.com/theplant/htmlgo"
)

type headKey int

const (
	titleKey headKey = iota
)

type MetaKey string

type keyComp struct {
	key  interface{}
	comp h.HTMLComponent
}

type PageInjector struct {
	skipDefaultSetting bool
	comps              map[injectPosition][]*keyComp
	lang               string
}

type injectPosition int

const (
	head injectPosition = iota
	tail
	extra
)

func (b *PageInjector) putComp(key interface{}, comp h.HTMLComponent, pos injectPosition, replace bool) {
	if b.comps == nil {
		b.comps = make(map[injectPosition][]*keyComp)
	}
	for _, h := range b.comps[pos] {
		if h.key == key {
			if !replace {
				return
			}
			h.comp = comp
			return
		}
	}

	b.comps[pos] = append(b.comps[pos], &keyComp{key: key, comp: comp})
}

func (b *PageInjector) getComp(key interface{}, pos injectPosition) *keyComp {
	for _, h := range b.comps[pos] {
		if h.key == key {
			return h
		}
	}

	return nil
}

// SkipDefaultSetting skips the setting of default nodes
func (b *PageInjector) SkipDefaultSetting() {
	b.skipDefaultSetting = true
}

func (b *PageInjector) setDefault() {
	if b.skipDefaultSetting {
		return
	}

	if b.getComp(MetaKey("charset"), head) == nil {
		b.Meta(MetaKey("charset"), "charset", "utf8")
	}
	if b.getComp(MetaKey("viewport"), head) == nil {
		b.MetaNameContent("viewport", "width=device-width, initial-scale=1, shrink-to-fit=no")
	}
}

func (b *PageInjector) Title(title string) {
	b.addNode(h.Title(""), titleKey, true, title)
	return
}

func (b *PageInjector) HasTitle() (r bool) {
	return b.getComp(titleKey, head) != nil
}

func (b *PageInjector) MetaNameContent(name, content string) {
	b.Meta(MetaKey(name), "name", name, "content", content)
	return
}

func (b *PageInjector) Meta(key interface{}, attrs ...string) {
	b.addNode(h.Meta(), key, true, "", attrs...)
	return
}

func (b *PageInjector) TailHTML(v string) {
	b.TailHTMLComponent(v, h.RawHTML(v), true)
	return
}

func (b *PageInjector) TailHTMLComponent(key interface{}, comp h.HTMLComponent, replace bool) {
	b.putComp(key, comp, tail, replace)
	return
}

func (b *PageInjector) Clear() (r *PageInjector) {
	b.comps = make(map[injectPosition][]*keyComp)
	return b
}

func (b *PageInjector) HeadHTML(v string) {
	b.HeadHTMLComponent(v, h.RawHTML(v), true)
	return
}

func (b *PageInjector) HeadHTMLComponent(key interface{}, comp h.HTMLComponent, replace bool) {
	b.putComp(key, comp, head, replace)
	return
}

func toHTMLComponent(list []*keyComp) h.HTMLComponent {
	var r []h.HTMLComponent
	for _, h := range list {
		r = append(r, h.comp)
	}
	return h.Components(r...)
}

func (b *PageInjector) GetHeadHTMLComponent() h.HTMLComponent {
	b.setDefault()
	return toHTMLComponent(b.comps[head])
}

func (b *PageInjector) GetTailHTMLComponent() h.HTMLComponent {
	return toHTMLComponent(b.comps[tail])
}

func (b *PageInjector) GetExtraHTMLComponent() h.HTMLComponent {
	return toHTMLComponent(b.comps[extra])
}

func (b *PageInjector) HTMLLang(lang string) {
	b.lang = lang
	return
}

func (b *PageInjector) HTMLLangAttrs() []any {
	if len(b.lang) == 0 {
		return nil
	}
	return []any{"lang", b.lang}
}

func (b *PageInjector) addNode(tag *h.HTMLTagBuilder, key interface{}, replace bool, body string, attrs ...string) {
	l := len(attrs)
	if l%2 != 0 {
		panic(fmt.Sprintf("attrs should be pairs: %+v, length: %d", attrs, l))
	}

	for i := 0; i < l; i = i + 2 {
		tag.Attr(attrs[i], attrs[i+1])
	}

	if len(body) > 0 {
		tag.Text(body)
	}

	b.putComp(key, tag, head, replace)
}
