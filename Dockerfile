FROM node:lts-alpine
MAINTAINER MooYeol Prescott Lee "mooyoul@gmail.com"

LABEL com.github.actions.name="TSLint checks"
LABEL com.github.actions.description="GitHub action that lints your code with TSLint (with Annotation support)"
LABEL com.github.actions.icon="code"
LABEL com.github.actions.color="blue"

LABEL maintainer="MooYeol Prescott Lee <mooyoul@gmail.com>"

COPY entrypoint.sh package.json package-lock.json index.js /var/task/

RUN npm ci --production

ENTRYPOINT ["/var/task/entrypoint.sh"]
