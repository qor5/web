package stateful

import (
	"errors"
	"fmt"
	"net/url"
	"reflect"
	"sort"
	"strings"
	"sync"

	"github.com/samber/lo"
	"github.com/sunfmin/reflectutils"
	"golang.org/x/sync/singleflight"
)

type QueryTag struct {
	Name      string `json:"name"`
	JsonName  string `json:"json_name"`
	Omitempty bool   `json:"omitempty"`

	Method string   `json:"method,omitempty"`
	Args   []string `json:"args,omitempty"`

	Cookie bool `json:"cookie,omitempty"`

	path string
}

type QueryTags []QueryTag

const (
	tagQuery = "query"
	tagJson  = "json"
)

func unwrapPtrType(rt reflect.Type) reflect.Type {
	for rt.Kind() == reflect.Ptr {
		rt = rt.Elem()
	}
	return rt
}

func collectQueryTags(rt reflect.Type, tags *QueryTags) error {
	rt = unwrapPtrType(rt)
	if rt.Kind() != reflect.Struct {
		return fmt.Errorf("%q expected struct, got %v", rt.String(), rt.Kind())
	}

	for i := 0; i < rt.NumField(); i++ {
		structField := rt.Field(i)

		embedded := structField.Anonymous
		if embedded {
			jsonTag, ok := structField.Tag.Lookup(tagJson)
			if ok {
				name := strings.Split(jsonTag, ",")[0]
				if name != "-" && name != "" {
					embedded = false
				}
			}
		}
		if embedded {
			if _, ok := structField.Tag.Lookup(tagQuery); ok {
				return fmt.Errorf("%q embedded field %q has query tag", rt.String(), structField.Name)
			}

			rtStructField := unwrapPtrType(structField.Type)
			if rtStructField.Kind() == reflect.Struct {
				if err := collectQueryTags(rtStructField, tags); err != nil {
					return err
				}
			}
			continue
		}

		queryTag, ok := structField.Tag.Lookup(tagQuery)
		if !ok || queryTag == "-" {
			continue
		}

		if !structField.IsExported() {
			return fmt.Errorf("%q field %q is not exported", rt.String(), structField.Name)
		}

		tag := QueryTag{
			path: structField.Name,
		}

		semicolons := strings.Split(queryTag, ";")
		for i := 0; i < len(semicolons); i++ {
			if i == 0 {
				vs := strings.Split(semicolons[0], ",")
				tag.Name = vs[0]
				if len(vs) > 1 && vs[1] == "omitempty" {
					tag.Omitempty = true
				}
				continue
			}
			colons := strings.Split(semicolons[i], ":")
			switch colons[0] {
			case "method":
				if len(colons) != 2 {
					return fmt.Errorf("%q field %q query tag method is invalid", rt.String(), structField.Name)
				}
				vs := strings.Split(colons[1], ",")
				vs[0] = strings.TrimSpace(vs[0])
				if vs[0] == "" {
					return fmt.Errorf("%q field %q query tag method name is empty", rt.String(), structField.Name)
				}
				tag.Method = vs[0]
				if len(vs) > 1 {
					tag.Args = vs[1:]
				}
			case "cookie":
				tag.Cookie = true
			}
		}

		jsonName := structField.Name
		jsonTag, ok := structField.Tag.Lookup(tagJson)
		if ok {
			jsonName = strings.Split(jsonTag, ",")[0]
			if jsonName == "-" {
				return fmt.Errorf("%q field %q is ignored by json", rt.String(), structField.Name)
			}
			if jsonName == "" {
				jsonName = structField.Name
			}
		}
		tag.JsonName = jsonName
		if tag.Name == "" {
			tag.Name = tag.JsonName
		}

		_, index, exists := lo.FindIndexOf(*tags, func(v QueryTag) bool { return v.JsonName == jsonName })
		if exists {
			(*tags)[index] = tag
			continue
		}
		*tags = append(*tags, tag)
	}
	return nil
}

var (
	collectedQueryTags  sync.Map
	collectQueryTagsSfg singleflight.Group
)

func parseQueryTags(rt reflect.Type) (QueryTags, error) {
	v, ok := collectedQueryTags.Load(rt)
	if ok && v != nil {
		return v.(QueryTags), nil
	}
	rtUnique := rt.PkgPath() + "." + rt.Name()
	v, err, _ := collectQueryTagsSfg.Do(rtUnique, func() (interface{}, error) {
		v, ok := collectedQueryTags.Load(rt)
		if ok && v != nil {
			return v, nil
		}
		tags := QueryTags{}
		if err := collectQueryTags(rt, &tags); err != nil {
			return nil, err
		}
		collectedQueryTags.Store(rt, tags)
		return tags, nil
	})
	if err != nil {
		return nil, err
	}
	return v.(QueryTags), nil
}

func ParseQueryTags(v any) (QueryTags, error) {
	rv := reflect.ValueOf(v)
	for rv.Kind() == reflect.Ptr || rv.Kind() == reflect.Interface {
		rv = rv.Elem()
	}
	rt := rv.Type()
	return parseQueryTags(rt)
}

