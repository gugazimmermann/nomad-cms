import { AwsIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

type SQSConstructProps = {
  stackName: string | undefined;
  stage: string;
  ordersApi: RestApi;
};

export class SQSConstruct extends Construct {
  public readonly ordersIncommingQueue: Queue;

  constructor(scope: Construct, id: string, props: SQSConstructProps) {
    super(scope, id);

    const status = [
      { statusCode: "200" },
      { statusCode: "400" },
      { statusCode: "500" },
    ];

    const ordersIncommingDeadLetterQueue = new Queue(
      this,
      "ordersIncommingDeadLetterQueue"
    );
    this.ordersIncommingQueue = new Queue(this, "ordersIncommingQueue", {
      deadLetterQueue: {
        queue: ordersIncommingDeadLetterQueue,
        maxReceiveCount: 5,
      },
    });
    const ordersIncommingQueueIntegrationRole = new Role(this, "ordersIncommingQueueIntegrationRole", {
      assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
    });
    this.ordersIncommingQueue.grantSendMessages(ordersIncommingQueueIntegrationRole);
    const ordersIncommingIntegration = new AwsIntegration({
      service: "sqs",
      path: `${process.env.CDK_DEFAULT_ACCOUNT}/${this.ordersIncommingQueue.queueName}`,
      integrationHttpMethod: "POST",
      options: {
        credentialsRole: ordersIncommingQueueIntegrationRole,
        requestParameters: {
          "integration.request.header.Content-Type": `'application/x-www-form-urlencoded'`,
        },
        requestTemplates: {
          "application/json": "Action=SendMessage&MessageBody=$input.body",
        },
        integrationResponses: status,
      },
    });
    props.ordersApi.root.addMethod("POST", ordersIncommingIntegration, {
      methodResponses: status,
    });
  }
}
