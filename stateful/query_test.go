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
					path:     "ID",
				},
				{
					Name:     "name",
					JsonName: "name",
					path:     "Name",
				},
				{
					Name:     "age",
					JsonName: "age",
					path:     "Age",
				},
				{
					Name:     "NoJsonTag",
					JsonName: "NoJsonTag",
					path:     "NoJsonTag",
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
					path:     "ID",
				},
				{
					Name:     "name",
					JsonName: "name",
					path:     "Name",
				},
				{
					Name:     "age",
					JsonName: "age",
					path:     "Age",
				},
				{
					Name:     "NoJsonTag",
					JsonName: "NoJsonTag",
					path:     "NoJsonTag",
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
				path:     "A",
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
				path:     "A",
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
					path:     "ID",
				},
				{
					Name:     "xname",
					JsonName: "name",
					path:     "Name",
				},
				{
					Name:     "age",
					JsonName: "age",
					path:     "Age",
				},
				{
					Name:     "NoJsonTag",
					JsonName: "NoJsonTag",
					path:     "NoJsonTag",
				},
				{
					Name:     "embedded",
					JsonName: "embedded",
					path:     "Embedded",
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

func TestQueryUnmarshal(t *testing.T) {
	q := `id=1&name=John&Age=30&emails=a%2C,b,c&addresses=Shanghai|China|descA|1000,Hangzhou%7C|China|descB|12300&company_address=Suzhou|China|descC|8888`

	type Embbeded struct {
		Description string `json:"description"`
	}

	type Address struct {
		Embbeded
		Country  string `json:"country"`
		City     string `json:"city"`
		Distance int    `json:"distance"`
	}

	type User struct {
		ID             int       `query:"id"`
		Name           string    `query:"name"`
		Age            int       `query:""`
		Emails         []string  `query:"emails"`
		Addresses      []Address `query:"addresses"`
		CompanyAddress *Address  `query:"company_address"`
	}

	user := User{}
	err := QueryDecode(q, &user)
	assert.NoError(t, err)
	assert.Equal(t, 1, user.ID)
	assert.Equal(t, "John", user.Name)
	assert.Equal(t, 30, user.Age)
	assert.Equal(t, []string{"a,", "b", "c"}, user.Emails)
	assert.Equal(t, []Address{
		{
			Embbeded: Embbeded{
				Description: "descA",
			},
			City:     "Shanghai",
			Country:  "China",
			Distance: 1000,
		},
		{
			Embbeded: Embbeded{
				Description: "descB",
			},
			City:     "Hangzhou|",
			Country:  "China",
			Distance: 12300,
		},
	}, user.Addresses)
	assert.Equal(t, &Address{
		Embbeded: Embbeded{
			Description: "descC",
		},
		City:     "Suzhou",
		Country:  "China",
		Distance: 8888,
	}, user.CompanyAddress)
}
