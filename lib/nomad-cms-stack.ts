import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { MenuConstruct } from './menu/constructs';
import { OrdersConstruct } from './orders/constructs';

export interface NomadCmsStackProps extends cdk.StackProps {
  stage: string;
}

export class NomadCmsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: NomadCmsStackProps) {
    super(scope, id, props);

    const {stackName, stage } = props;

    /**
     * Restaurants Menu API
     * 
     * Different Construct because we want to simulate a different backend
     */
    new MenuConstruct(this, `${props.stackName}-menu-${props.stage}`, { stackName, stage });

    /**
     * Orders API
     * 
     * Different Construct because we want to simulate a different backend
     */
     new OrdersConstruct(this, `${props.stackName}-orders-${props.stage}`, { stackName, stage });
  }
}

