package examples

import (
	"net/http"

	"github.com/qor5/web/v3"
)

// @snippet_begin(DemoLayoutSample)
func demoLayout(in web.PageFunc) (out web.PageFunc) {
	return func(ctx *web.EventContext) (pr web.PageResponse, err error) {

		ctx.Injector.HeadHTML(`
			<script src='/assets/vue.js'></script>
		`)

		ctx.Injector.TailHTML(`
			<script src='/assets/main.js'></script>
		`)
		ctx.Injector.HeadHTML(`
		<style>
			[v-cloak] {
				display: none;
			}
		</style>
		`)

		var innerPr web.PageResponse
		innerPr, err = in(ctx)
		if err != nil {
			panic(err)
		}

		pr.Body = innerPr.Body

		return
	}
}

// @snippet_end

// @snippet_begin(DemoBootstrapLayoutSample)
func demoBootstrapLayout(in web.PageFunc) (out web.PageFunc) {
	return func(ctx *web.EventContext) (pr web.PageResponse, err error) {

		ctx.Injector.HeadHTML(`
<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/css/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
<script src='/assets/vue.js'></script>
		`)

		ctx.Injector.TailHTML(`
<script src="https://code.jquery.com/jquery-3.3.1.slim.min.js" integrity="sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo" crossorigin="anonymous"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.7/umd/popper.min.js" integrity="sha384-UO2eT0CpHqdSJQ6hJty5KVphtPhzWj9WO1clHTMGa3JDZwrnQq4sF86dIHNDz0W1" crossorigin="anonymous"></script>
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.3.1/js/bootstrap.min.js" integrity="sha384-JjSmVgyd0p3pXB1rRibZUAYoIIy6OrQ6VrjIEaFf/nJGzIxFDsf4x0xIM+B07jRM" crossorigin="anonymous"></script>
<script src='/assets/main.js'></script>

`)
		ctx.Injector.HeadHTML(`
		<style>
			[v-cloak] {
				display: none;
			}
		</style>
		`)

		var innerPr web.PageResponse
		innerPr, err = in(ctx)
		if err != nil {
			panic(err)
		}

		pr.Body = innerPr.Body

		return
	}
}

// @snippet_end

type Muxer interface {
	Handle(pattern string, handler http.Handler)
}

func Mux(mux Muxer) {

	emptyUb := web.New().LayoutFunc(web.NoopLayoutFunc)

	mux.Handle(TypeSafeBuilderSamplePath, TypeSafeBuilderSamplePFPB.Builder(emptyUb))

	// @snippet_begin(HelloWorldMuxSample2)
	mux.Handle(HelloWorldPath, HelloWorldPB)
	// @snippet_end

	// @snippet_begin(HelloWorldReloadMuxSample1)
	mux.Handle(
		HelloWorldReloadPath,
		HelloWorldReloadPB.Wrap(demoLayout),
	)
	// @snippet_end

	mux.Handle(
		HelloButtonPath,
		HelloButtonPB.Wrap(demoLayout),
	)

	mux.Handle(
		Page1Path,
		Page1PB.Wrap(demoLayout),
	)
	mux.Handle(
		Page2Path,
		Page2PB.Wrap(demoLayout),
	)

	mux.Handle(
		ReloadWithFlashPath,
		ReloadWithFlashPB.Wrap(demoLayout),
	)

	mux.Handle(
		PartialUpdatePagePath,
		PartialUpdatePagePB.Wrap(demoLayout),
	)

	mux.Handle(
		PartialReloadPagePath,
		PartialReloadPagePB.Wrap(demoLayout),
	)

	mux.Handle(
		MultiStatePagePath,
		MultiStatePagePB.Wrap(demoLayout),
	)

	mux.Handle(
		FormHandlingPagePath,
		FormHandlingPagePB.Wrap(demoLayout),
	)

	mux.Handle(
		CompositeComponentSample1PagePath,
		CompositeComponentSample1PagePB.Wrap(demoBootstrapLayout),
	)

	mux.Handle(
		EventExamplePagePath,
		ExamplePagePB.Wrap(demoLayout),
	)

	mux.Handle(
		EventHandlingPagePath,
		EventHandlingPagePB.Wrap(demoLayout),
	)

	mux.Handle(
		WebScopeUseLocalsPath,
		UseLocalsPB.Wrap(demoLayout),
	)

	mux.Handle(
		WebScopeUseFormPath,
		UsePlaidFormPB.Wrap(demoLayout),
	)

	mux.Handle(
		TodoMVCExamplePath,
		TodoMVCExamplePB.Wrap(demoLayout),
	)

	mux.Handle(
		TreeViewExamplePath,
		TreeViewExamplePB.Wrap(demoLayout),
	)

	mux.Handle(
		ShortCutSamplePath,
		ShortCutSamplePB.Wrap(demoLayout),
	)
}
