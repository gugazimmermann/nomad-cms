import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";
import commonLambdaProps from "./common/commonLambdaProps";

type LambdasConstructProps = {
  stackName: string | undefined;
  stage: string;
};

export class LambdasConstruct extends Construct {
  public readonly menuGet: NodejsFunction;

  constructor(scope: Construct, id: string, props: LambdasConstructProps) {
    super(scope, id);

    this.menuGet = new NodejsFunction(
      scope,
      `${props.stackName}-menuGet-${props.stage}`,
      {
        entry: join(__dirname, "..", "lambdas", "menu-get.ts"),
        ...commonLambdaProps,
      }
    );
  }
}
