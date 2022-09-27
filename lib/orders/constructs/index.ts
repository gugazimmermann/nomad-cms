import { LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunctionProps, NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";
import { DynamoDBConstruct } from './dynamoDB';
import { RestApiConstruct } from "./RestApi";
import { SQSConstruct } from "./SQS";

type OrdersConstructProps = {
  stackName: string | undefined;
  stage: string;
}

export class OrdersConstruct extends Construct {
  constructor(scope: Construct, id: string, props: OrdersConstructProps) {
    super(scope, id);

    // orders DynamoDB
    const { ordersTable } = new DynamoDBConstruct(this, 'ordersDynamoDBConstruct', { stackName: props.stackName, stage: props.stage });

    // orders RestApi
    const { ordersApi, ordersRestaurantIDResource, orderOrderIDResource } = new RestApiConstruct(this, 'ordersRestApiConstruct', { stackName: props.stackName, stage: props.stage });

    // common Lambda props
    const ordersLambdaProps: NodejsFunctionProps = {
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk'],
      },
      depsLockFilePath: join(__dirname, '..', 'lambdas', 'package-lock.json'),
      environment: {
        TABLE_NAME: ordersTable.tableName,
        NODE_OPTIONS: '--enable-source-maps',
      },
      runtime: Runtime.NODEJS_14_X,
    }

    // orders GET ALL
    const ordersGetAll = new NodejsFunction(scope, `${props.stackName}-ordersGetAll-${props.stage}`, {
      entry: join(__dirname, '..', 'lambdas', 'orders-get-all.ts'),
      ...ordersLambdaProps,
    });
    ordersTable.grantReadData(ordersGetAll);
    const ordersGetAllIntegration = new LambdaIntegration(ordersGetAll);
    ordersRestaurantIDResource.addMethod('GET', ordersGetAllIntegration);

    // orders GET ONE
    const ordersGetOne = new NodejsFunction(scope, `${props.stackName}-ordersGetOne-${props.stage}`, {
      entry: join(__dirname, '..', 'lambdas', 'orders-get-one.ts'),
      ...ordersLambdaProps,
    });
    ordersTable.grantReadData(ordersGetOne);
    const ordersGetOneIntegration = new LambdaIntegration(ordersGetOne);
    orderOrderIDResource.addMethod('GET', ordersGetOneIntegration);

    // orders CREATE
    const ordersCreate = new NodejsFunction(scope, `${props.stackName}-ordersCreate-${props.stage}`, {
      entry: join(__dirname, '..', 'lambdas', 'orders-create.ts'),
      ...ordersLambdaProps,
    });
    ordersTable.grantReadWriteData(ordersCreate);

    /**
     * orders CREATE SQS
     */
    const { ordersPostQueue } = new SQSConstruct(this, 'ordersSQSConstruct', { ordersApi, stackName: props.stackName, stage: props.stage });
    ordersCreate.addEventSource(new SqsEventSource(ordersPostQueue));


    // orders UPDATE
    const ordersUpdate = new NodejsFunction(scope, `${props.stackName}-ordersUpdate-${props.stage}`, {
      entry: join(__dirname, '..', 'lambdas', 'orders-update.ts'),
      ...ordersLambdaProps,
    });
    ordersTable.grantWriteData(ordersUpdate);
    const ordersUpdateIntegration = new LambdaIntegration(ordersUpdate);
    ordersRestaurantIDResource.addMethod('PUT', ordersUpdateIntegration);

    // orders PATCH STATUS
    const ordersPatchStatus = new NodejsFunction(scope, `${props.stackName}-ordersPatchStatus-${props.stage}`, {
      entry: join(__dirname, '..', 'lambdas', 'orders-patch-status.ts'),
      ...ordersLambdaProps,
    });
    ordersTable.grantReadWriteData(ordersPatchStatus);
    const ordersUpdateStatusIntegration = new LambdaIntegration(ordersPatchStatus);
    ordersRestaurantIDResource.addMethod('PATCH', ordersUpdateStatusIntegration);

    // orders DELETE
    const ordersDelete = new NodejsFunction(scope, `${props.stackName}-ordersDelete-${props.stage}`, {
      entry: join(__dirname, '..', 'lambdas', 'orders-delete.ts'),
      ...ordersLambdaProps,
    });
    ordersTable.grantWriteData(ordersDelete);
    const ordersDeleteIntegration = new LambdaIntegration(ordersDelete);
    orderOrderIDResource.addMethod('DELETE', ordersDeleteIntegration);
  }
}
