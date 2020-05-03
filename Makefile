TARBALL=koa-fp-ts-router-*.tgz

all:

build: clean install
	npx rollup -c
	rm lib/**/*.test.d.ts
	cp package.json README.md ./lib

clean:
	rm -rf ./lib
	rm -f $(TARBALL)

develop: install
	npx tsc --noEmit --watch

format: install
	npx prettier --write .

install:
	yarn install

publish: sdist
	yarn publish $(TARBALL)

sdist: build
	cd ./lib && yarn pack && mv $(TARBALL) ..

test: install
	npx jest --watch

test.all: install
	npx jest
