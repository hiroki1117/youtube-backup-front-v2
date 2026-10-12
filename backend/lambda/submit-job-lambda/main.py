import os
import time
import boto3
import tweepy
import json
import hashlib
import dataclasses
import datetime
import urllib.request
from urllib.parse import urlparse
from urllib.parse import parse_qs
from functools import reduce

JOB_QUEUE_NAME = os.environ["JOB_QUEUE_NAME"]
JOB_DEFINITION_NAME = os.environ["JOB_DEFINITION_NAME"]
JOB_REVISION = os.environ["JOB_REVISION"]
YTDLP_JOB_DEFINITION_NAME = os.environ["YTDLP_JOB_DEFINITION_NAME"]
YTDLP_JOB_REVISION = os.environ["YTDLP_JOB_REVISION"]
DYNAMO_TABLE_NAME = os.environ["DYNAMO_TABLE_NAME"]
BACKUP_BACKET = os.environ["BACKUP_BACKET"]

ssm = boto3.client('ssm', region_name='ap-northeast-1')
ssm_response = ssm.get_parameters(
    Names = [
        ('/youtube-backup/youtube-api-key'),
        ('/youtube-backup/twitter-api-key'),
        ('/youtube-backup/twitter-api-secret'),
        ('/youtube-backup/twitter-access-token'),
        ('/youtube-backup/twitter-access-token-secret'),
        ('/youtube-backup/proxy-path'),
        ('/youtube-backup/cookie-s3-path'),
    ],
    WithDecryption=True
)
f = lambda z: lambda x,y: y["Value"] if y["Name"]==z else x
YOUTUBE_API_KEY = reduce(f('/youtube-backup/youtube-api-key'), ssm_response['Parameters'], "")
TWITTER_API_KEY = reduce(f('/youtube-backup/twitter-api-key'), ssm_response['Parameters'], "")
TWITTER_API_SECRET = reduce(f('/youtube-backup/twitter-api-secret'), ssm_response['Parameters'], "")
TWITTER_ACCESS_TOKEN = reduce(f('/youtube-backup/twitter-access-token'), ssm_response['Parameters'], "")
TWITTER_ACCESS_TOKEN_SECRET = reduce(f('/youtube-backup/twitter-access-token-secret'), ssm_response['Parameters'], "")
PROXY_PATH = reduce(f('/youtube-backup/proxy-path'), ssm_response['Parameters'], "")
COOKIE_S3_PATH = reduce(f('/youtube-backup/cookie-s3-path'), ssm_response['Parameters'], "")

RESULT_ERROR = "error"
RESULT_SUCC = "succ"


def lambda_handler(event, context):
    params = json.loads(event["body"])
    url = params["url"] if "url" in params else ""

    video_controller = VideoController()
    dynamo_client = DynamoClient()

    # 動画データが既にバックアップ済みか確認する
    video_id = video_controller.get_video_id_from_url(url)
    check_video_item_or_none = dynamo_client.get_video_data(video_id)
    if check_video_item_or_none is not None:
        return response_template(
            check_video_item_or_none["video_id"],
            check_video_item_or_none["title"],
            check_video_item_or_none["s3fullpath"],
            True, # バックアップ済みでした
            "", # バックアップ済みなのでaws_batch_jobも発行されていない
            RESULT_SUCC,
            "バックアップ済み"
        )

    # 動画のid、タイトルなどの情報をプラットフォームAPIから取得
    try:
        video_data = video_controller.get_video_data(url)
    except Exception as e:
        print(e)
        return response_template(
            "",
            "",
            "",
            False,
            "",
            RESULT_ERROR,
            "URLの異常"
        )

    # DynamoDBに保存
    is_inserted = dynamo_client.insert(video_data)
    s3path = dynamo_client.get_video_s3path(video_data.id)

    # AWS Batchで動画保存処理
    batch_job_id = ""
    if is_inserted:
        batch_client = BatchClient()    
        batch_job_id = batch_client.submit_job(url, video_data)["jobId"]
     
    return response_template(
        video_data.id,
        video_data.title,
        s3path,
        not is_inserted,
        batch_job_id,
        RESULT_SUCC,
        "バックアップ処理開始" if batch_job_id != "" else ""
    )


