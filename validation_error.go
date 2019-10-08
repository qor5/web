package web

import "fmt"

type ValidationErrors struct {
	globalErrors []string
	fieldErrors  map[string][]string
}

func (b *ValidationErrors) FieldError(fieldName string, message string) {
	if b.fieldErrors == nil {
		b.fieldErrors = make(map[string][]string)
	}
	b.fieldErrors[fieldName] = append(b.fieldErrors[fieldName], message)
	return
}

func (b *ValidationErrors) GlobalError(message string) {
	b.globalErrors = append(b.globalErrors, message)
	return
}

func (b *ValidationErrors) GetFieldErrors(fieldName string) (r []string) {
	if b.fieldErrors == nil {
		return
	}

	r = b.fieldErrors[fieldName]
	return
}

func (b *ValidationErrors) GetGlobalError() (r string) {
	if len(b.globalErrors) == 0 {
		return
	}
	return b.globalErrors[0]
}

func (b *ValidationErrors) GetGlobalErrors() (r []string) {
	return b.globalErrors
}

func (b *ValidationErrors) HaveErrors() bool {
	if len(b.globalErrors) > 0 {
		return true
	}
	if len(b.fieldErrors) > 0 {
		return true
	}
	return false
}

func (b *ValidationErrors) Error() string {
	return fmt.Sprintf("validation error global: %+v, fields: %+v", b.globalErrors, b.fieldErrors)
}
