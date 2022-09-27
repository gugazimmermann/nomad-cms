import { AwsIntegration, RestApi } from "aws-cdk-lib/aws-apigateway";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";

type SQSConstructProps = {
  stackName: string | undefined;
  stage: string;
  ordersApi: RestApi;
}

export class SQSConstruct extends Construct {
  public readonly ordersPostQueue: Queue;

  constructor(scope: Construct, id: string, props: SQSConstructProps) {
    super(scope, id);

    const ordersPostDeadLetterQueue = new Queue(this, 'ordersPostDeadLetterQueue');
    this.ordersPostQueue = new Queue(this, 'ordersPostQueue', {
      deadLetterQueue: {
        queue: ordersPostDeadLetterQueue,
        maxReceiveCount: 5
      }
    })
    const ordersIntegrationRole = new Role(this, 'ordersIntegrationRole', {
      assumedBy: new ServicePrincipal('apigateway.amazonaws.com'),
    });
    this.ordersPostQueue.grantSendMessages(ordersIntegrationRole);
    const ordersPostIntegration = new AwsIntegration({
      service: 'sqs',
      path: `${process.env.CDK_DEFAULT_ACCOUNT}/${this.ordersPostQueue.queueName}`,
      integrationHttpMethod: 'POST',
      options: {
        credentialsRole: ordersIntegrationRole,
        requestParameters: { 'integration.request.header.Content-Type': `'application/x-www-form-urlencoded'` },
        requestTemplates: { 'application/json': 'Action=SendMessage&MessageBody=$input.body' },
        integrationResponses: [{ statusCode: '200' }, { statusCode: '400' }, { statusCode: '500' }]
      },
    });
    props.ordersApi.root.addMethod('POST', ordersPostIntegration, {
      methodResponses: [{ statusCode: '400' }, { statusCode: '200' }, { statusCode: '500' }]
    });
  }
}
