build:
	rm -rf web/images
	cp -a images web/images
	# https://github.com/jhunt/go-runbook
	runbook -i tpl/index.tpl -t tpl/topic.tpl -r web toc.yml

local: build
	# https://github.com/jhunt/gow
	gow -r web

deploy: build
	cf push
