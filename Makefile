SHELL = /usr/bin/env bash -xeuo pipefail

stack_name:=api-gw-lambda-load-test-001-03-ts-max-1000-non-provisioned

build:
	npx tsc index.ts
	zip package.zip index.js

deploy:
	aws cloudformation package \
		--template-file sam.yml \
		--s3-bucket $$SAM_ARTIFACT_BUCKET \
		--output-template-file template.yml
	aws cloudformation deploy \
		--stack-name $(stack_name) \
		--template-file ./template.yml \
		--capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
		--role-arn $$CLOUDFORMATION_DEPLOY_ROLE_ARN \
		--no-fail-on-empty-changeset
	aws cloudformation describe-stacks \
		--stack-name $(stack_name) \
		--query Stacks[0].Outputs

prepare-dynamodb:
	STACK_NAME=$(stack_name) \
	poetry run python scripts/put_items.py

.PHONY: \
	deploy \
	prepare-dynamodb
