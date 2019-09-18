#!/bin/sh -l

set -e

NODE_PATH=/var/task/node_modules npx ts-node /var/task/index.ts
