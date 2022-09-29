import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Construct } from "constructs";
import { DynamoDBConstruct } from "./dynamoDB";
import { RestApiConstruct } from "./restApi";
import { SQSConstruct } from "./sqs";
import { StepFunctionsConstruct } from "./stepFunctions";
import { LambdasConstruct } from "./lambdas";
import { CfnOutput } from "aws-cdk-lib";
import { s3Construct } from "./s3";
import { WebsocketConstruct } from "./websocket";

type OrdersConstructProps = {
  stackName: string | undefined;
  stage: string;
};

export class OrdersConstruct extends Construct {
  constructor(scope: Construct, id: string, props: OrdersConstructProps) {
    super(scope, id);

    // orders DynamoDB
    const { ordersTable, ordersConnTable } = new DynamoDBConstruct(
      this,
      "ordersDynamoDBConstruct",
      {
        stackName: props.stackName,
        stage: props.stage,
      }
    );

    // orders RestApi
    const { ordersApi, ordersRestaurantIDResource, orderOrderIDResource } =
      new RestApiConstruct(this, "ordersRestApiConstruct", {
        stackName: props.stackName,
        stage: props.stage,
      });

    // orders logs Bucket
    const { ordersLogsBucket } = new s3Construct(this, "ordersLogsBucket", {
      stackName: props.stackName,
      stage: props.stage,
    });

    // orders lambdas
    const {
      ordersWebsocketConnect,
      ordersWebsocketDisconnect,
      ordersWebsocketMsg,
      ordersIncomming,
      ordersPaymentState,
      ordersProcess,
    } = new LambdasConstruct(this, "ordersLambdasConstruct", {
      ordersTable,
      ordersConnTable,
      ordersRestaurantIDResource,
      orderOrderIDResource,
      ordersLogsBucket,
      stackName: props.stackName,
      stage: props.stage,
    });

    // orders websocket
    const { ordersWebsocket } = new WebsocketConstruct(
      this,
      "ordersWebsocket",
      {
        ordersWebsocketConnect,
        ordersWebsocketDisconnect,
        stackName: props.stackName,
        stage: props.stage,
      }
    );
    ordersWebsocketMsg.addEnvironment(
      "WEBSOCKET_ENDPOINT",
      ordersWebsocket.apiEndpoint
    );
    ordersWebsocket.grantManageConnections(ordersWebsocketMsg);

    // orders SQS
    const { ordersIncommingQueue } = new SQSConstruct(
      this,
      "ordersIncommingSQSConstruct",
      { ordersApi, stackName: props.stackName, stage: props.stage }
    );
    ordersIncomming.addEventSource(new SqsEventSource(ordersIncommingQueue));

    // orders StepFunctions
    const { ordersPaymentStep } = new StepFunctionsConstruct(
      this,
      "ordersPaymentProcessStepFunctionsConstruct",
      {
        ordersPaymentState,
        ordersProcess,
        stackName: props.stackName,
        stage: props.stage,
      }
    );
    ordersPaymentStep.grantStartExecution(ordersIncomming);
    ordersIncomming.addEnvironment(
      "ordersPaymentStepArn",
      ordersPaymentStep.stateMachineArn
    );

    new CfnOutput(scope, "OrdersTableOutput", {
      value: ordersTable.tableName,
    });
    new CfnOutput(scope, "ordersLogsBucketOutput", {
      value: ordersLogsBucket.bucketName,
    });
    new CfnOutput(scope, "ordersWebsocketOutput", {
      value: `${ordersWebsocket.apiEndpoint}/${props.stage}`,
    });

    ordersWebsocket;
  }
}
