package stateful

import (
	"fmt"
	"net/url"
	"reflect"
	"sort"
	"strings"

	"github.com/pkg/errors"
	"github.com/samber/lo"
	"github.com/sunfmin/reflectutils"
)

type QueryTag struct {
	Name     string `json:"name"`
	JsonName string `json:"json_name"`
	path     string
}

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

func collectQueryTags(rt reflect.Type, tags *[]QueryTag) error {
	rt = unwrapPtrType(rt)
	if rt.Kind() != reflect.Struct {
		return errors.Errorf("%q expected struct, got %v", rt.String(), rt.Kind())
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
				return errors.Errorf("%q embedded field %q has query tag", rt.String(), structField.Name)
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
		if !ok {
			continue
		}
		queryName := strings.Split(queryTag, ",")[0]
		if queryName == "-" {
			continue
		}

		if !structField.IsExported() {
			return errors.Errorf("%q field %q is not exported", rt.String(), structField.Name)
		}

		name := structField.Name
		jsonTag, ok := structField.Tag.Lookup(tagJson)
		if ok {
			name = strings.Split(jsonTag, ",")[0]
			if name == "-" {
				return errors.Errorf("%q field %q is ignored by json", rt.String(), structField.Name)
			}
			if name == "" {
				name = structField.Name
			}
		}

		tag := QueryTag{
			Name:     queryName,
			JsonName: name,
			path:     structField.Name,
		}
		if tag.Name == "" {
			tag.Name = tag.JsonName
		}

		_, index, exists := lo.FindIndexOf(*tags, func(v QueryTag) bool { return v.JsonName == name })
		if exists {
			(*tags)[index] = tag
			continue
		}
		*tags = append(*tags, tag)
	}
	return nil
}

func GetQueryTags(v any) ([]QueryTag, error) {
	rv := reflect.ValueOf(v)
	for rv.Kind() == reflect.Ptr || rv.Kind() == reflect.Interface {
		rv = rv.Elem()
	}

	// TODO: 需要做一个简单的缓存机制
	rt := rv.Type()

	var tags []QueryTag
	if err := collectQueryTags(rt, &tags); err != nil {
		return nil, err
	}
	return tags, nil
}

// TODO: rt 需要是非指针吗？
func newStructObject(rt reflect.Type, desc string) (any, error) {
	var err error

	fields := strings.Split(desc, "|")
	for i := range fields {
		fields[i], err = url.QueryUnescape(fields[i])
		if err != nil {
			return nil, err
		}
	}
	// TODO: 这里需要一个缓存机制
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
			return nil, errors.Wrapf(err, "failed to set %q to %v", path, elem)
		}
	}
	return elem, nil
}

// TODO: 目前只能接受指针信息，内部逻辑还需好好优化
func QueryUnmarshal(rawQuery string, v any) error {
	// TODO: 需要一个 recover 机制

	qs := make(url.Values)
	err := parseQuery(qs, rawQuery, url.QueryUnescape, func(s string) (string, error) {
		return s, nil
	})
	if err != nil {
		return err
	}

	tags, err := GetQueryTags(v)
	if err != nil {
		return errors.Wrap(err, "failed to get query tags")
	}

	for _, tag := range tags {
		qvs, ok := qs[tag.Name]
		if !ok {
			continue
		}
		qv := qvs[0]

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
						return errors.Wrapf(err, "failed to set %q to %v", path, v)
					}
				}
			default:
				for i, element := range elements {
					unescape, err := url.QueryUnescape(element)
					if err != nil {
						return errors.Wrapf(err, "failed to unescape %q", element)
					}
					path := fmt.Sprintf("%s[%d]", tag.path, i)
					if err := reflectutils.Set(v, path, unescape); err != nil {
						return errors.Wrapf(err, "failed to set %q to %v", path, v)
					}
				}
			}
		case reflect.Struct:
			obj, err := newStructObject(rt, qv)
			if err != nil {
				return err
			}
			if err := reflectutils.Set(v, tag.path, obj); err != nil {
				return errors.Wrapf(err, "failed to set %q to %v", tag.path, v)
			}
		default:
			if err := reflectutils.Set(v, tag.path, qv); err != nil {
				return errors.Wrapf(err, "failed to set %q to %v", tag.path, v)
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

// TODO: 这个逻辑是否可以和 collectQueryTags 复用？
// tags: jsonName => path
func collectJsonTags(rt reflect.Type, tags map[string]string) error {
	rt = unwrapPtrType(rt)
	if rt.Kind() != reflect.Struct {
		return errors.Errorf("%q expected struct, got %v", rt.String(), rt.Kind())
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
			return errors.Errorf("%q field %q is not exported", rt.String(), structField.Name)
		}

		name := structField.Name
		jsonTag, ok := structField.Tag.Lookup(tagJson)
		if ok {
			name = strings.Split(jsonTag, ",")[0]
			if name == "-" {
				return errors.Errorf("%q field %q is ignored by json", rt.String(), structField.Name)
			}
			if name == "" {
				name = structField.Name
			}
		}
		// TODO: 这里不太对，不能保证外层的优先级更高，embbeded 的优先级是低的
		tags[name] = structField.Name
	}
	return nil
}
