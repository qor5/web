package web_test

import (
	"context"
	"strings"
	"testing"

	"github.com/goplaid/web"
	h "github.com/theplant/htmlgo"
	"github.com/theplant/testingutils"
)

var cases = []struct {
	name      string
	operation func(b *web.PageInjector)
	expected  string
}{
	{
		name: "title",
		operation: func(b *web.PageInjector) {
			b.Title("Hello")
		},
		expected: `<title>Hello</title>

<meta charset='utf8'>

<meta name='viewport' content='width=device-width, initial-scale=1, shrink-to-fit=no'>
		`,
	},
	{
		name: "title and charset",
		operation: func(b *web.PageInjector) {
			b.Title("Hello")
			b.Meta(web.MetaKey("charset"), "charset", "shiftjis")
		},
		expected: `<title>Hello</title>

<meta charset='shiftjis'>

<meta name='viewport' content='width=device-width, initial-scale=1, shrink-to-fit=no'>
`,
	},
	{
		name: "title and charset double",
		operation: func(b *web.PageInjector) {
			b.Title("Hello")
			b.Meta(web.MetaKey("charset"), "charset", "shiftjis")
			b.Meta(web.MetaKey("charset"), "charset", "utf8")
			b.MetaNameContent("keywords", "Hello")
		},
		expected: `<title>Hello</title>

<meta charset='utf8'>

<meta name='keywords' content='Hello'>

<meta name='viewport' content='width=device-width, initial-scale=1, shrink-to-fit=no'>
`,
	},

	{
		name: "script tag",
		operation: func(b *web.PageInjector) {
			b.HeadHTML(`
<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=UA-123123-1"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'UA-123123-1');
</script>
`)
		},
		expected: `
<!-- Global site tag (gtag.js) - Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=UA-123123-1"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'UA-123123-1');
</script>

<meta charset='utf8'>

<meta name='viewport' content='width=device-width, initial-scale=1, shrink-to-fit=no'>
`,
	},
}

func TestDefaultPageInjector(t *testing.T) {
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {

			var b web.PageInjector
			c.operation(&b)
			diff := testingutils.PrettyJsonDiff(
				strings.TrimSpace(c.expected),
				strings.TrimSpace(h.MustString(b.GetHeadHTMLComponent(), context.TODO())))
			if len(diff) > 0 {
				t.Error(diff)
			}
		})
	}
}
