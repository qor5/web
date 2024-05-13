package web

import (
	"encoding/json"
	"net/url"
)

func Location(query url.Values) (r *LocationBuilder) {
	r = &LocationBuilder{
		MyQuery: make(map[string]json.Marshaler),
	}
	r.Query(query)
	return
}

func (b *LocationBuilder) URL(url string) (r *LocationBuilder) {
	b.MyURL = url
	return b
}

func (b *LocationBuilder) MergeQuery(v bool) (r *LocationBuilder) {
	b.MyMergeQuery = v
	return b
}

func (b *LocationBuilder) MergeWithAppend(key string, values []string) (r *LocationBuilder) {
	b.MergeQuery(true)
	b.MyQuery[key] = valueOp{
		Values: values,
		Add:    true,
	}
	return b
}

func (b *LocationBuilder) MergeWithRemove(key string, values []string) (r *LocationBuilder) {
	b.MergeQuery(true)
	b.MyQuery[key] = valueOp{
		Values: values,
		Remove: true,
	}
	return b
}

func (b *LocationBuilder) Query(query url.Values) (r *LocationBuilder) {
	for k, vs := range query {
		b.PutQuery(k, vs)
	}
	return b
}

func (b *LocationBuilder) PutQuery(key string, values []string) (r *LocationBuilder) {
	b.MyQuery[key] = valuesMarshaller(values)
	return b
}

func (b *LocationBuilder) StringQuery(v string) (r *LocationBuilder) {
	b.MyStringQuery = v
	return b
}

func (b *LocationBuilder) ClearMergeQuery(clearKeys []string) (r *LocationBuilder) {
	b.MyClearMergeQueryKeys = clearKeys
	return b
}

type valuesMarshaller []string

func (vm valuesMarshaller) MarshalJSON() ([]byte, error) {
	return json.Marshal([]string(vm))
}

// LocationBuilder mapping to type.ts Location interface
type LocationBuilder struct {
	MyMergeQuery          bool                      `json:"mergeQuery,omitempty"`
	MyURL                 string                    `json:"url,omitempty"`
	MyStringQuery         string                    `json:"stringQuery,omitempty"`
	MyClearMergeQueryKeys []string                  `json:"clearMergeQueryKeys,omitempty"`
	MyQuery               map[string]json.Marshaler `json:"query,omitempty"`
}

type valueOp struct {
	Values []string `json:"values,omitempty"`
	Add    bool     `json:"add,omitempty"`
	Remove bool     `json:"remove,omitempty"`
}

func (vm valueOp) MarshalJSON() ([]byte, error) {
	return json.Marshal(vm)
}
