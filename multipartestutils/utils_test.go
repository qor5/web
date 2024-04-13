package multipartestutils_test

import (
	"io/ioutil"
	"testing"

	"github.com/qor5/web/v3/multipartestutils"
)

func TestCreateMultipartFileHeader(t *testing.T) {
	f := multipartestutils.CreateMultipartFileHeader("test.txt", []byte("hello"))
	if f.Filename != "test.txt" {
		t.Error(f.Filename)
	}
	file, err := f.Open()
	if err != nil {
		t.Fatal(err)
	}
	content, err := ioutil.ReadAll(file)
	if err != nil {
		t.Fatal(err)
	}
	if string(content) != "hello" {
		t.Error(string(content))
	}
}

func TestBuilder_BuildEventFuncRequest(t *testing.T) {
	r := multipartestutils.NewMultipartBuilder().
		EventFunc("hello").
		Query("id", "123").
		Query("model", "Customer").
		BuildEventFuncRequest()

	if r.URL.String() != "/?__execute_event__=hello&id=123&model=Customer" {
		t.Error(r.URL.String())
	}
}
