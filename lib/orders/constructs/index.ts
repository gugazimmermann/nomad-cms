import { RemovalPolicy, CfnOutput } from "aws-cdk-lib";
import { RestApi, Cors, LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { Table, AttributeType, BillingMode, ProjectionType } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunctionProps, NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";
import { DynamoDBConstruct } from './dynamoDB';
import { RestApiConstruct } from "./RestApi";

type OrdersConstructProps = {
  stackName: string | undefined;
  stage: string;
}

export class OrdersConstruct extends Construct {
  constructor(scope: Construct, id: string, props: OrdersConstructProps) {
    super(scope, id);

    // orders table
    const { ordersTable } = new DynamoDBConstruct(this, 'ordersTableConstruct', { stackName: props.stackName, stage: props.stage });
    
    // orders api
    const { ordersRestaurantIDResource, orderOrderIDResource } = new RestApiConstruct(this, 'ordersApiConstruct', { stackName: props.stackName, stage: props.stage });

    // common lambda props
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
    const ordersCreateIntegration = new LambdaIntegration(ordersCreate);
    ordersRestaurantIDResource.addMethod('POST', ordersCreateIntegration);

    // orders UPDATE
    const ordersUpdate = new NodejsFunction(scope, `${props.stackName}-ordersUpdate-${props.stage}`, {
      entry: join(__dirname, '..', 'lambdas', 'orders-update.ts'),
      ...ordersLambdaProps,
    });
    ordersTable.grantWriteData(ordersUpdate);
    const ordersUpdateIntegration = new LambdaIntegration(ordersUpdate);
    ordersRestaurantIDResource.addMethod('PUT', ordersUpdateIntegration);

    // orders UPDATE STATUS
    const ordersUpdateStatus = new NodejsFunction(scope, `${props.stackName}-ordersUpdateStatus-${props.stage}`, {
      entry: join(__dirname, '..', 'lambdas', 'orders-update-status.ts'),
      ...ordersLambdaProps,
    });
    ordersTable.grantReadWriteData(ordersUpdateStatus);
    const ordersUpdateStatusIntegration = new LambdaIntegration(ordersUpdateStatus);
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
