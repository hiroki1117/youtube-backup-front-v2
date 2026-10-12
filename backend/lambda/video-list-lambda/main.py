import os
import boto3
from boto3.dynamodb.conditions import Key
from boto3.dynamodb.conditions import Attr
import json

def lambda_handler(event, context):
    if event['queryStringParameters'] is None:
        upload_status = "complete"
        fetch_num = 30
    else:
        upload_status = event['queryStringParameters']['upload_status'] if "upload_status" in event['queryStringParameters'] else "complete"
        fetch_num = event['queryStringParameters']['fetch_num'] if "fetch_num" in event['queryStringParameters'] else 30

    # 最新のアップロードをn件取得
    table = boto3.resource("dynamodb").Table(os.environ["DYNAMO_TABLE_NAME"])
    response = table.query(
        IndexName="upload_status-backupdate-index",
        Limit=int(fetch_num),
        KeyConditionExpression=Key("upload_status").eq(upload_status),
        ScanIndexForward=False
    )

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

