import os
import boto3
import json

def lambda_handler(event, context):

    for _ in range(1):
        if (event['pathParameters'] is None) or ("video_id" not in event['pathParameters']):
            result = {
                'result': 'error',
                'description': 'video_idを指定してください',
                'video_data': None
            }
            break

        video_id = event['pathParameters']['video_id']

        # 動画情報の取得
        table = boto3.resource("dynamodb").Table(os.environ["DYNAMO_TABLE_NAME"])
        maybeitem = table.get_item(Key={'video_id': video_id})
        video_data = maybeitem["Item"] if "Item" in maybeitem else None
        result = {
                'result': 'succ',
                'description': '',
                'video_data': video_data
            } if video_data is not None else {
                'result': 'error',
                'description': 'Dynamoに情報がない',
                'video_data': None
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