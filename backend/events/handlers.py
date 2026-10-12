from api.dependencies import get_service
from repositories.scrapbox import ScrapboxRepository


def s3_complete(event, context):
    return get_service().complete_records(event)


def retry(event, context):
    return get_service().retry_failed()


def scan_scrapbox(service, source):
    started = existing = 0
    for url in source.video_urls():
        _, created = service.register(url)
        started += int(created)
        existing += int(not created)
    return {"started": started, "existing": existing}


def scrapbox_scan(event, context):
    return scan_scrapbox(get_service(), ScrapboxRepository())
