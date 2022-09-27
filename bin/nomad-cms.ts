#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import * as dotenv from 'dotenv';
import { NomadCmsStack } from '../lib/nomad-cms-stack';

dotenv.config();

const STAGE = process.env.STAGE || 'dev';
const PROJECT = process.env.PROJECT || 'nomadcms';

const app = new cdk.App();
new NomadCmsStack(app, 'NomadCmsStack',  {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  stackName: PROJECT,
  description: `${PROJECT} Sample Project`,
  tags: { project: PROJECT, stage: STAGE },
  stage: STAGE,
});