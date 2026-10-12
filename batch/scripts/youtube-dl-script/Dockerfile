FROM python:3.8-slim-buster

RUN pip install --no-cache-dir --upgrade pip \
    && pip install youtube_dl==2021.12.17 \
    && pip install awscli==1.22.23

RUN apt-get update \
    && apt-get install -y ffmpeg

WORKDIR /work

COPY ./main.sh /work

RUN chmod 111 main.sh