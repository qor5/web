package stateful

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseQueryTags(t *testing.T) {
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
		expected QueryTags
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
			expected: QueryTags{
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
			expected: QueryTags{
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
			expected: QueryTags{{
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
			expected: QueryTags{{
				Name:     "A",
				JsonName: "A",
				path:     "A",
			}},
			errMsg: "",
		},
		{
			name:  "StructWithEmbed",
			input: UserWithEmbed{},
			expected: QueryTags{
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
			tags, err := ParseQueryTags(tt.input)
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
	q := `id=1&name=John&Age=30&emails=a%2C,b,c&addresses=Shanghai_China_descA_1000,Hangzhou%7C_China_descB_12300&company_address=Suzhou_China_descC_8888`

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

	tags, err := ParseQueryTags(user)
	assert.NoError(t, err)

	err = tags.Decode(q, &user)
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

func TestIsRawQuerySubset(t *testing.T) {
	sup := "id=1&name=John&age=30&emails=a%2C,b,c"
	sub := "id=1&name=John&age=30"
	result := IsRawQuerySubset(sup, sub)
	assert.True(t, result)

	sub = "id=1&name=John&age=30&emails=a%2C,b"
	result = IsRawQuerySubset(sup, sub)
	assert.True(t, result)

	sub = "id=1&name=John&age=30&emails=a%2C,b,c"
	result = IsRawQuerySubset(sup, sub)
	assert.True(t, result)

	sub = "id=1&name=John&age=30&emails=a%2C&emails=b&emails=c" // emails: only 'c' is valid
	result = IsRawQuerySubset(sup, sub)
	assert.True(t, result)

	sub = "id=1&name=John&age=30&emails=a%2C&emails=b&emails=d" // emails: only 'd' is valid
	result = IsRawQuerySubset(sup, sub)
	assert.False(t, result)

	sub = "id=1&name=John&age=30&emails=a%2C,b,c&addresses=Shanghai"
	result = IsRawQuerySubset(sup, sub)
	assert.False(t, result)
}
