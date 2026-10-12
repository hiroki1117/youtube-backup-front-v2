#!/bin/sh
set -eux

echo $URL
echo $FILENAME
echo ${S3PATH}
echo ${COOKIE_S3_PATH}


# mp4でダウンロードが失敗したらマージでダウンロードする
#yt-dlp --recode-video mp4 -o "$FILENAME" "$URL"

#######################################################################################
#
# https://github.com/yt-dlp/yt-dlp/issues/10128 の問題のためしばらくの間は完全に動作を止めておく
#
# yt-dlp -o "$FILENAME.%(ext)s" "$URL"
#
# FULLFILENAME=`find $FILENAME.*`
#
# 動画をS3にアップロード
# aws s3 cp "${FULLFILENAME}" "${S3PATH}"
#
#######################################################################################

#######################################################################################
# ↑の問題のため一時的にproxyを使ってダウンロードする
#
# yt-dlp --proxy "${PROXY_PATH}" -o "$FILENAME.%(ext)s" "$URL"
#
#######################################################################################


# データセンタープロキシを使ってもbot判定されるようになったためcookie指定

aws s3 cp "${COOKIE_S3_PATH}" ./cookies.txt

yt-dlp --cookies ./cookies.txt -o "$FILENAME.%(ext)s" "$URL"

FULLFILENAME=`find $FILENAME.*`

aws s3 cp "${FULLFILENAME}" "${S3PATH}"
