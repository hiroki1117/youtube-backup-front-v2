# バックアップが成功しているけどupload_statusがinitで止まっているデータをcompleteにアップデートする

import boto3
from boto3.dynamodb.conditions import Key
from boto3.dynamodb.conditions import Attr
from urllib.parse import urlparse

s3 = boto3.client("s3")
table = boto3.resource("dynamodb").Table("YoutubeBackup")

def main():    
    options = {
        'FilterExpression': Attr('upload_status').ne('complete')
    }
    res = table.scan(**options)

    if "Items" not in res:
        print("データがない")
        exit(1)

    exsitslist = []
    notfoundlist = []

    for item in res["Items"]:
        s3path = item["s3fullpath"]
        path = urlparse(s3path).path[1:]
        print(path)
        if checks3exists("youtubedl-bucket", path):
            exsitslist.append(item)
            update_video_upload_status(item["video_id"])
        else:
            notfoundlist.append(item)
        
    print(f"exits: {len(exsitslist)}")
    print(f"notfound: {len(notfoundlist)}")

def checks3exists(bukect, path):
    try:
        s3.head_object(Bucket=bukect, Key=path)
        return True
    except:
        return False

def update_video_upload_status(video_id):
    response = table.update_item(
        Key={
            'video_id': video_id
        },
        UpdateExpression="set upload_status = :status",
        ExpressionAttributeValues={
            ':status': 'complete'
        },
        ReturnValues="UPDATED_NEW"
    )
    return response


if __name__=='__main__':
    main()