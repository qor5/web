package examples

import (
	"context"
	"fmt"
	"strings"

	"github.com/qor5/web/v3"
	"github.com/qor5/web/v3/stateful"
	. "github.com/theplant/htmlgo"
)

const NotifyTodosChanged = "NotifyTodosChanged"

type Visibility string

const (
	VisibilityAll       Visibility = "all"
	VisibilityActive    Visibility = "active"
	VisibilityCompleted Visibility = "completed"
)

type Todo struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	Completed bool   `json:"completed"`
}

type TodoApp struct {
	dep *TodoAppDep `inject:""`

	ID         string     `json:"id"`
	Visibility Visibility `json:"visibility" query:";cookie"`
}

func (c *TodoApp) CompoID() string {
	return fmt.Sprintf("TodoApp:%s", c.ID)
}

func (c *TodoApp) MarshalHTML(ctx context.Context) ([]byte, error) {
	todos, err := c.dep.db.List()
	if err != nil {
		return nil, err
	}

	filteredTodos := c.filteredTodos(todos)
	remaining := len(filterTodos(todos, func(todo *Todo) bool { return !todo.Completed }))

	filteredTodoItems := make([]HTMLComponent, len(filteredTodos))
	for i, todo := range filteredTodos {
		filteredTodoItems[i] = c.dep.dc.MustApply(ctx, &TodoItem{
			ID:   todo.ID,
			todo: todo,
		})
	}

	checkBoxID := fmt.Sprintf("%s-toggle-all", c.ID)
	return stateful.Actionable(ctx, c,
		web.Listen(NotifyTodosChanged, stateful.ReloadAction(ctx, c, nil).Go()),
		Section().Class("todoapp").Children(
			Header().Class("header").Children(
				H1("Todos"),
				Input("").
					Attr("v-on-mounted", "({el}) => el.focus()").
					Class("new-todo").
					Attr("id", fmt.Sprintf("%s-creator", c.ID)).
					Attr("placeholder", "What needs to be done?").
					Attr("@keyup.enter", stateful.PostAction(ctx,
						c,
						c.CreateTodo, &CreateTodoRequest{},
						stateful.WithAppendFix(`v.request.title = $event.target.value`),
					).Go()),
			),
			Section().Class("main").Attr("v-show", JSONString(len(todos) > 0)).Children(
				Input("").Type("checkbox").Attr("id", checkBoxID).Class("toggle-all").
					Attr("checked", remaining == 0).
					Attr("@change", stateful.PostAction(ctx, c, c.ToggleAll, nil).Go()),
				Label("Mark all as complete").Attr("for", checkBoxID),
				Ul().Class("todo-list").Children(filteredTodoItems...),
			),
			Footer().Class("footer").Attr("v-show", JSONString(len(todos) > 0)).Children(
				Span("").Class("todo-count").Children(
					Strong(fmt.Sprintf("%d", remaining)),
					Text(fmt.Sprintf(" %s left", pluralize(remaining, "item", "items"))),
				),
				Ul().Class("filters").Children(
					Li(
						A(Text("All")).ClassIf("selected", c.Visibility == VisibilityAll).
							Attr("@click", stateful.ReloadAction(ctx, c,
								func(target *TodoApp) {
									target.Visibility = VisibilityAll
								},
								stateful.WithUseProvidedCompo(), // test use provided compo
							).Go()),
					),
					Li(
						A(Text("Active")).ClassIf("selected", c.Visibility == VisibilityActive).
							Attr("@click", stateful.ReloadAction(ctx, c, func(target *TodoApp) {
								target.Visibility = VisibilityActive
							}).Go()),
					),
					Li(
						A(Text("Completed")).ClassIf("selected", c.Visibility == VisibilityCompleted).
							Attr("@click", stateful.ReloadAction(ctx, c, func(target *TodoApp) {
								target.Visibility = VisibilityCompleted
							}).Go()),
					),
				),
			),
		),
	).MarshalHTML(ctx)
}

func filterTodos(todos []*Todo, predicate func(*Todo) bool) []*Todo {
	var result []*Todo
	for _, todo := range todos {
		if predicate(todo) {
			result = append(result, todo)
		}
	}
	return result
}

func pluralize(count int, singular, plural string) string {
	if count == 1 {
		return singular
	}
	return plural
}

func (c *TodoApp) filteredTodos(todos []*Todo) []*Todo {
	switch c.Visibility {
	case VisibilityActive:
		return filterTodos(todos, func(todo *Todo) bool { return !todo.Completed })
	case VisibilityCompleted:
		return filterTodos(todos, func(todo *Todo) bool { return todo.Completed })
	default:
		return todos
	}
}

func (c *TodoApp) ToggleAll(ctx context.Context) (r web.EventResponse, err error) {
	todos, err := c.dep.db.List()
	if err != nil {
		return r, err
	}

	allCompleted := true
	for _, todo := range todos {
		if !todo.Completed {
			allCompleted = false
			break
		}
	}
	for _, todo := range todos {
		todo.Completed = !allCompleted
		if err := c.dep.db.Update(todo); err != nil {
			return r, err
		}
	}
	r.Emit(NotifyTodosChanged)
	return
}

