import { LambdaIntegration, Resource } from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunctionProps, NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";

type LambdasConstructProps = {
  ordersTable: Table;
  ordersRestaurantIDResource: Resource,
  orderOrderIDResource: Resource
  stackName: string | undefined;
  stage: string;
}

export class LambdasConstruct extends Construct {
  public readonly ordersIncomming: NodejsFunction
  public readonly ordersPaymentState: NodejsFunction
  public readonly ordersProcess: NodejsFunction

  constructor(scope: Construct, id: string, props: LambdasConstructProps) {
    super(scope, id);

    // common Lambda props
    const ordersLambdaProps: NodejsFunctionProps = {
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ["aws-sdk"],
      },
      depsLockFilePath: join(__dirname, "..", "lambdas", "package-lock.json"),
      environment: {
        TABLE_NAME: props.ordersTable.tableName,
        NODE_OPTIONS: "--enable-source-maps",
      },
      runtime: Runtime.NODEJS_14_X,
    };

    // orders get all
    const ordersGetAll = new NodejsFunction(
      scope,
      `${props.stackName}-ordersGetAll-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-get-all.ts"),
        ...ordersLambdaProps,
      }
    );
    props.ordersTable.grantReadData(ordersGetAll);
    const ordersGetAllIntegration = new LambdaIntegration(ordersGetAll);
    props.ordersRestaurantIDResource.addMethod("GET", ordersGetAllIntegration);

    // orders get one
    const ordersGetOne = new NodejsFunction(
      scope,
      `${props.stackName}-ordersGetOne-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-get-one.ts"),
        ...ordersLambdaProps,
      }
    );
    props.ordersTable.grantReadData(ordersGetOne);
    const ordersGetOneIntegration = new LambdaIntegration(ordersGetOne);
    props.orderOrderIDResource.addMethod("GET", ordersGetOneIntegration);

    // orders update
    const ordersUpdate = new NodejsFunction(
      scope,
      `${props.stackName}-ordersUpdate-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-update.ts"),
        ...ordersLambdaProps,
      }
    );
    props.ordersTable.grantWriteData(ordersUpdate);
    const ordersUpdateIntegration = new LambdaIntegration(ordersUpdate);
    props.ordersRestaurantIDResource.addMethod("PUT", ordersUpdateIntegration);

    // orders patch status
    const ordersPatchStatus = new NodejsFunction(
      scope,
      `${props.stackName}-ordersPatchStatus-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-patch-status.ts"),
        ...ordersLambdaProps,
      }
    );
    props.ordersTable.grantReadWriteData(ordersPatchStatus);
    const ordersUpdateStatusIntegration = new LambdaIntegration(
      ordersPatchStatus
    );
    props.ordersRestaurantIDResource.addMethod(
      "PATCH",
      ordersUpdateStatusIntegration
    );

    // orders delete
    const ordersDelete = new NodejsFunction(
      scope,
      `${props.stackName}-ordersDelete-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-delete.ts"),
        ...ordersLambdaProps,
      }
    );
    props.ordersTable.grantWriteData(ordersDelete);
    const ordersDeleteIntegration = new LambdaIntegration(ordersDelete);
    props.orderOrderIDResource.addMethod("DELETE", ordersDeleteIntegration);

    // orders incomming
    this.ordersIncomming = new NodejsFunction(
      scope,
      `${props.stackName}-ordersIncomming-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-incomming.ts"),
        ...ordersLambdaProps,
      }
    );
    props.ordersTable.grantReadData(this.ordersIncomming);

    // orders payment process
    this.ordersPaymentState = new NodejsFunction(
      scope,
      `${props.stackName}-ordersPayment-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-payment.ts"),
        ...ordersLambdaProps,
      }
    );

    // orders process
    this.ordersProcess = new NodejsFunction(
      scope,
      `${props.stackName}-ordersProcess-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-process.ts"),
        ...ordersLambdaProps,
      }
    );
    props.ordersTable.grantWriteData(this.ordersProcess);

  }
}
