const { awscdk } = require('projen');
const { ApprovalLevel } = require('projen/lib/awscdk');
const project = new awscdk.AwsCdkTypeScriptApp({
  license: 'MIT-0',
  copyrightOwner: 'Amazon.com, Inc. or its affiliates. All Rights Reserved.',
  copyrightPeriod: '',
  requireApproval: ApprovalLevel.NEVER,
  cdkVersion: '2.28.1',
  defaultReleaseBranch: 'main',
  name: 'sample-kong-app',
  deps: [
    'aws-cdk-lib',
    'constructs@^10.1.45',
    'kong-control-plane@^3.0.0-dev.0',
    'kong-data-plane@^3.0.0-dev.0',
  ],
  jest: false,
  gitignore: [
    'cdk.context.json',
    '.eslintec.json',
    'cdk.json',
    'package-lock.json',
    'package.json',
    'tsconfig.dev.json',
    'tsconfig.json',
    'yarn.lock',
  ],

  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  // devDeps: [],             /* Build dependencies for this module. */
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();