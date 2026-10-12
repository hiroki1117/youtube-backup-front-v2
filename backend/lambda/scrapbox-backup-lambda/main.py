import os
import re
import json
import boto3
import urllib.parse
import urllib.request
from urllib.parse import quote
from functools import reduce

def lambda_handler(event, context):
    
    ssm = boto3.client('ssm', region_name='ap-northeast-1')
    ssm_response = ssm.get_parameters(
        Names = [('/youtube-backup/scrapbox-credentials'), ('/youtube-backup/scrapbox-projects')],
        WithDecryption=True
    )
    f = lambda z: lambda x,y: y["Value"] if y["Name"]==z else x
    YOUTUBE_BACKUP_ENDPOINT = os.environ["SUBMIT_JOB_ENDPOINT"]
    SCRAPBOX_CREDENTIALS = reduce(f('/youtube-backup/scrapbox-credentials'), ssm_response['Parameters'], "")
    # hoge,fuga,...形式
    SCRAPBOX_PROJECTS = reduce(f('/youtube-backup/scrapbox-projects'), ssm_response['Parameters'], "")

    LIMIT = "25"
    base_endpoint = "https://scrapbox.io/api/pages/"
    header = {
        "Cookie": "connect.sid="+SCRAPBOX_CREDENTIALS
    }
    result_youtube_urls = []

    for project in SCRAPBOX_PROJECTS.split(","):
        all_content = [line for title in get_pagetitle(base_endpoint + project + "?limit=" + LIMIT, header) for line in get_page_content(base_endpoint+project+"/"+quote(title, safe=""), header)]
        tmp_ids = filter(lambda y: y is not None ,map(lambda x: extract_youtubevideoid(x), all_content))
        result_youtube_urls += tmp_ids
    
    for youtube_url in result_youtube_urls:
        youtube_backup_request(YOUTUBE_BACKUP_ENDPOINT, youtube_url)
    
    return {
        'statusCode': 200,
        'body': json.dumps('Hello from ScrapboxBackup')
    }


# ページのタイトルの配列を返却
# https://scrapbox.io/api/pages/プロジェクト
def get_pagetitle(url, header):
    req = urllib.request.Request(url, headers=header)
    with urllib.request.urlopen(req) as res:
        pages_json = json.load(res)
    
    return map(lambda x: x['title'], pages_json['pages'])

# ページの内容を一行毎の配列として返却
# https://scrapbox.io/api/pages/プロジェクト/ページタイトル
def get_page_content(url, header):
    req = urllib.request.Request(url, headers=header)
    with urllib.request.urlopen(req) as res:
        pages_json = json.load(res)

    return map(lambda x: x['text'], pages_json['lines'])

# 一行からyoutubeの動画idを抽出する
def extract_youtubevideoid(text):
	result = re.search(r"https://www\.youtube\.com/watch\?v=.{11}", text)
	if result is not None:
		return result.group()

	result = re.search(r"https://youtu\.be/.{11}", text)
	if result is not None:
		return result.group()
	
	result = re.search(r"https://www\.youtube\.com/shorts/.{11}", text)
	if result is not None:
	    return result.group()
	
	result = re.search(r"https://youtube\.com/shorts/.{11}", text)
	if result is not None:
	    return result.group()
	return None

	result = re.search(r"https://www\.youtube\.com/live/.{11}", text)
	if result is not None:
	    return result.group()
	
	result = re.search(r"https://youtube\.com/live/.{11}", text)
	if result is not None:
	    return result.group()
	return None

# youtube backupリクエスト
def youtube_backup_request(url, youtube_url):
    data = {
        'url': youtube_url
    }
    headers = {
        'Content-Type': 'application/json',
    }
    data = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data, headers, method='POST')
    with urllib.request.urlopen(req) as res:
        o = json.load(res)
        print(o)

