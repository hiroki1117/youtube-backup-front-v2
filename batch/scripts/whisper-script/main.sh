#!/bin/sh
set -eux

echo $TARGET_S3PATH
echo $FILENAME
echo $UPLOAD_S3PATH

aws s3 cp "${TARGET_S3PATH}" .

whisper --model small "${FILENAME}"

aws s3 cp ./"${FILENAME}.txt" "${UPLOAD_S3PATH}"
