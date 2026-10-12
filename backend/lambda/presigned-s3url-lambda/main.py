import os
import boto3
import json
from urllib.parse import urlparse

# グローバルで初期化して速度節約
TABLE = boto3.resource("dynamodb").Table(os.environ["DYNAMO_TABLE_NAME"])
S3CLIENT = boto3.client('s3')

def lambda_handler(event, context):

    for _ in range(1):
        if (event['queryStringParameters'] is None) or ("video_id" not in event['queryStringParameters']):
            result = {
                'result': 'error',
                'description': 'video_idを指定してください',
                'presigned_s3url': None
            }
            break

        video_id = event['queryStringParameters']['video_id']

        # 動画のS3URL取得
        maybeitem = TABLE.get_item(Key={'video_id': video_id})
        video_data = maybeitem["Item"] if "Item" in maybeitem else None
        if video_data is None:
            result = {
                'result': 'error',
                'description': 'Dynamoに情報がない',
                'presigned_s3url': None
            }
            break
        
        # presigned url発行
        presigned_url = S3CLIENT.generate_presigned_url(
            ClientMethod="get_object",
            Params={
                "Bucket": urlparse(video_data["s3fullpath"]).netloc,
                "Key": urlparse(video_data["s3fullpath"]).path[1:]
            },
            ExpiresIn=3600
        )
        
        result = {
            "result": "succ",
            "description": "",
            "presigned_s3url": presigned_url
        }

    response = {
        "statusCode": 200,
        "body": json.dumps(result),
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Headers": 'Content-Type',
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": 'OPTIONS,POST,GET'
        }
    }
    return response
