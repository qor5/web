package todomvc_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/qor5/web/v3/multipartestutils"
	"github.com/qor5/web/v3/stateful/example/todomvc"
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
			Name: "add todo",
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/").
					EventFunc("__dispatch_actionable_action__").
					AddField("__action__", `
{
	"actionable_type": "*todomvc.TodoApp",
	"actionable": {
		"id": "TodoApp0",
		"visibility": "all"
	},
	"injector": "top",
	"sync_query": true,
	"method": "CreateTodo",
	"request": {
		"title": "123"
	}
}`).BuildEventFuncRequest()
			},
			EventResponseMatch: func(t *testing.T, er *multipartestutils.TestEventResponse) {
				require.Equal(t, `vars.__sendNotification("NotifTodosChanged", null)`, er.RunScript)
			},
		},
		{
			Name: "reload TodoApp1",
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/").
					EventFunc("__dispatch_actionable_action__").
					AddField("__action__", `
{
	"actionable_type": "*todomvc.TodoApp",
	"actionable": {
		"id": "TodoApp1",
		"visibility": "completed"
	},
	"injector": "top/sub",
	"sync_query": false,
	"method": "OnReload",
	"request": {}
}`).BuildEventFuncRequest()
			},
			ExpectPortalUpdate0NotContains: []string{"123"},
		},
		{
			Name: "reload TodoApp1 to active",
			ReqFunc: func() *http.Request {
				return multipartestutils.NewMultipartBuilder().
					PageURL("/").
					EventFunc("__dispatch_actionable_action__").
					AddField("__action__", `
{
	"actionable_type": "*todomvc.TodoApp",
	"actionable": {
		"id": "TodoApp1",
		"visibility": "active"
	},
	"injector": "top/sub",
	"sync_query": false,
	"method": "OnReload",
	"request": {}
}`).BuildEventFuncRequest()
			},
			ExpectPortalUpdate0ContainsInOrder: []string{"123"},
		},
	}

	for _, c := range cases {
		multipartestutils.RunCase(t, c, todomvc.TodoMVCExamplePB)
	}
}
