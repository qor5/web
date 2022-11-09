package multipartestutils

import (
	"bytes"
	"mime"
	"mime/multipart"
)

func CreateMultipartFileHeader(filename string, body []byte) *multipart.FileHeader {
	contentType, rd := NewMultipartBuilder().
		AddReader("test", filename, bytes.NewBuffer(body)).
		Build()
	defer rd.Close()
	_, params, err := mime.ParseMediaType(contentType)
	if err != nil {
		panic(err)
	}
	mr := multipart.NewReader(rd, params["boundary"])

	form, err := mr.ReadForm(1024 * 1024)
	if err != nil {
		panic(err)
	}

	return form.File["test"][0]
}