func (tags QueryTags) CookieTags() QueryTags {
	return QueryTags(lo.Filter(tags, func(tag QueryTag, _ int) bool { return tag.Cookie }))
}

func decodeToStruct(rt reflect.Type, descWithoutUnescape string) (any, error) {
	var err error

	fields := strings.Split(descWithoutUnescape, "_")
	for i := range fields {
		fields[i], err = url.QueryUnescape(fields[i])
		if err != nil {
			return nil, err
		}
	}
	jsonTags, err := parseJsonTags(rt)
	if err != nil {
		return nil, err
	}
	ptr := reflect.New(rt).Interface()
	jsonKeys := lo.Keys(jsonTags)
	sort.Strings(jsonKeys)
	for i, field := range fields {
		if i >= len(jsonKeys) {
			break
		}
		path := jsonTags[jsonKeys[i]]
		if err := reflectutils.Set(ptr, path, field); err != nil {
			return nil, fmt.Errorf("failed to set %q to %v: %w", path, ptr, err)
		}
	}
	return reflect.ValueOf(ptr).Elem().Interface(), nil
}

func (tags QueryTags) Decode(rawQuery string, dest any) (rerr error) {
	rv := reflect.ValueOf(dest)
	if rv.Kind() != reflect.Ptr {
		return errors.New("decode dest must be a pointer")
	}

	defer func() {
		if r := recover(); r != nil {
			err, ok := r.(error)
			if !ok {
				err = fmt.Errorf("%v", r)
			}
			rerr = fmt.Errorf("panic: %w", err)
		}
	}()

	qs := make(url.Values)
	err := parseQuery(qs, rawQuery, url.QueryUnescape, func(s string) (string, error) {
		return s, nil
	})
	if err != nil {
		return err
	}

	for _, tag := range tags {
		if tag.Method != "" {
			method, ok := QueryTagMethodsMap[tag.Method]
			if !ok {
				return fmt.Errorf("query tag method %q not found", tag.Method)
			}
			if err := method.Decoder(qs, tag, dest); err != nil {
				return fmt.Errorf("failed to decode %q: %w", tag.Name, err)
			}
			continue
		}

		qvs, ok := qs[tag.Name]
		if !ok || len(qvs) == 0 {
			continue
		}
		qv := qvs[len(qvs)-1]
		if qv == "" {
			// set zero value if empty?
			if err := reflectutils.Set(dest, tag.path, qv); err != nil {
				return fmt.Errorf("failed to set %q to %v: %w", tag.path, dest, err)
			}
			continue
		}

		rt := reflectutils.GetType(dest, tag.path)
		switch unwrapPtrType(rt).Kind() {
		case reflect.Array, reflect.Slice:
			elements := strings.Split(qv, ",")

			rtElem := rt.Elem()
			switch unwrapPtrType(rtElem).Kind() {
			case reflect.Struct:
				for i, element := range elements {
					elem, err := decodeToStruct(rtElem, element)
					if err != nil {
						return err
					}

					path := fmt.Sprintf("%s[%d]", tag.path, i)
					if err := reflectutils.Set(dest, path, elem); err != nil {
						return fmt.Errorf("failed to set %q to %v: %w", path, dest, err)
					}
				}
			default:
				for i, element := range elements {
					unescape, err := url.QueryUnescape(element)
					if err != nil {
						return fmt.Errorf("failed to unescape %q: %w", element, err)
					}
					path := fmt.Sprintf("%s[%d]", tag.path, i)
					if err := reflectutils.Set(dest, path, unescape); err != nil {
						return fmt.Errorf("failed to set %q to %v: %w", path, dest, err)
					}
				}
			}
		case reflect.Struct:
			obj, err := decodeToStruct(rt, qv)
			if err != nil {
				return err
			}
			if err := reflectutils.Set(dest, tag.path, obj); err != nil {
				return fmt.Errorf("failed to set %q to %v: %w", tag.path, dest, err)
			}
		default:
			unescape, err := url.QueryUnescape(qv)
			if err != nil {
				return fmt.Errorf("failed to unescape %q: %w", qv, err)
			}
			if err := reflectutils.Set(dest, tag.path, unescape); err != nil {
				return fmt.Errorf("failed to set %q to %v: %w", tag.path, dest, err)
			}
		}
	}

	return nil
}

func parseQuery(m url.Values, query string,
	keyUnescape func(s string) (string, error),
	valUnescape func(s string) (string, error),
) (err error) {
	for query != "" {
		var key string
		key, query, _ = strings.Cut(query, "&")
		if strings.Contains(key, ";") {
			err = fmt.Errorf("invalid semicolon separator in query")
			continue
		}
		if key == "" {
			continue
		}
		key, value, _ := strings.Cut(key, "=")
		key, err1 := keyUnescape(key)
		if err1 != nil {
			if err == nil {
				err = err1
			}
			continue
		}
		value, err1 = valUnescape(value)
		if err1 != nil {
			if err == nil {
				err = err1
			}
			continue
		}
		m[key] = append(m[key], value)
	}
	return err
}

var (
	collectedJsonTags    sync.Map
	collectedJsonTagsSfg singleflight.Group
)

