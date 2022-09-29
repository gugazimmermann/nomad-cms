import { LambdaIntegration, Resource } from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { StartingPosition } from "aws-cdk-lib/aws-lambda";
import {
  NodejsFunctionProps,
  NodejsFunction,
} from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { DynamoEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import commonLambdaProps from "./common/commonLambdaProps";

type LambdasConstructProps = {
  ordersTable: Table;
  ordersConnTable: Table;
  ordersRestaurantIDResource: Resource;
  orderOrderIDResource: Resource;
  ordersLogsBucket: Bucket;
  stackName: string | undefined;
  stage: string;
};

export class LambdasConstruct extends Construct {
  public readonly ordersWebsocketConnect: NodejsFunction;
  public readonly ordersWebsocketDisconnect: NodejsFunction;
  public readonly ordersWebsocketMsg: NodejsFunction;
  public readonly orderValidate: NodejsFunction;
  public readonly ordersIncomming: NodejsFunction;
  public readonly ordersPaymentState: NodejsFunction;
  public readonly ordersProcess: NodejsFunction;
  public readonly ordersLambdaProps: NodejsFunctionProps;

  constructor(scope: Construct, id: string, props: LambdasConstructProps) {
    super(scope, id);

    // get all orders from a restaurant
    const ordersGetAll = new NodejsFunction(
      scope,
      `${props.stackName}-ordersGetAll-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-get-all.ts"),
        ...commonLambdaProps,
      }
    );
    ordersGetAll.addEnvironment("TABLE_NAME", props.ordersTable.tableName);
    props.ordersTable.grantReadData(ordersGetAll);
    const ordersGetAllIntegration = new LambdaIntegration(ordersGetAll);
    props.ordersRestaurantIDResource.addMethod("GET", ordersGetAllIntegration);

    // get one order from a restaurant
    const ordersGetOne = new NodejsFunction(
      scope,
      `${props.stackName}-ordersGetOne-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-get-one.ts"),
        ...commonLambdaProps,
      }
    );
    ordersGetOne.addEnvironment("TABLE_NAME", props.ordersTable.tableName);
    props.ordersTable.grantReadData(ordersGetOne);
    const ordersGetOneIntegration = new LambdaIntegration(ordersGetOne);
    props.orderOrderIDResource.addMethod("GET", ordersGetOneIntegration);

    // update a single order
    const ordersUpdate = new NodejsFunction(
      scope,
      `${props.stackName}-ordersUpdate-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-update.ts"),
        ...commonLambdaProps,
      }
    );
    ordersUpdate.addEnvironment("TABLE_NAME", props.ordersTable.tableName);
    props.ordersTable.grantWriteData(ordersUpdate);
    const ordersUpdateIntegration = new LambdaIntegration(ordersUpdate);
    props.ordersRestaurantIDResource.addMethod("PUT", ordersUpdateIntegration);

    // updates the status field of an order
    const ordersPatchStatus = new NodejsFunction(
      scope,
      `${props.stackName}-ordersPatchStatus-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-patch-status.ts"),
        ...commonLambdaProps,
      }
    );
    ordersPatchStatus.addEnvironment("TABLE_NAME", props.ordersTable.tableName);
    props.ordersTable.grantReadWriteData(ordersPatchStatus);
    const ordersUpdateStatusIntegration = new LambdaIntegration(
      ordersPatchStatus
    );
    props.ordersRestaurantIDResource.addMethod(
      "PATCH",
      ordersUpdateStatusIntegration
    );

    // delete an order
    const ordersDelete = new NodejsFunction(
      scope,
      `${props.stackName}-ordersDelete-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-delete.ts"),
        ...commonLambdaProps,
      }
    );
    ordersDelete.addEnvironment("TABLE_NAME", props.ordersTable.tableName);
    props.ordersTable.grantWriteData(ordersDelete);
    const ordersDeleteIntegration = new LambdaIntegration(ordersDelete);
    props.orderOrderIDResource.addMethod("DELETE", ordersDeleteIntegration);

    /**
     * all new order entries will be sent to an SQS Queue with DeadLetter,
     * and then will be sent to a StepFunction which will simulate payment.
     */
    this.orderValidate = new NodejsFunction(scope, `${props.stackName}-orderValidate-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-validate.ts"),
        ...commonLambdaProps,
      })
    props.ordersTable.grantReadData(this.orderValidate);
    this.orderValidate.addEnvironment("TABLE_NAME", props.ordersTable.tableName);
    const orderValidateIntegration = new LambdaIntegration(this.orderValidate);
    props.ordersRestaurantIDResource.addMethod("POST", orderValidateIntegration);

    this.ordersIncomming = new NodejsFunction(
      scope,
      `${props.stackName}-ordersIncomming-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-incomming.ts"),
        ...commonLambdaProps,
      }
    );
    props.ordersTable.grantReadData(this.ordersIncomming);

    /**
     * orders payment process - handled by StepFunction
     * Just to simulate the bank response
     * 60% Sucess
     * 20% Failure (will retry)
     * 20% Declined (will not be accpeted)
     */
    this.ordersPaymentState = new NodejsFunction(
      scope,
      `${props.stackName}-ordersPayment-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-payment.ts"),
        ...commonLambdaProps,
      }
    );

    /**
     * orders that have been accepted or declined for payment will be stored
     * in the database, and sent by transmission to the kitchen.
     *
     * They will also be stored in an S3 Bucket for logs (can be used with
     * Glue, Athena and QuickSight);
     */
    this.ordersProcess = new NodejsFunction(
      scope,
      `${props.stackName}-ordersProcess-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-process.ts"),
        ...commonLambdaProps,
      }
    );
    this.ordersProcess.addEnvironment(
      "TABLE_NAME",
      props.ordersTable.tableName
    );
    this.ordersProcess.addEnvironment(
      "ordersLogsBucketName",
      props.ordersLogsBucket.bucketName
    );
    props.ordersTable.grantWriteData(this.ordersProcess);
    props.ordersLogsBucket.grantWrite(this.ordersProcess);

    // connection to websocket
    this.ordersWebsocketConnect = new NodejsFunction(
      scope,
      `${props.stackName}-ordersWebsocketConnect-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-websocket-connect.ts"),
        ...commonLambdaProps,
      }
    );
    props.ordersConnTable.grantWriteData(this.ordersWebsocketConnect);
    this.ordersWebsocketConnect.addEnvironment(
      "TABLE_NAME",
      props.ordersConnTable.tableName
    );

    // remove connection to websocket
    this.ordersWebsocketDisconnect = new NodejsFunction(
      scope,
      `${props.stackName}-ordersWebsocketDisconnect-${props.stage}`,
      {
        entry: join(
          __dirname,
          "..",
          "lambdas",
          "orders-websocket-disconnect.ts"
        ),
        ...commonLambdaProps,
      }
    );
    props.ordersConnTable.grantWriteData(this.ordersWebsocketDisconnect);
    this.ordersWebsocketDisconnect.addEnvironment(
      "TABLE_NAME",
      props.ordersConnTable.tableName
    );

    // sending message via websocket
    this.ordersWebsocketMsg = new NodejsFunction(
      scope,
      `${props.stackName}-ordersWebsocketMsg-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-websocket-msg.ts"),
        ...commonLambdaProps,
      }
    );
    props.ordersConnTable.grantReadData(this.ordersWebsocketMsg);
    this.ordersWebsocketMsg.addEnvironment(
      "TABLE_NAME",
      props.ordersConnTable.tableName
    );
    this.ordersWebsocketMsg.addEventSource(
      new DynamoEventSource(props.ordersTable, {
        startingPosition: StartingPosition.TRIM_HORIZON,
      })
    );
  }
}
