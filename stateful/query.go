package stateful

import (
	"fmt"
	"net/url"
	"reflect"
	"sort"
	"strings"

	"github.com/samber/lo"
	"github.com/sunfmin/reflectutils"
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

func ParseQueryTags(v any) (QueryTags, error) {
	rv := reflect.ValueOf(v)
	for rv.Kind() == reflect.Ptr || rv.Kind() == reflect.Interface {
		rv = rv.Elem()
	}

	// TODO: A simple caching mechanism is required
	rt := rv.Type()

	var tags QueryTags
	if err := collectQueryTags(rt, &tags); err != nil {
		return nil, err
	}
	return tags, nil
}

// TODO: Does rt need to be a non-pointer?
func newStructObject(rt reflect.Type, desc string) (any, error) {
	var err error

	fields := strings.Split(desc, "_")
	for i := range fields {
		fields[i], err = url.QueryUnescape(fields[i])
		if err != nil {
			return nil, err
		}
	}
	// TODO: A caching mechanism is needed here
	jsonTags := map[string]string{}
	if err := collectJsonTags(rt, jsonTags); err != nil {
		return nil, err
	}
	elem := reflect.New(rt).Interface()
	jsonKeys := lo.Keys(jsonTags)
	sort.Strings(jsonKeys)
	for i, field := range fields {
		if i >= len(jsonKeys) {
			break
		}
		path := jsonTags[jsonKeys[i]]
		if err := reflectutils.Set(elem, path, field); err != nil {
			return nil, fmt.Errorf("failed to set %q to %v: %w", path, elem, err)
		}
	}
	return elem, nil
}

// TODO: Currently it can only accept pointer information, the internal logic needs to be optimized properly
func (tags QueryTags) Decode(rawQuery string, v any) (rerr error) {
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
			if err := method.Decoder(qs, tag, v); err != nil {
				return fmt.Errorf("failed to decode %q: %w", tag.Name, err)
			}
			continue
		}

		qvs, ok := qs[tag.Name]
		if !ok {
			continue
		}
		qv := qvs[0]
		// TODO: should set zero value if empty?
		if qv == "" {
			continue
		}

		rt := reflectutils.GetType(v, tag.path)
		switch unwrapPtrType(rt).Kind() {
		case reflect.Array, reflect.Slice:
			elements := strings.Split(qv, ",")

			rtElem := rt.Elem()
			switch unwrapPtrType(rtElem).Kind() {
			case reflect.Struct:
				for i, element := range elements {
					elem, err := newStructObject(rtElem, element)
					if err != nil {
						return err
					}

					path := fmt.Sprintf("%s[%d]", tag.path, i)
					if err := reflectutils.Set(v, path, elem); err != nil {
						return fmt.Errorf("failed to set %q to %v: %w", path, v, err)
					}
				}
			default:
				for i, element := range elements {
					unescape, err := url.QueryUnescape(element)
					if err != nil {
						return fmt.Errorf("failed to unescape %q: %w", element, err)
					}
					path := fmt.Sprintf("%s[%d]", tag.path, i)
					if err := reflectutils.Set(v, path, unescape); err != nil {
						return fmt.Errorf("failed to set %q to %v: %w", path, v, err)
					}
				}
			}
		case reflect.Struct:
			obj, err := newStructObject(rt, qv)
			if err != nil {
				return err
			}
			if err := reflectutils.Set(v, tag.path, obj); err != nil {
				return fmt.Errorf("failed to set %q to %v: %w", tag.path, v, err)
			}
		default:
			if err := reflectutils.Set(v, tag.path, qv); err != nil {
				return fmt.Errorf("failed to set %q to %v: %w", tag.path, v, err)
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

// TODO: Can this logic be reused with collectQueryTags?
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
