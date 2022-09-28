import { LambdaIntegration, Resource } from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunctionProps, NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";
import { Bucket } from 'aws-cdk-lib/aws-s3';

type LambdasConstructProps = {
  ordersTable: Table;
  ordersRestaurantIDResource: Resource;
  orderOrderIDResource: Resource;
  ordersLogsBucket: Bucket;
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

    /**
     * All incomming order will be from a SQS Queue
     * and then pass to Step Function to handle the Payment
     */
    this.ordersIncomming = new NodejsFunction(
      scope,
      `${props.stackName}-ordersIncomming-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-incomming.ts"),
        ...ordersLambdaProps,
      }
    );
    props.ordersTable.grantReadData(this.ordersIncomming);

    /**
     * orders payment process - handled by the Step Function
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
        ...ordersLambdaProps,
      }
    );

    /**
     * After the payment response will send to the database
     * as waiting if the payment is ok, or as payment_declined
     * 
     * it's will also save the order in a S3 bucket to be used
     * as log in the future, with glue, athena and quicksight.
     */
    this.ordersProcess = new NodejsFunction(
      scope,
      `${props.stackName}-ordersProcess-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "orders-process.ts"),
        ...ordersLambdaProps,
      }
    );
    props.ordersTable.grantWriteData(this.ordersProcess);
    props.ordersLogsBucket.grantWrite(this.ordersProcess);
    this.ordersProcess.addEnvironment('ordersLogsBucketName', props.ordersLogsBucket.bucketName)
  }
}
