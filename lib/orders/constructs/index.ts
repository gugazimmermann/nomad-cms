import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { Construct } from "constructs";
import { DynamoDBConstruct } from "./dynamoDB";
import { RestApiConstruct } from "./restApi";
import { SQSConstruct } from "./sqs";
import { StepFunctionsConstruct } from "./stepFunctions";
import { LambdasConstruct } from "./lambdas";

type OrdersConstructProps = {
  stackName: string | undefined;
  stage: string;
};

export class OrdersConstruct extends Construct {
  constructor(scope: Construct, id: string, props: OrdersConstructProps) {
    super(scope, id);

    // orders DynamoDB
    const { ordersTable } = new DynamoDBConstruct(
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

    // orders Lambdas
    const { ordersIncomming, ordersPaymentState, ordersProcess } =
      new LambdasConstruct(this, "ordersLambdasConstruct", {
        ordersTable,
        ordersRestaurantIDResource,
        orderOrderIDResource,
        stackName: props.stackName,
        stage: props.stage,
      });

    /**
     * orders incomming SQS
     *
     * Incomming of orders will be handled in a Queue
     */
    const { ordersIncommingQueue } = new SQSConstruct(
      this,
      "ordersIncommingSQSConstruct",
      { ordersApi, stackName: props.stackName, stage: props.stage }
    );
    ordersIncomming.addEventSource(new SqsEventSource(ordersIncommingQueue));

    /**
     * To simulate the bank call to payment, we will use Step Functions
     * 
     * Simulate the bank respose in a simple way
     * 60% Sucess
     * 20% Failure (will retry)
     * 20% Declined (will not be accpeted)
    */
    const { paymentStep } = new StepFunctionsConstruct(
      this,
      "ordersPaymentProcessStepFunctionsConstruct",
      {
        ordersPaymentState,
        ordersProcess,
        stackName: props.stackName,
        stage: props.stage,
      }
    );
    paymentStep.grantStartExecution(ordersIncomming);
    ordersIncomming.addEnvironment("paymentStepArn", paymentStep.stateMachineArn);
  }
}
