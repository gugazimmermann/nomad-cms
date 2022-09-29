import { CfnOutput } from "aws-cdk-lib";
import { LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";
import { DynamoDBConstruct } from "./dynamoDB";
import { LambdasConstruct } from "./lambdas";
import { RestApiConstruct } from "./restApi";

type RestaurantsMenuConstructProps = {
  stackName: string | undefined;
  stage: string;
};

export class MenuConstruct extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: RestaurantsMenuConstructProps
  ) {
    super(scope, id);

    // menu DynamoDB
    const { menuTable } = new DynamoDBConstruct(this, "menuDynamoDBConstruct", {
      stackName: props.stackName,
      stage: props.stage,
    });

    // menu RestApi
    const { menuIDResource } = new RestApiConstruct(
      this,
      "menuRestApiConstruct",
      {
        stackName: props.stackName,
        stage: props.stage,
      }
    );

    // menu Lambdas
    const { menuGet } = new LambdasConstruct(this, "menuLambdasConstruct", {
      stackName: props.stackName,
      stage: props.stage,
    });

    // define permissions, env and integrations
    menuTable.grantReadData(menuGet);
    menuGet.addEnvironment("TABLE_NAME", menuTable.tableName);
    const menuApiIntegration = new LambdaIntegration(menuGet);
    menuIDResource.addMethod("GET", menuApiIntegration);

    new CfnOutput(scope, "MenuTableOutput", {
      value: menuTable.tableName,
    });
  }
}