func parseJsonTags(rt reflect.Type) (map[string]string, error) {
	v, ok := collectedJsonTags.Load(rt)
	if ok && v != nil {
		return v.(map[string]string), nil
	}
	rtUnique := rt.PkgPath() + "." + rt.Name()
	v, err, _ := collectedJsonTagsSfg.Do(rtUnique, func() (interface{}, error) {
		v, ok := collectedJsonTags.Load(rt)
		if ok && v != nil {
			return v, nil
		}
		tags := map[string]string{}
		if err := collectJsonTags(rt, tags); err != nil {
			return nil, err
		}
		collectedJsonTags.Store(rt, tags)
		return tags, nil
	})
	if err != nil {
		return nil, err
	}
	return v.(map[string]string), nil
}

// tags: jsonName => path
func collectJsonTags(rt reflect.Type, tags map[string]string) error {
	rt = unwrapPtrType(rt)
	if rt.Kind() != reflect.Struct {
		return fmt.Errorf("%q expected struct, got %v", rt.String(), rt.Kind())
	}

	for i := 0; i < rt.NumField(); i++ {
		structField := rt.Field(i)

		embedded := structField.Anonymous
		if embedded {
			jsonTag, ok := structField.Tag.Lookup(tagJson)
			if ok {
				name := strings.Split(jsonTag, ",")[0]
				if name != "-" && name != "" {
					embedded = false
				}
			}
		}
		if embedded {
			rtStructField := unwrapPtrType(structField.Type)
			if rtStructField.Kind() == reflect.Struct {
				if err := collectJsonTags(rtStructField, tags); err != nil {
					return err
				}
			}
			continue
		}

		if !structField.IsExported() {
			return fmt.Errorf("%q field %q is not exported", rt.String(), structField.Name)
		}

		name := structField.Name
		jsonTag, ok := structField.Tag.Lookup(tagJson)
		if ok {
			name = strings.Split(jsonTag, ",")[0]
			if name == "-" {
				return fmt.Errorf("%q field %q is ignored by json", rt.String(), structField.Name)
			}
			if name == "" {
				name = structField.Name
			}
		}
		// TODO: It's not quite right here, there's no guarantee that the outer layer has a higher priority, the embedded one has a lower priority
		tags[name] = structField.Name
	}
	return nil
}

// IsQuerySubset checks if all key-value pairs in sub are contained within sup, considering comma-separated.
func IsQuerySubset(sup, sub url.Values) bool {
	for key, subValues := range sub {
		if len(subValues) == 0 {
			continue
		}
		supValues, found := sup[key]
		if !found || len(supValues) == 0 {
			return false
		}

		supValues = strings.Split(supValues[len(supValues)-1], ",")
		subValues = strings.Split(subValues[len(subValues)-1], ",")

		supCount := make(map[string]int)
		for _, value := range supValues {
			supCount[value]++
		}

		for _, value := range subValues {
			if supCount[value] == 0 {
				return false
			}
			supCount[value]--
		}
	}
	return true
}

// IsRawQuerySubset checks if all key-value pairs in the sub query string are contained within the sup query string.
func IsRawQuerySubset(sup, sub string) bool {
	supValues, err := url.ParseQuery(sup)
	if err != nil {
		return false
	}

	subValues, err := url.ParseQuery(sub)
	if err != nil {
		return false
	}

	return IsQuerySubset(supValues, subValues)
}

type QueryTagMethod struct {
	Name    string                                         `json:"name"`
	Encoder string                                         `json:"encoder"` // js
	Decoder func(qs url.Values, tag QueryTag, v any) error `json:"-"`       // go
}

// tag example: `query:";method=bare,f_"`
// arg0: the prefix of the query key
var QueryTagMethodBare = &QueryTagMethod{
	Name: "bare",
	Encoder: `({ value, queries, tag }) => {
		if (value) {
			value.split('&').forEach((query) => {
				queries.push(query)
			})
		}
	}`,
	Decoder: func(qs url.Values, tag QueryTag, v any) error {
		if len(tag.Args) < 1 {
			return fmt.Errorf("bare query tag method requires at least one argument")
		}
		bareQuery := make(url.Values)
		prefix := tag.Args[0]
		for k, vs := range qs {
			if strings.HasPrefix(k, prefix) {
				for _, v := range vs {
					unescaped, err := url.QueryUnescape(v)
					if err != nil {
						return fmt.Errorf("failed to unescape %q: %w", v, err)
					}
					bareQuery.Add(k, unescaped)
				}
			}
		}
		reflectutils.Set(v, tag.path, bareQuery.Encode())
		return nil
	},
}

var QueryTagMethods = []*QueryTagMethod{
	QueryTagMethodBare,
}

var QueryTagMethodsMap = func() map[string]*QueryTagMethod {
	m := map[string]*QueryTagMethod{}
	for _, v := range QueryTagMethods {
		if _, ok := m[v.Name]; ok {
			panic(fmt.Sprintf("duplicate query tag method %q", v.Name))
		}
		m[v.Name] = v
	}
	return m
}()
