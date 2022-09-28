import { Duration } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Wait, WaitTime, Fail, Choice, Condition, StateMachine } from "aws-cdk-lib/aws-stepfunctions";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { Construct } from "constructs";

type StepFunctionsConstructProps = {
  ordersPaymentState: NodejsFunction;
  ordersProcess: NodejsFunction
  stackName: string | undefined;
  stage: string;
}

export class StepFunctionsConstruct extends Construct {
  public readonly ordersPaymentStep: StateMachine;

  constructor(scope: Construct, id: string, props: StepFunctionsConstructProps) {
    super(scope, id);

    const wait3Secs = new Wait(this, 'Simulate Waiting 3 Seconds', {
      time: WaitTime.duration(Duration.seconds(3))
    });

    const ordersPayment = new LambdaInvoke(this, 'Process Payment', {
      lambdaFunction: props.ordersPaymentState,
      outputPath: '$.Payload'
    });
    
    const ordersProcess = new LambdaInvoke(this, 'Process Order', {
      lambdaFunction: props.ordersProcess,
    });
    
    const definition = ordersPayment
      .next(wait3Secs)
      .next(new Choice(this, 'Payment Succeeded?')
        .when(Condition.stringEquals('$.body.status', 'payment_declined'), ordersProcess)
        .when(Condition.stringEquals('$.body.status', 'payment_success'), ordersProcess)
        .otherwise(wait3Secs));
    
    this.ordersPaymentStep = new StateMachine(this, `${props.stackName}-ordersPaymentStep-${props.stage}`, {
      definition,
      timeout: Duration.seconds(30),
    });
  }
}
