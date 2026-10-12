import os
import boto3
import json

def lambda_handler(event, context):
    object_key = event['Records'][0]['s3']['object']['key']
    bucket_name = event['Records'][0]['s3']['bucket']['name']
    s3path = "s3://" + bucket_name + "/" + object_key
    video_id = os.path.basename(object_key).split('.')[0]
    update_video_upload_status(video_id_special_process(video_id), s3path)
    print(video_id)
    print(video_id_special_process(video_id))

def update_video_upload_status(video_id, s3path):
    dynamo_client = boto3.resource("dynamodb")
    table = dynamo_client.Table(os.environ["DYNAMO_TABLE_NAME"])

    # ここでS3のパスも更新するようにしたらmp4以外にも対応できるかも
    response = table.update_item(
        Key={
            'video_id': video_id
        },
        UpdateExpression="set upload_status = :status, s3fullpath = :s3path",
        ExpressionAttributeValues={
            ':status': 'complete',
            ':s3path': s3path
        },
        ReturnValues="UPDATED_NEW"
    )
    print(response)
    return response

# IDが-から始まる場合は特別な処理をしているのでその変換
def video_id_special_process(video_id):
    if video_id.startswith("ABCXYZ-"):
        return video_id[6:]
    return video_id
