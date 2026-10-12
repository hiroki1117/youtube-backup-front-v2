FROM nvidia/cuda:12.0.0-runtime-ubuntu20.04

RUN apt-get -y update
RUN DEBIAN_FRONTEND=noninteractive apt-get -y install \
        python3-pip \
        python3-setuptools \
        ffmpeg \
        git \
        curl \
        unzip \
    && rm -rf /var/lib/apt/lists/*

RUN pip --no-cache-dir install git+https://github.com/openai/whisper.git setuptools-rust

RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
        && unzip awscliv2.zip \
        && ./aws/install

ENV PYTHONUNBUFFERED=TRUE
ENV PYTHONDONTWRITEBYTECODE=TRUE

WORKDIR /work

COPY ./main.sh /work

RUN chmod 111 main.sh