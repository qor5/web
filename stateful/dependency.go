package stateful

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"sync"

	h "github.com/theplant/htmlgo"
	"github.com/theplant/inject"
)

var ErrInjectorNotFound = errors.New("injector not found")

// just to make it easier to get the name of the currently applied injector
type InjectorName string

type DependencyCenter struct {
	mu        sync.RWMutex
	injectors map[string]*inject.Injector
}

func NewDependencyCenter() *DependencyCenter {
	return &DependencyCenter{
		injectors: map[string]*inject.Injector{},
	}
}

type registerInjectorOptions struct {
	parent string
}

type RegisterInjectorOption func(*registerInjectorOptions)

func WithParent(parent string) RegisterInjectorOption {
	return func(o *registerInjectorOptions) {
		o.parent = parent
	}
}

func (dc *DependencyCenter) RegisterInjector(name string, opts ...RegisterInjectorOption) {
	o := new(registerInjectorOptions)
	for _, opt := range opts {
		opt(o)
	}

	name = strings.TrimSpace(name)
	parent := strings.TrimSpace(o.parent)
	if name == "" {
		panic(fmt.Errorf("name is required"))
	}

	dc.mu.Lock()
	defer dc.mu.Unlock()

	if _, ok := dc.injectors[name]; ok {
		panic(fmt.Errorf("injector %q already exists", name))
	}

	var parentInjector *inject.Injector
	if parent != "" {
		var ok bool
		parentInjector, ok = dc.injectors[parent]
		if !ok {
			panic(fmt.Errorf("parent injector %q not found", parent))
		}
	}

	inj := inject.New()
	inj.Provide(func() InjectorName { return InjectorName(name) })
	inj.Provide(func() *DependencyCenter { return dc })
	if parentInjector != nil {
		inj.SetParent(parentInjector)
	}
	dc.injectors[name] = inj
}

func (dc *DependencyCenter) Injector(name string) (*inject.Injector, error) {
	dc.mu.RLock()
	defer dc.mu.RUnlock()
	inj, ok := dc.injectors[name]
	if !ok {
		return nil, fmt.Errorf("%s: %w", name, ErrInjectorNotFound)
	}
	return inj, nil
}

func (dc *DependencyCenter) Provide(name string, fs ...any) error {
	inj, err := dc.Injector(name)
	if err != nil {
		return err
	}
	return inj.Provide(fs...)
}

func (dc *DependencyCenter) MustProvide(name string, fs ...any) {
	err := dc.Provide(name, fs...)
	if err != nil {
		panic(err)
	}
}

func (dc *DependencyCenter) Inject(injectorName string, c h.HTMLComponent) (h.HTMLComponent, error) {
	inj, err := dc.Injector(injectorName)
	if err != nil {
		return nil, err
	}
	if err := inj.Apply(Unwrap(c)); err != nil {
		return nil, err
	}
	return h.ComponentFunc(func(ctx context.Context) ([]byte, error) {
		ctx = withInjectorName(ctx, injectorName)
		return c.MarshalHTML(ctx)
	}), nil
}

func (dc *DependencyCenter) MustInject(injectorName string, c h.HTMLComponent) h.HTMLComponent {
	c, err := dc.Inject(injectorName, c)
	if err != nil {
		panic(err)
	}
	return c
}

func (dc *DependencyCenter) Apply(ctx context.Context, target h.HTMLComponent) error {
	name := injectorNameFromContext(ctx)
	if name == "" {
		return nil
	}
	inj, err := dc.Injector(name)
	if err != nil {
		return err
	}
	return inj.Apply(Unwrap(target))
}

func (dc *DependencyCenter) MustApply(ctx context.Context, target h.HTMLComponent) h.HTMLComponent {
	err := dc.Apply(ctx, target)
	if err != nil {
		panic(err)
	}
	return target
}

type injectorNameCtxKey struct{}

func withInjectorName(ctx context.Context, name string) context.Context {
	return context.WithValue(ctx, injectorNameCtxKey{}, name)
}

func injectorNameFromContext(ctx context.Context) string {
	name, _ := ctx.Value(injectorNameCtxKey{}).(string)
	return name
}
