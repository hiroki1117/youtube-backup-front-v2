import os
import boto3
from boto3.dynamodb.conditions import Key
from boto3.dynamodb.conditions import Attr
import json
from functools import reduce

JOB_QUEUE_NAME = os.environ["JOB_QUEUE_NAME"]
JOB_DEFINITION_NAME = os.environ["JOB_DEFINITION_NAME"]
JOB_REVISION = os.environ["JOB_REVISION"]
YTDLP_JOB_DEFINITION_NAME = os.environ["YTDLP_JOB_DEFINITION_NAME"]
YTDLP_JOB_REVISION = os.environ["YTDLP_JOB_REVISION"]
ssm = boto3.client('ssm', region_name='ap-northeast-1')
ssm_response = ssm.get_parameters(
    Names=[
        ('/youtube-backup/proxy-path'),
        ('/youtube-backup/cookie-s3-path'),
    ],
    WithDecryption=True
)
f = lambda z: lambda x,y: y["Value"] if y["Name"]==z else x
PROXY_PATH = reduce(f('/youtube-backup/proxy-path'), ssm_response['Parameters'], "")
COOKIE_S3_PATH = reduce(f('/youtube-backup/cookie-s3-path'), ssm_response['Parameters'], "")

def lambda_handler(event, context):
    # 動画DLに失敗している(upload_status=init)データを取得
    table = boto3.resource("dynamodb").Table(os.environ["DYNAMO_TABLE_NAME"])
    response = table.query(
      IndexName="upload_status-backupdate-index",
      KeyConditionExpression=Key("upload_status").eq("init"),
      ScanIndexForward=False
    )

    # 動画DLに失敗しているデータを再度DLする
    batch_client = BatchClient()
    for item in response['Items']:
        url = item['video_url']
        s3fullpath = item['s3fullpath']
        s3path = s3fullpath[:s3fullpath.rfind('/')] + '/'
        backup_filename = s3fullpath[s3fullpath.rfind('/')+1:]
        print(f"URL: {url}")
        print(f"Filename: {backup_filename}")
        print(f"S3PATH: {s3path}")
        batch_client.submit_job(url, s3path, backup_filename)

    response = {
        "statusCode": 200,
        "body": json.dumps(response['Items']),
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Headers": 'Content-Type',
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": 'OPTIONS,POST,GET'
        }
    }
    return response

class BatchClient:

    def __init__(self):
        self.client = boto3.client("batch")
        self.job_queue = JOB_QUEUE_NAME
        self.job_definition = JOB_DEFINITION_NAME + ":" + JOB_REVISION
        self.jobname = "youtubedljob-from-lambda"
        self.ytdlp_job_definition = YTDLP_JOB_DEFINITION_NAME + ":" + YTDLP_JOB_REVISION
        self.proxy_path = PROXY_PATH # 一時的な対応
        self.cookie_s3_path = COOKIE_S3_PATH # 一時的な対応

    def submit_job(self, url, s3path, backup_filename):           
        container_overrides={
            'environment': [
                {
                    'name': 'URL',
                    'value': url
                },
                {
                    'name': 'FILENAME',
                    'value': backup_filename
                },
                {
                    'name': 'S3PATH',
                    'value': s3path
                },
                {
                    'name': 'PROXY_PATH',
                    'value': self.proxy_path
                },
                {
                    'name': 'COOKIE_S3_PATH',
                    'value': self.cookie_s3_path
                }
            ]
        }

        return self.client.submit_job(
            jobName=self.jobname,
            jobQueue=self.job_queue,
            jobDefinition=self.ytdlp_job_definition,
            containerOverrides=container_overrides
        )
