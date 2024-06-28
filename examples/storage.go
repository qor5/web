package examples

import (
	"errors"
	"fmt"
	"sync"

	"github.com/qor5/web/v3/stateful"
)

var ErrRecordNotFound = errors.New("record not found")

type Storage interface {
	List() ([]*Todo, error)
	Create(todo *Todo) error
	Read(id string) (*Todo, error)
	Update(todo *Todo) error
	Delete(id string) error
}

type MemoryStorage struct {
	mu    sync.RWMutex
	todos []*Todo
}

func (m *MemoryStorage) List() ([]*Todo, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return stateful.MustClone(m.todos), nil
}

func (m *MemoryStorage) Create(todo *Todo) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	todo.ID = fmt.Sprint(len(m.todos))
	m.todos = append(m.todos, todo)
	return nil
}

func (m *MemoryStorage) Read(id string) (*Todo, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, todo := range m.todos {
		if todo.ID == id {
			return stateful.MustClone(todo), nil
		}
	}
	return nil, ErrRecordNotFound
}

func (m *MemoryStorage) Update(todo *Todo) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i, t := range m.todos {
		if t.ID == todo.ID {
			m.todos[i] = todo
			return nil
		}
	}
	return nil
}

func (m *MemoryStorage) Delete(id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i, todo := range m.todos {
		if todo.ID == id {
			m.todos = append(m.todos[:i], m.todos[i+1:]...)
			return nil
		}
	}
	return nil
}
