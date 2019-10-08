package web_test

import (
	"strings"
	"testing"

	"github.com/goplaid/web"
	"github.com/theplant/testingutils"
)

var cases = []struct {
	operation func(b *web.PageInjector)
	expected  string
}{
	{
		operation: func(b *web.PageInjector) {
			b.Title("Hello")
		},
		expected: `<title>Hello</title>
<meta charset="utf8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"/>
		`,
	},
	{
		operation: func(b *web.PageInjector) {
			b.Title("Hello")
			b.Meta("charset", "shiftjis")
		},
		expected: `<title>Hello</title>
<meta charset="shiftjis"/>
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"/>
`,
	},
	{
		operation: func(b *web.PageInjector) {
			b.Title("Hello")
			b.Meta("charset", "shiftjis")
		},
		expected: `<title>Hello</title>
<meta charset="shiftjis"/>
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"/>
`,
	},
	{
		operation: func(b *web.PageInjector) {
			b.Title("Hello")
			b.Meta("charset", "shiftjis")
			b.Meta("charset", "utf8")
			b.MetaNameContent("keywords", "Hello")
		},
		expected: `<title>Hello</title>
<meta charset="shiftjis"/>
<meta charset="utf8"/>
<meta name="keywords" content="Hello"/>
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"/>
`,
	},

	{
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


<script async="" src="https://www.googletagmanager.com/gtag/js?id=UA-123123-1"></script>


<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'UA-123123-1');
</script>


<meta charset="utf8"/>
<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"/>
`,
	},
}

func TestDefaultPageInjector(t *testing.T) {
	for _, c := range cases {
		var b web.PageInjector
		c.operation(&b)
		diff := testingutils.PrettyJsonDiff(strings.TrimSpace(c.expected), strings.TrimSpace(b.GetHeadString()))
		if len(diff) > 0 {
			t.Error(diff)
		}
	}
}
