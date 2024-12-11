package web_test

import (
	"errors"
	"slices"
	"testing"

	"github.com/qor5/web/v3"
)

func TestValidationGlobalError(t *testing.T) {
	errText := "test validation global error "
	err := errors.New(errText)
	validationErr := web.ValidationGlobalError(err)
	if validationErr.Error() != errText {
		t.Fail()
	}
}

func TestValidationErrorMerge(t *testing.T) {
	var (
		globalError1, globalError2 string = "global error 1", "global error 2"
		field1, field2             string = "field1", "field2"
		field1Error1, field1Error2 string = "field1 error 1", "field1 error 2"
		field2Error1               string = "field2 error 1"
	)

	type Case struct {
		Name          string
		CurrentErr    func() *web.ValidationErrors
		MergedErr     func() *web.ValidationErrors
		WantGlobalErr []string
		WantFieldErr  map[string][]string
	}
	cases := []Case{
		{
			Name: "Add new global error",
			CurrentErr: func() *web.ValidationErrors {
				vErr := &web.ValidationErrors{}
				vErr.GlobalError(globalError1)
				vErr.FieldError("field1", field1Error1)
				return vErr
			},
			MergedErr: func() *web.ValidationErrors {
				e := &web.ValidationErrors{}
				e.GlobalError(globalError2)
				return e
			},
			WantGlobalErr: []string{globalError1, globalError2},
			WantFieldErr: map[string][]string{
				field1: {field1Error1},
			},
		},
		{
			Name: "Add same global error",
			CurrentErr: func() *web.ValidationErrors {
				vErr := &web.ValidationErrors{}
				vErr.GlobalError(globalError1)
				vErr.FieldError("field1", field1Error1)
				return vErr
			},
			MergedErr: func() *web.ValidationErrors {
				e := &web.ValidationErrors{}
				e.GlobalError(globalError1)
				return e
			},
			WantGlobalErr: []string{globalError1},
			WantFieldErr: map[string][]string{
				field1: {field1Error1},
			},
		},
		{
			Name: "Add field error",
			CurrentErr: func() *web.ValidationErrors {
				vErr := &web.ValidationErrors{}
				vErr.GlobalError(globalError1)
				vErr.FieldError("field1", field1Error1)
				return vErr
			},
			MergedErr: func() *web.ValidationErrors {
				e := &web.ValidationErrors{}
				e.FieldError(field2, field2Error1)
				return e
			},
			WantGlobalErr: []string{globalError1},
			WantFieldErr: map[string][]string{
				field1: {field1Error1},
				field2: {field2Error1},
			},
		},
		{
			Name: "Add same field with different error",
			CurrentErr: func() *web.ValidationErrors {
				vErr := &web.ValidationErrors{}
				vErr.GlobalError(globalError1)
				vErr.FieldError("field1", field1Error1)
				return vErr
			},
			MergedErr: func() *web.ValidationErrors {
				e := &web.ValidationErrors{}
				e.FieldError(field1, field1Error2)
				return e
			},
			WantGlobalErr: []string{globalError1},
			WantFieldErr: map[string][]string{
				field1: {field1Error1, field1Error2},
			},
		},
		{
			Name: "Add same field with same error",
			CurrentErr: func() *web.ValidationErrors {
				vErr := &web.ValidationErrors{}
				vErr.GlobalError(globalError1)
				vErr.FieldError("field1", field1Error1)
				return vErr
			},
			MergedErr: func() *web.ValidationErrors {
				e := &web.ValidationErrors{}
				e.FieldError(field1, field1Error1)
				return e
			},
			WantGlobalErr: []string{globalError1},
			WantFieldErr: map[string][]string{
				field1: {field1Error1},
			},
		},
	}
	for _, c := range cases {
		t.Run(c.Name, func(t *testing.T) {
			vErr := c.CurrentErr()
			vErr.Merge(c.MergedErr())
			if !slices.Equal(vErr.GetGlobalErrors(), c.WantGlobalErr) {
				t.Fail()
			}
			for fieldName, v := range c.WantFieldErr {
				if !slices.Equal(vErr.GetFieldErrors(fieldName), v) {
					t.Fail()
				}
			}
		})
	}
}

func TestValidationField(t *testing.T) {
	err := web.ValidationErrors{}
	err.FieldError("Name", "123")
	errs := err.FieldErrors()
	if len(errs) != 1 {
		t.Fail()
		return
	}
	nameField := errs["Name"]
	if nameField == nil || len(nameField) == 0 {
		t.Fail()
		return
	}
	if nameField[0] != "123" {
		t.Fail()
	}
}

func TestValidationErrorsHaveGlobalErrors(t *testing.T) {
	err := web.ValidationErrors{}
	if err.HaveGlobalErrors() {
		t.Fail()
	}
	err.FieldError("Name", "field name error")
	if err.HaveGlobalErrors() {
		t.Fail()
	}
	err.GlobalError("global error")
	if !err.HaveGlobalErrors() {
		t.Fail()
	}
}