def response_template(video_id, video_title, video_s3path, already_backup_flg, aws_batch_job_id, result, description):
    return {
        "statusCode": 200,
        "body": json.dumps({
            'result': result,
            'description': description,
            'video_data': {
                'video_id': video_id,
                'title': video_title,
                'already_backup': already_backup_flg,
                'batch_job_id': aws_batch_job_id,
                's3': video_s3path
            }
        }),
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Headers": 'Content-Type',
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": 'OPTIONS,POST,GET'
        }
    }


class BatchClient:

    def __init__(self):
        self.client = boto3.client("batch")
        self.job_queue = JOB_QUEUE_NAME
        self.job_definition = JOB_DEFINITION_NAME + ":" + JOB_REVISION
        self.jobname = "youtubedljob-from-lambda"
        self.ytdlp_job_definition = YTDLP_JOB_DEFINITION_NAME + ":" + YTDLP_JOB_REVISION
        self.proxy_path = PROXY_PATH # 一時的な対応
        self.cookie_s3_path = COOKIE_S3_PATH # 一時的な対応

    def submit_job(self, url, video_data):           
        container_overrides={
            'environment': [
                {
                    'name': 'URL',
                    'value': url
                },
                {
                    'name': 'FILENAME',
                    'value': video_data.backup_filename
                },
                {
                    'name': 'S3PATH',
                    'value': video_data.s3path
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


class DynamoClient():

    def __init__(self):
        self.dynamo_client = boto3.resource("dynamodb")
        self.table = self.dynamo_client.Table(DYNAMO_TABLE_NAME)

    def insert(self, videodata):
        # 既に保存されている場合はFalseを返してinsertしない
        if self.get_video_data(videodata.id) is not None:
            return False

        response = self.table.put_item(
            Item = {
                'video_id': videodata.id,
                'video_url': videodata.url,
                'platform': videodata.platform,
                'title': videodata.title,
                'backupdate': videodata.backupdate,
                's3fullpath': videodata.s3path + videodata.backup_filename,
                'upload_status': "init",
                'request_timestamp': str(int(time.time()))
            }
        )

        return True
    
    def get_video_s3path(self, video_id):
        video_data_item = self.get_video_data(video_id)
        if video_data_item is None:
            raise Exception(f"登録後の動画データ検索に失敗しました video_id : {video_id}")
        return video_data_item["s3fullpath"]

    def get_video_data(self, video_id):
        res = self.table.get_item(Key={'video_id': video_id})
        return res["Item"] if 'Item' in res else None


class VideoController():

    def get_video_id_from_url(self, url):
        if ("youtube" in url) | ("youtu.be" in url):
            youtube_client = YoutubeClient()
            video_id = youtube_client.get_video_id_from_url(url)
        elif "twitter" in url:
            twitter_client = TwitterClient()
            video_id = twitter_client.get_video_id_from_url(url)
        else:
            other_client = OtherPlatformClient()
            video_id = other_client.get_video_id_from_url(url)

        return video_id

    def get_video_data(self, url):
        if ("youtube" in url) | ("youtu.be" in url):
            youtube_client = YoutubeClient()
            video_data = youtube_client.video_info(url)
        elif "twitter" in url:
            twitter_client = TwitterClient()
            video_data = twitter_client.video_info(url)
        else:
            other_client = OtherPlatformClient()
            video_data = other_client.video_info(url)

        return video_data


class YoutubeClient():

    def __init__(self):
        self.PLATFORM = 'youtube'
        self.NORMAL_YOUTUBE_BASE_URL = 'https://www.youtube.com/watch?v='
        self.NORMAL_YOUTUBE_SHORT_BASE_URL = 'https://www.youtube.com/shorts/'
        self.NORMAL_YOUTUBE_LIVE_BASE_URL = 'https://www.youtube.com/live/'

    def get_video_id_from_url(self, url):
        video_url = self._normalize_url(url)
        video_id = self.__parse_url(video_url)
        return video_id
    
    def video_info(self, video_url):
        video_url = self._normalize_url(video_url)
        video_id = self.__parse_url(video_url)
        url = f'https://www.googleapis.com/youtube/v3/videos?id={video_id}&key={YOUTUBE_API_KEY}&part=snippet'

        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as res:
            video_json = json.load(res)
            print(video_json)

        day = datetime.date.today()
        return VideoData(
            id=video_id,
            url=video_url,
            platform=self.PLATFORM,
            title=video_json['items'][0]['snippet']['title'],
            s3path=f's3://{BACKUP_BACKET}/{self.PLATFORM}/{day.year}/{day.month}/{day.day}/',
            backupdate=str(day),
            # video_idが-から始まる場合は-から始まるファイル名はawscliでオプションと勘違いされてエラーになる
            # 回避するためにABCXYZの接頭をつけることにする
            backup_filename=video_id if not video_id.startswith("-") else "ABCXYZ" + video_id
        )
    
    # URLからvideo_idを取得
    def __parse_url(self, url):
        if self._is_short(url):
            return urlparse(url).path.split('/shorts/')[-1]
        if self._is_live(url):
            return urlparse(url).path.split('/live/')[-1]
        return parse_qs(urlparse(url).query)['v'][0]

    # youtubeのリダイレクトurl対応
    def _normalize_url(self, url):
        if self._is_short(url):
            short_id = urlparse(url).path.split('/shorts/')[-1]
            return self.NORMAL_YOUTUBE_SHORT_BASE_URL + short_id
        if self._is_live(url):
            live_id = urlparse(url).path.split('/live/')[-1]
            return self.NORMAL_YOUTUBE_LIVE_BASE_URL + live_id
        return url if "youtube" in url else self.NORMAL_YOUTUBE_BASE_URL + urlparse(url).path[1::]
    
    # youtube shortのurlかどうかを判定
    def _is_short(self, url):
        return "/shorts/" in url

    # youtube liveのurlかどうかを判定
    def _is_live(self, url):
        return "/live/" in url

class TwitterClient():
    def __init__(self):
        auth = tweepy.OAuthHandler(TWITTER_API_KEY, TWITTER_API_SECRET)
        auth.set_access_token(TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_TOKEN_SECRET)
        self.api = tweepy.API(auth)
        self.PLATFORM = 'twitter'

    def get_video_id_from_url(self, url):
        video_id = self.__parse_url(url)
        return video_id

    def video_info(self, video_url):
        video_id = self.__parse_url(video_url)
        print(f"tweetvideo_id : {video_id}")

        # バックアップ不可な場合は例外
        # tweetのjson構造に一貫性がなくて謎なので一旦保留
        # if not self.__check_tweet(video_id):
        #     raise Exception("無効なTweet。tweet_idが不正かtweetに動画がありません")

        day = datetime.date.today()
        return VideoData(
            id=video_id,
            url=video_url,
            platform=self.PLATFORM,
            title=self.__get_tweet_text(video_id),
            s3path=f's3://{BACKUP_BACKET}/{self.PLATFORM}/{day.year}/{day.month}/{day.day}/',
            backupdate=str(day),
            backup_filename=video_id
        )
    
    # tweetに動画データがあるか/無効なtweet_idじゃないか確認する
    def __check_tweet(self, video_id):
        try:
            tw_status = self.api.get_status(video_id)
            print(tw_status)
            return any(e["type"] == "video" for e in tw_status._json["extended_entities"]["media"])
        except KeyError:
            return False
        except Exception as e:
            print(e)
            return False

    def __get_tweet_text(self, video_id):
        print("xxxxxxxxxxxxxxxxxxx")
        tw_status = self.api.get_status(video_id)
        print("yyyyyyyyyyyyyyyyyy")
        return tw_status._json["text"]


    # https://twitter.com/ValorantUpdates/status/1312387281072906241
    # のような値の時に最後の数字をidとして取得する
    def __parse_url(self, url):
        return urlparse(url).path.split('/')[-1]


# Youtube/Twitter以外のプラットフォームの動画
class OtherPlatformClient():
        
    def get_video_id_from_url(self, url):
        return self.__sha256str15(url)
    
    def video_info(self, video_url):
        video_id = self.__sha256str15(video_url)
        platform = urlparse(video_url).netloc
        
        day = datetime.date.today()
        return VideoData(
            id=video_id,
            url=video_url,
            platform=platform,
            title=video_id,
            s3path=f's3://{BACKUP_BACKET}/{platform}/{day.year}/{day.month}/{day.day}/',
            backupdate=str(day),
            backup_filename=video_id
        )
        
    def __sha256str15(self, url):
        hs = hashlib.sha256(url.encode()).hexdigest()
        return hs[0:15]

@dataclasses.dataclass
class VideoData():
    id: str
    url: str
    title: str
    platform: str
    s3path: str
    backup_filename: str
    backupdate: str
