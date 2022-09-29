build:
	$(MAKE) -C lib/menu/lambdas build
	$(MAKE) -C lib/orders/lambdas build
	npm i
	npm run build

clean:
	$(MAKE) -C lib/menu/lambdas clean
	$(MAKE) -C lib/orders/lambdas clean
	rm -rf cdk.out
	rm -rf node_modules

diff:
	cdk diff

synth:
	cdk synth

deploy:
	cdk deploy

destroy:
	cdk destroy
	$(MAKE) clean