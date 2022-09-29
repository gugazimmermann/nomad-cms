import { RestApi, Cors, Resource } from "aws-cdk-lib/aws-apigateway";
import { Construct } from "constructs";

type RestApiConstructProps = {
  stackName: string | undefined;
  stage: string;
};

export class RestApiConstruct extends Construct {
  public readonly menuIDResource: Resource;

  constructor(scope: Construct, id: string, props: RestApiConstructProps) {
    super(scope, id);

    const menuApi = new RestApi(
      scope,
      `${props.stackName}-menuRestApi-${props.stage}`,
      {
        deployOptions: { stageName: props.stage },
        defaultCorsPreflightOptions: { allowOrigins: Cors.ALL_ORIGINS },
      }
    );
    const restaurantIDResource = menuApi.root.addResource(`{restaurantID}`);
    this.menuIDResource = restaurantIDResource.addResource(`{menuID}`);
  }
}
