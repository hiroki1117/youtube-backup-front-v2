FROM python:3.8-slim-buster

RUN pip install --no-cache-dir --upgrade pip \
    && pip install awscli==1.22.23

# pip install -r requirements.txtするためにコンテナ内に一般ユーザーを作成
ARG UID=1000
RUN useradd -m -u ${UID} worker
USER worker
WORKDIR /home/worker

COPY --chown=worker:worker requirements.txt requirements.txt
RUN pip3 install --user worker -r requirements.txt

ENV PATH="/home/worker/.local/bin:${PATH}"

COPY --chown=worker:worker . .
