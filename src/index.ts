import {SES} from '@aws-sdk/client-ses'
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"; // ES Modules import
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
} from 'aws-lambda';

const client = new SES({ region: process.env.CDK_DEFAULT_REGION })
const s3client = new S3Client({ region: process.env.CDK_DEFAULT_REGION });
const SES_EMAIL_FROM = process.env.EMAIL_FROM;

function streamToString(stream):string {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

export async function handler(
  event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> {

  const bucketName = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

  console.log('bucketName', bucketName)
  console.log('key', key)

  const input = {Bucket: bucketName, Key:key}
  const s3command = new GetObjectCommand(input);

  const {Body} = await s3client.send(s3command);
  const content = await streamToString(Body)

  console.log('Body', Body)
  console.log('content', content)
  
  const [email,subject, body] = content.split(',')

 console.log('email', email)
 console.log('subject', subject)
 console.log('body', body)

  const command = {

    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: `<h1>${body}</h1>`,
        },
        Text: {
          Charset: 'UTF-8',
          Data: body,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: subject,
      },
    },
    Source: SES_EMAIL_FROM,
  }

  const response = await client.sendEmail(command)

  console.log('response', response)

  return Promise.resolve({statusCode: 200, body: 'hello world'})
}
