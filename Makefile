build:
	$(MAKE) -C lib/restaurants-menu/lambdas build
	$(MAKE) -C lib/orders/lambdas build
	npm i
	npm run build

clean:
	$(MAKE) -C lib/restaurants-menu/lambdas clean
	$(MAKE) -C lib/orders/lambdas clean
	rm -rf cdk.out
	rm -rf node_modules

diff:
	$(MAKE) build
	cdk diff

synth:
	$(MAKE) build
	cdk synth

deploy:
	$(MAKE) build
	cdk deploy

destroy:
	cdk destroy
	$(MAKE) clean