type CreateTodoRequest struct {
	Title string `json:"title"`
}

func (c *TodoApp) CreateTodo(ctx context.Context, req *CreateTodoRequest) (r web.EventResponse, err error) {
	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" {
		r.RunScript = "alert('title can not be empty')"
		return
	}

	if err := c.dep.db.Create(&Todo{
		Title:     req.Title,
		Completed: false,
	}); err != nil {
		return r, err
	}
	r.Emit(NotifyTodosChanged)
	return
}

type TodoItem struct {
	db  Storage     `inject:""` // try inject db directly
	dep *TodoAppDep `inject:""`

	ID   string `json:"id"`
	todo *Todo  // use this if not nil, otherwise load with ID from Storage
}

func (c *TodoItem) MarshalHTML(ctx context.Context) ([]byte, error) {
	todo := c.todo
	if todo == nil {
		var err error
		todo, err = c.db.Read(c.ID)
		if err != nil {
			return nil, err
		}
	}

	var itemTitleCompo HTMLComponent
	if c.dep.itemTitleCompo != nil {
		itemTitleCompo = c.dep.itemTitleCompo(todo)
	} else {
		itemTitleCompo = Label(todo.Title)
	}
	return stateful.Actionable(ctx, c,
		Li().ClassIf("completed", todo.Completed).Children(
			Div().Class("view").Children(
				Input("").Type("checkbox").Class("toggle").Attr("checked", todo.Completed).
					// test use provided compo
					Attr("@change", stateful.PostAction(ctx, c, c.Toggle, nil, stateful.WithUseProvidedCompo()).Go()),
				itemTitleCompo,
				Button("").Class("destroy").
					Attr("@click", stateful.PostAction(ctx, c, c.Remove, nil).Go()),
			),
		),
	).MarshalHTML(ctx)
}

func (c *TodoItem) Toggle(ctx context.Context) (r web.EventResponse, err error) {
	todo, err := c.db.Read(c.ID)
	if err != nil {
		return r, err
	}

	todo.Completed = !todo.Completed
	if err := c.db.Update(todo); err != nil {
		return r, err
	}

	r.Emit(NotifyTodosChanged)
	return
}

func (c *TodoItem) Remove(ctx context.Context) (r web.EventResponse, err error) {
	if err := c.db.Delete(c.ID); err != nil {
		return r, err
	}

	r.Emit(NotifyTodosChanged)
	return
}

type TodoAppDep struct {
	dc             *stateful.DependencyCenter `inject:""`
	db             Storage
	itemTitleCompo func(todo *Todo) HTMLComponent
}

var (
	dc                 = stateful.NewDependencyCenter()
	TodoMVCExamplePB   = web.Page(TodoMVCExample)
	TodoMVCExamplePath = URLPathByFunc(TodoMVCExample)

	InjectorTop = "top"
	InjectorSub = "top/sub"
)

func init() {
	stateful.RegisterActionableCompoType(
		(*TodoApp)(nil),
		(*TodoItem)(nil),
	)

	stateful.Install(TodoMVCExamplePB, dc)

	dc.RegisterInjector(InjectorTop)
	dc.RegisterInjector(InjectorSub, stateful.WithParent(InjectorTop))
	dc.MustProvide(InjectorTop,
		func() Storage {
			return &MemoryStorage{}
		},
		func(db Storage) *TodoAppDep {
			return &TodoAppDep{
				db:             db,
				itemTitleCompo: nil,
			}
		},
	)
	dc.MustProvide(InjectorSub, func(db Storage) *TodoAppDep {
		return &TodoAppDep{
			db: db,
			itemTitleCompo: func(todo *Todo) HTMLComponent {
				if todo.Completed {
					return Label(todo.Title).Style("color: red;")
				}
				return Label(todo.Title).Style("color: green;")
			},
		}
	})
}

func TodoMVCExample(ctx *web.EventContext) (r web.PageResponse, err error) {
	r.Body = Div().Style("display: flex; justify-content: center;").Children(
		Div().Style("width: 550px; margin-right: 40px;").Children(
			dc.MustInject(InjectorTop, stateful.SyncQuery(&TodoApp{
				ID:         "TodoApp0",
				Visibility: VisibilityAll,
			})),
		),
		Div().Style("width: 550px;").Children(
			dc.MustInject(InjectorSub, &TodoApp{
				ID:         "TodoApp1",
				Visibility: VisibilityCompleted,
			}),
		),
	)
	ctx.Injector.HeadHTML(`
	<link rel="stylesheet" type="text/css" href="https://unpkg.com/todomvc-app-css@2.4.1/index.css">
	<style>
		body{
			max-width: 100%;
		}
	</style>
	`)
	return
}
