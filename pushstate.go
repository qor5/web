package web

import (
	"encoding/json"
	"net/url"
)

func PushState(query url.Values) (r *PushStateBuilder) {
	r = &PushStateBuilder{
		MyQuery: make(map[string]json.Marshaler),
	}
	r.Query(query)
	return
}

func (b *PushStateBuilder) URL(url string) (r *PushStateBuilder) {
	b.MyURL = url
	return b
}

func (b *PushStateBuilder) MergeQuery(v bool) (r *PushStateBuilder) {
	b.MyMergeQuery = v
	return b
}

func (b *PushStateBuilder) MergeWithAppend(key string, values []string) (r *PushStateBuilder) {
	b.MergeQuery(true)
	b.MyQuery[key] = valueOp{
		Values: values,
		Add:    true,
	}
	return b
}

func (b *PushStateBuilder) MergeWithRemove(key string, values []string) (r *PushStateBuilder) {
	b.MergeQuery(true)
	b.MyQuery[key] = valueOp{
		Values: values,
		Remove: true,
	}
	return b
}
func (b *PushStateBuilder) Query(query url.Values) (r *PushStateBuilder) {
	for k, vs := range query {
		b.PutQuery(k, vs)
	}
	return b
}

func (b *PushStateBuilder) PutQuery(key string, values []string) (r *PushStateBuilder) {
	b.MyQuery[key] = valuesMarshaller(values)
	return b
}

type valuesMarshaller []string

func (vm valuesMarshaller) MarshalJSON() ([]byte, error) {
	return json.Marshal([]string(vm))
}

type PushStateBuilder struct {
	MyMergeQuery bool                      `json:"mergeQuery,omitempty"`
	MyURL        string                    `json:"url,omitempty"`
	MyQuery      map[string]json.Marshaler `json:"query,omitempty"`
}

type valueOp struct {
	Values []string `json:"values,omitempty"`
	Add    bool     `json:"add,omitempty"`
	Remove bool     `json:"remove,omitempty"`
}

func (vm valueOp) MarshalJSON() ([]byte, error) {
	return json.Marshal(vm)
}
