package stateful

import (
	"reflect"
	"strings"

	"github.com/pkg/errors"
	"github.com/samber/lo"
)

type QueryTag struct {
	Name     string `json:"name"`
	JsonName string `json:"json_name"`
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
	rt := reflect.TypeOf(v)
	var tags []QueryTag
	if err := collectQueryTags(rt, &tags); err != nil {
		return nil, err
	}
	return tags, nil
}
