import os
import boto3
import json

DYNAMO_TABLE = boto3.resource("dynamodb").Table(os.environ["DYNAMO_TABLE_NAME"])

def lambda_handler(event, context):
    params = json.loads(event["body"])
    update_result = False

    if "video_id" in event['pathParameters'] and "title" in params:
        res =DYNAMO_TABLE.update_item(
            Key={
                "video_id": event['pathParameters']['video_id']
            },
            UpdateExpression="SET title = :title",
            ExpressionAttributeValues={
                ":title": params["title"]
            }
        )
        update_result = res["ResponseMetadata"]["HTTPStatusCode"] == 200
    
    response = {
        "statusCode": 200,
        "body": json.dumps({
                'result': 'succ' if update_result else "error"
            }),
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Headers": 'Content-Type',
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": 'OPTIONS,POST,GET'
        }
    }
    return response
