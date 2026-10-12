import os
import boto3
import time
import json
from urllib.parse import urlparse

def lambda_handler(event, context):
    video_id = event['pathParameters']['video_id']

    #削除ロジック
    result = process(video_id)
    response = {
        "statusCode": 200,
        "body": json.dumps(result),
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Headers": 'Content-Type',
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": 'OPTIONS,DELETE,GET'
        }
    }
    return response


def process(video_id):
    dynamo_client = DynamoClient()
    s3_client = S3Client()

    # ビデオ情報
    video_data = dynamo_client.get_videodata(video_id)

    if video_data is None:
        return {
            'result': 'error',
            'description': 'Dynamoに情報がない',
            'video_data': None
        }

    if (video_data["upload_status"] == "init") and check_backupprocessing(video_data):
        # バックアップ中
        return {
            'result': 'error',
            'description': '(バックアップ中)Dynamoに登録されているがS3に存在しません。',
            'video_data': video_data
        }

    s3result = s3_client.delete_object(video_data['s3fullpath'])
    if not s3result:
        return {
            'result': 'error',
            'description': 'S3の削除に失敗',
            'video_data': video_data
        }
    
    dynamoresult = dynamo_client.delete_videodata(video_id)

    if not dynamoresult:
        return {
            'result': 'error',
            'description': 'DynamoItemの削除に失敗',
            'video_data': video_data
        }
    
    return {
        'result': 'succ',
        'description': '',
        'video_data': video_data
    }

def check_backupprocessing(video_data):
    # request_timeoutが存在しない
    if "request_timestamp" not in video_data:
        return False

    request_timestamp = int(video_data["request_timestamp"])
    now_timestamp = int(time.time())
    batch_job_timeout = int(os.environ["BATCH_JOB_TIMEOUT"])
    if (now_timestamp-request_timestamp) < batch_job_timeout:
        # 処理中
        return True
    else:
        # タイムアウトでバックアップ失敗している
        return False


class DynamoClient():

    def __init__(self):
        self.dynamo_client = boto3.resource("dynamodb")
        self.table = self.dynamo_client.Table(os.environ["DYNAMO_TABLE_NAME"])

    def get_videodata(self, video_id):
        res = self.table.get_item(Key={'video_id': video_id})
        return res['Item'] if 'Item' in res else None
    
    def delete_videodata(self, video_id):
        res = self.table.delete_item(
            Key={
                'video_id': video_id
            }
        )
        status = res['ResponseMetadata']['HTTPStatusCode']
        return status == 200

class S3Client():

    def __init__(self):
        self.s3_client = boto3.client('s3')
    
    def delete_object(self, s3fullpath):
        bucket, key = self.__parse_s3fullpath(s3fullpath)
        res = self.s3_client.delete_object(
            Bucket=bucket,
            Key=key
        )
        status = res['ResponseMetadata']['HTTPStatusCode']

        return status == 204

    # 指定のkeyが存在するか確認
    def checks3exists(self, s3fullpath):
        bucket, key = self.__parse_s3fullpath(s3fullpath)
        try:
            self.s3_client.head_object(Bucket=bucket, Key=key)
            return True
        except:
            return False

    def __parse_s3fullpath(self, s3fullpath):
        tmp = urlparse(s3fullpath)
        return (tmp.netloc, tmp.path[1:])
