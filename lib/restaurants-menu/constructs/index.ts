import { RemovalPolicy, CfnOutput } from "aws-cdk-lib";
import { RestApi, Cors, LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { Table, AttributeType, BillingMode, ProjectionType } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunctionProps, NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { join } from "path";

type RestaurantsMenuConstructProps = {
  stackName: string | undefined;
  stage: string;
}

export class RestaurantsMenuConstruct extends Construct {
  constructor(scope: Construct, id: string, props: RestaurantsMenuConstructProps) {
    super(scope, id);

    const restaurantMenuTable = new Table(scope, `${props.stackName}-restaurantMenuTable-${props.stage}`, {
      partitionKey: { name: 'id', type: AttributeType.STRING },
      sortKey: { name: 'restaurantID', type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
    });
    restaurantMenuTable.addGlobalSecondaryIndex({
      indexName: 'byMenuID',
      partitionKey: { name: 'menuID', type: AttributeType.STRING },
      sortKey: { name: 'restaurantID', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });
    const restaurantMenuLambdaProps: NodejsFunctionProps = {
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk'],
      },
      depsLockFilePath: join(__dirname, '..', 'lambdas', 'package-lock.json'),
      environment: {
        TABLE_NAME: restaurantMenuTable.tableName,
        NODE_OPTIONS: '--enable-source-maps',
      },
      runtime: Runtime.NODEJS_14_X,
    }

    const restaurantMenuGet = new NodejsFunction(scope, `${props.stackName}-restaurantMenuGet-${props.stage}`, {
      entry: join(__dirname, '..', 'lambdas', 'restaurant-menu-get.ts'),
      ...restaurantMenuLambdaProps,
    });
    restaurantMenuTable.grantReadData(restaurantMenuGet);
    

    const restaurantMenuApi = new RestApi(scope, `${props.stackName}-restaurantMenuApi-${props.stage}`, {
      deployOptions: {
        stageName: props.stage,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS
      }
    });
    const restaurantMenuApiIntegration = new LambdaIntegration(restaurantMenuGet);
    const restaurantMenuRestaurantIDResource = restaurantMenuApi.root.addResource(`{restaurantID}`);
    const restaurantMenuMenuIDResource = restaurantMenuRestaurantIDResource.addResource(`{menuID}`);
    restaurantMenuMenuIDResource.addMethod('GET', restaurantMenuApiIntegration);

    new CfnOutput(scope, 'RestaurantsMenuTableOutput', {
      value: restaurantMenuTable.tableName,
    });
  }
}
