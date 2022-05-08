import { Stack, StackProps,RemovalPolicy, Duration , CfnOutput} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications'
import * as lambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import {SqsEventSource} from 'aws-cdk-lib/aws-lambda-event-sources';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as sns from 'aws-cdk-lib/aws-sns';

const SES_REGION = process.env.CDK_DEFAULT_REGION;
const SES_EMAIL_FROM = process.env.EMAIL_FROM;

export class EverydaySlidingStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);


    const dlq = new sqs.Queue(this, 'MyDLQ', {
      queueName: 'dlq',
      retentionPeriod: Duration.days(7),
      deliveryDelay: Duration.millis(0),
    })

    const queue = new sqs.Queue(this, 'MyQueue', {
      queueName: 'queue',
      visibilityTimeout: Duration.seconds(300),
      deadLetterQueue: {
        maxReceiveCount: 1, 
        queue: dlq
      }
    });

    const topic = new sns.Topic(this, 'MyTopic')

    topic.addSubscription(new subscriptions.SqsSubscription(queue))

    const bucket = new s3.Bucket(this, 'MyBucket', {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      blockPublicAccess:s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          enabled: true,
          expiration: Duration.days(365),
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter:Duration.days(30)
            }, 
            {
              storageClass:s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(90)
            }
          ]
        }
      ]
    });

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED_PUT,
      new s3n.SnsDestination(topic),
      {
        suffix: '.txt',
      }
    )

    const fn = new lambda.NodejsFunction(this, 'MyFn', {
      entry: './src/index.ts',
      environment: {
        BUCKET_NAME: bucket.bucketName,
      },
    });

    bucket.grantReadWrite(fn)

    const invokeEventSource = new SqsEventSource(queue)
    fn.addEventSource(invokeEventSource)

    fn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'ses:SendEmail',
          'ses:SendRawEmail',
          'ses:SendTemplatedEmail',
        ],
        resources: [
          `arn:aws:ses:${SES_REGION}:${
            Stack.of(this).account
          }:identity/${SES_EMAIL_FROM}`,
        ],
      }),
    );

    new CfnOutput(this, 'UploadEmailS3', {
      value:  `aws s3 cp <local-path-to-file> s3://${bucket.bucketName}/`
    })
  }
}
