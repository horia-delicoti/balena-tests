FROM node:9 AS npm-install

ENV npm_config_unsafe_perm=true

WORKDIR /tmp/node

COPY package.json .

RUN npm install

FROM node:9

ENV npm_config_unsafe_perm=true

RUN echo 'deb http://ftp.debian.org/debian jessie-backports main' >> /etc/apt/sources.list

# Avoid using a ssh agent by using GIT_SSH_COMMAND (requires git v2.10+)
RUN apt-get update && \
    apt-get install -y qemu-system-x86 qemu-kvm && \
    curl -sSL https://get.docker.com/ | sh && \
    apt-get install -y -t jessie-backports jq git vim rsync && \
    rm -rf /var/lib/apt/lists/*

RUN git config --global user.email "testbot@resin.io" && \
    git config --global user.name "Test Bot"

RUN npm install -g balena-cli

WORKDIR /usr/app

COPY --from=npm-install /tmp/node ./

COPY contracts contracts
COPY .eslintrc.yml ./

COPY lib lib
COPY tests tests
COPY entry.sh ./

# wrapper script which mounts cgroups pseudo-filesystems
ADD wrapdocker /usr/local/bin/wrapdocker
# /var/lib/docker cannot be on AUFS, so we make it a volume
VOLUME /var/lib/docker

CMD [ "./entry.sh" ]
