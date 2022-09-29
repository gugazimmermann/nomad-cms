import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunctionProps } from "aws-cdk-lib/aws-lambda-nodejs";
import { join } from "path";

const commonLambdaProps: NodejsFunctionProps = {
  bundling: {
    minify: true,
    sourceMap: true,
    externalModules: ["aws-sdk"],
  },
  depsLockFilePath: join(__dirname, "..", "..", "lambdas", "package-lock.json"),
  environment: { NODE_OPTIONS: "--enable-source-maps" },
  runtime: Runtime.NODEJS_14_X,
};

export default commonLambdaProps;
