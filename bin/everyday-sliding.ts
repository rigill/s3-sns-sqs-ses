#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EverydaySlidingStack } from '../lib/everyday-sliding-stack';
import {execSync} from 'child_process'
import * as pkg from '../package.json'

const branch = execSync('git rev-parse --abbrev-ref HEAD').toString().trim();
const version = pkg.version.replace(/\./g, '');
const stackName = `${pkg.name}-${version}-${branch}`;

const app = new cdk.App();

new EverydaySlidingStack(app, 'EverydaySlidingStack', {
  stackName,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  }
});
