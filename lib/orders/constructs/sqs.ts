import { RestApi } from "aws-cdk-lib/aws-apigateway";
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

    //sqs to receive the orders
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
  }
}
