#!/bin/sh
set -e

yarn install --frozen-lockfile --production
exec yarn run start
