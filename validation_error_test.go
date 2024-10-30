package web_test

import (
	"errors"
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
