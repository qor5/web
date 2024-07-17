package examples_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/qor5/web/v3/examples"
	"github.com/qor5/web/v3/multipartestutils"
	"github.com/stretchr/testify/require"
)

func TestTodoMVCExamplePB(t *testing.T) {
	cases := []multipartestutils.TestCase{
		{
			Name: "index",
			ReqFunc: func() *http.Request {
				return httptest.NewRequest("GET", "/", nil)
			},
			ExpectPageBodyContainsInOrder: []string{
				"portal-name='TodoApp:TodoApp0'",
				"class='selected'>All</a>",
				"portal-name='TodoApp:TodoApp1'",
				"class='selected'>Completed</a>",
			},
		},
		{
			Name: "index with visibility active",
			ReqFunc: func() *http.Request {
				return httptest.NewRequest("GET", "/?visibility=active", nil)
			},
			ExpectPageBodyContainsInOrder: []string{
				"portal-name='TodoApp:TodoApp0'",
				"class='selected'>Active</a>",
				"portal-name='TodoApp:TodoApp1'",
				"class='selected'>Completed</a>",
			},
		},
		{
			Name: "add todo with empty title",
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/").
					EventFunc("__dispatch_stateful_action__").
					AddField("__action__", `
{
	"compo_type": "*examples.TodoApp",
	"compo": {
		"id": "TodoApp0",
		"visibility": "all"
	},
	"injector": "top",
	"sync_query": true,
	"method": "CreateTodo",
	"request": {
		"title": ""
	}
}`,
					).BuildEventFuncRequest()
			},
			EventResponseMatch: func(t *testing.T, er *multipartestutils.TestEventResponse) {
				require.Equal(t, `alert('title can not be empty')`, er.RunScript)
			},
		},
		{
			Name: "add todo",
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/").
					EventFunc("__dispatch_stateful_action__").
					AddField("__action__", `
{
	"compo_type": "*examples.TodoApp",
	"compo": {
		"id": "TodoApp0",
		"visibility": "all"
	},
	"injector": "top",
	"sync_query": true,
	"method": "CreateTodo",
	"request": {
		"title": "123"
	}
}`,
					).BuildEventFuncRequest()
			},
			EventResponseMatch: func(t *testing.T, er *multipartestutils.TestEventResponse) {
				require.Equal(t, `plaid().vars(vars).emit("NotifyTodosChanged")`, er.RunScript)
			},
		},
		{
			Name: "reload TodoApp1",
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/").
					EventFunc("__dispatch_stateful_action__").
					AddField("__action__", `
{
	"compo_type": "*examples.TodoApp",
	"compo": {
		"id": "TodoApp1",
		"visibility": "completed"
	},
	"injector": "top/sub",
	"sync_query": false,
	"method": "OnReload",
	"request": {}
}`,
					).BuildEventFuncRequest()
			},
			ExpectPortalUpdate0NotContains: []string{"123"},
		},
		{
			Name: "reload TodoApp1 to active",
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/").
					EventFunc("__dispatch_stateful_action__").
					AddField("__action__", `
{
	"compo_type": "*examples.TodoApp",
	"compo": {
		"id": "TodoApp1",
		"visibility": "active"
	},
	"injector": "top/sub",
	"sync_query": false,
	"method": "OnReload",
	"request": {}
}`,
					).BuildEventFuncRequest()
			},
			ExpectPortalUpdate0ContainsInOrder: []string{"123"},
		},
		{
			Name: "toggle",
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/").
					EventFunc("__dispatch_stateful_action__").
					AddField("__action__", `
{
	"compo_type": "*examples.TodoItem",
	"compo": {
		"id": "0"
	},
	"injector": "top",
	"sync_query": true,
	"method": "Toggle",
	"request": null
}`,
					).BuildEventFuncRequest()
			},
			EventResponseMatch: func(t *testing.T, er *multipartestutils.TestEventResponse) {
				require.Equal(t, `plaid().vars(vars).emit("NotifyTodosChanged")`, er.RunScript)
			},
		},
		{
			Name: "reload TodoApp1",
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/").
					EventFunc("__dispatch_stateful_action__").
					AddField("__action__", `
{
	"compo_type": "*examples.TodoApp",
	"compo": {
		"id": "TodoApp1",
		"visibility": "completed"
	},
	"injector": "top/sub",
	"sync_query": false,
	"method": "OnReload",
	"request": {}
}`,
					).BuildEventFuncRequest()
			},
			ExpectPortalUpdate0ContainsInOrder: []string{"123"},
		},
		{
			Name: "reload TodoApp0",
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/").
					EventFunc("__dispatch_stateful_action__").
					AddField("__action__", `
{
	"compo_type": "*examples.TodoApp",
	"compo": {
		"id": "TodoApp0",
		"visibility": "all"
	},
	"injector": "top",
	"sync_query": true,
	"method": "OnReload",
	"request": {}
}`,
					).BuildEventFuncRequest()
			},
			ExpectPortalUpdate0ContainsInOrder: []string{"123"},
		},
		{
			Name: "toggle all",
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/").
					EventFunc("__dispatch_stateful_action__").
					AddField("__action__", `
{
	"compo_type": "*examples.TodoApp",
	"compo": {
		"id": "TodoApp0",
		"visibility": "all"
	},
	"injector": "top",
	"sync_query": true,
	"method": "ToggleAll",
	"request": null
}`,
					).BuildEventFuncRequest()
			},
			EventResponseMatch: func(t *testing.T, er *multipartestutils.TestEventResponse) {
				require.Equal(t, `plaid().vars(vars).emit("NotifyTodosChanged")`, er.RunScript)
			},
		},
		{
			Name: "reload TodoApp0",
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/").
					EventFunc("__dispatch_stateful_action__").
					AddField("__action__", `
{
	"compo_type": "*examples.TodoApp",
	"compo": {
		"id": "TodoApp0",
		"visibility": "active"
	},
	"injector": "top",
	"sync_query": true,
	"method": "OnReload",
	"request": {}
}`,
					).BuildEventFuncRequest()
			},
			ExpectPortalUpdate0ContainsInOrder: []string{"123"},
		},
		{
			Name: "remove todo",
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/").
					EventFunc("__dispatch_stateful_action__").
					AddField("__action__", `
{
	"compo_type": "*examples.TodoItem",
	"compo": {
		"id": "0"
	},
	"injector": "top",
	"sync_query": true,
	"method": "Remove",
	"request": null
}`,
					).BuildEventFuncRequest()
			},
			EventResponseMatch: func(t *testing.T, er *multipartestutils.TestEventResponse) {
				require.Equal(t, `plaid().vars(vars).emit("NotifyTodosChanged")`, er.RunScript)
			},
		},
		{
			Name: "reload TodoApp0",
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/").
					EventFunc("__dispatch_stateful_action__").
					AddField("__action__", `
{
	"compo_type": "*examples.TodoApp",
	"compo": {
		"id": "TodoApp0",
		"visibility": "active"
	},
	"injector": "top",
	"sync_query": true,
	"method": "OnReload",
	"request": {}
}`,
					).BuildEventFuncRequest()
			},
			ExpectPortalUpdate0NotContains: []string{"123"},
		},
	}

	for _, c := range cases {
		t.Run(c.Name, func(t *testing.T) {
			multipartestutils.RunCase(t, c, examples.TodoMVCExamplePB)
		})
	}
}
