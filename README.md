# File Processor

Convert Office (docx, pptx, xlsx) to PDF at scale. 

Support for **custom fonts** to conversion. See the `fonts` folder for supported fonts. Add your own to support even more.

## Dependencies

* Serverless Framework
* AWS Lambda
* LibreOffice 6.4 Lambda Layer (https://github.com/shelfio/libreoffice-lambda-layer)


## Config

Uses the `serverless-config.dev.json` or the `serverless-config.prod.json` to handle different AWS resources, such as buckets, SQS etc.

Uses SSM Parameter Store (console.aws.amazon.com/systems-manager/parameters) to keep your API-Key safe. Visit the AWS console to setup your parameters.

You have to create `FileProcessor/dev/ApiKey`

## Usage

Once deployed, you can hit the api like this:

```bash
curl --location 
--request POST 'https://someurl.execute-api.eu-west-1.amazonaws.com/dev/api/v1/file/convert' \
--header 'X-API-KEY: my-custom-api-key' \
--header 'Content-Type: application/json' \
--data-raw '{
    "url": "https://my-website.com/path/to/doc.pptx"
}'
```

Response:

```json
{
    "output_url": "https://office-file-processor-dev.s3.eu-west-1.amazonaws.com/conversions/1608127441661/doc.pdf"
}
```

## DEPLOYMENT

### Deploy Dev

```bash
serverless deploy --stage dev --verbose
```

### Deploy Production

```bash
serverless deploy --stage prod --verbose
```
