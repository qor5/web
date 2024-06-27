package stateful

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestGetQueryTags(t *testing.T) {
	type InvalidStruct int // Not a struct

	type User struct {
		ID         int    `query:"" json:"id"`
		Name       string `query:"" json:"name"`
		Age        int    `query:"" json:"age"`
		NoJsonTag  string `query:""`
		NoQueryTag string
		Ignore     string `json:"-"`
	}

	type Embedded struct {
		Description int `query:"" json:"description"`
	}

	type UserWithEmbed struct {
		User
		Embedded `query:"" json:"embedded"`
		Name     string `query:"xname" json:"name"`
		Blank    string `json:" blank "`
	}

	type Ignored struct {
		A int `query:"" json:"-"`
	}

	tests := []struct {
		name     string
		input    any
		expected []QueryTag
		errMsg   string
	}{
		{
			name:     "InvalidStruct",
			input:    InvalidStruct(123),
			expected: nil,
			errMsg:   "expected struct, got",
		},
		{
			name:  "ValidStructWithJsonTags",
			input: User{},
			expected: []QueryTag{
				{
					Name:     "id",
					JsonName: "id",
				},
				{
					Name:     "name",
					JsonName: "name",
				},
				{
					Name:     "age",
					JsonName: "age",
				},
				{
					Name:     "NoJsonTag",
					JsonName: "NoJsonTag",
				},
			},
			errMsg: "",
		},
		{
			name:  "PointerToStruct",
			input: &User{},
			expected: []QueryTag{
				{
					Name:     "id",
					JsonName: "id",
				},
				{
					Name:     "name",
					JsonName: "name",
				},
				{
					Name:     "age",
					JsonName: "age",
				},
				{
					Name:     "NoJsonTag",
					JsonName: "NoJsonTag",
				},
			},
			errMsg: "",
		},
		{
			name: "NonExportedField",
			input: struct {
				a int `query:""`
			}{},
			expected: nil,
			errMsg:   `field "a" is not exported`,
		},
		{
			name:     "JsonIgnoredField",
			input:    Ignored{},
			expected: nil,
			errMsg:   `field "A" is ignored by json`,
		},
		{
			name: "JsonTagWithSpace",
			input: struct {
				A int `query:"" json:" "`
			}{},
			expected: []QueryTag{{
				Name:     " ",
				JsonName: " ",
			}},
			errMsg: "",
		},
		{
			name: "EmptyJsonTag",
			input: struct {
				A int `query:"" json:""`
			}{},
			expected: []QueryTag{{
				Name:     "A",
				JsonName: "A",
			}},
			errMsg: "",
		},
		{
			name:  "StructWithEmbed",
			input: UserWithEmbed{},
			expected: []QueryTag{
				{
					Name:     "id",
					JsonName: "id",
				},
				{
					Name:     "xname",
					JsonName: "name",
				},
				{
					Name:     "age",
					JsonName: "age",
				},
				{
					Name:     "NoJsonTag",
					JsonName: "NoJsonTag",
				},
				{
					Name:     "embedded",
					JsonName: "embedded",
				},
			},
			errMsg: "",
		},
		{
			name: "EmbeddedStructWithQueryTag",
			input: struct {
				Embedded `query:"" json:""`
				Name     string `query:"" json:"name"`
			}{},
			expected: nil,
			errMsg:   `embedded field "Embedded" has query tag`,
		},
		{
			name: "StructWithEmbeddedIgnoredField",
			input: struct {
				Ignored
				Name string `query:"" json:"name"`
			}{},
			expected: nil,
			errMsg:   `field "A" is ignored by json`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tags, err := GetQueryTags(tt.input)
			if tt.errMsg != "" {
				assert.ErrorContains(t, err, tt.errMsg)
				return
			}
			assert.Equal(t, tt.expected, tags)
			assert.NoError(t, err)
		})
	}
}
