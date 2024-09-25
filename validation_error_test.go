package web_test

import (
	"errors"
	"reflect"
	"testing"

	"github.com/qor5/web/v3"
)

func TestValidationGlobalError(t *testing.T) {
	errText := "test validation global error "
	err := errors.New(errText)
	validationErr := web.ValidationGlobalError(err)
	if !reflect.DeepEqual(validationErr.Error(), err.Error()) {
		t.Fail()
	}
	if validationErr.Error() != errText {
		t.Fail()
	}
}
