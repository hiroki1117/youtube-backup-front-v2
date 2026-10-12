#!/bin/sh
set -eux

echo $URL
echo $FILENAME
echo ${S3PATH}

# youtube-dl -o "$FILENAME" -f "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best" --merge-output-format mp4 "$URL"
# youtube-dl -o "$FILENAME" -f "best[ext=mp4]" "$URL"
# youtube-dl -o "$FILENAME" -f "best[ext=mp4]/best" --merge-output-format mp4 "$URL"
# mp4でダウンロードが失敗したらマージでダウンロードする
youtube-dl -o "$FILENAME" -f "best[ext=mp4]" "$URL" || youtube-dl -o "$FILENAME" -f "best[ext=mp4]/best" --merge-output-format mp4 "$URL"


# 動画をS3にアップロード
aws s3 cp "${FILENAME}" "${S3PATH}"

