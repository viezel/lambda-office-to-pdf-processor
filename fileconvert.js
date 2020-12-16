'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const http = require('http');
const aws = require('aws-sdk');
const s3 = new aws.S3();

const { convertTo } = require('@shelf/aws-lambda-libreoffice');
const API_KEY = 'X-API-KEY';

function downloadFile(url, filePath) {
    const proto = !url.charAt(4).localeCompare('s') ? https : http;
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filePath);
        let fileInfo = null;
        const request = proto.get(url, response => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            fileInfo = {
                mime: response.headers['content-type'],
                size: parseInt(response.headers['content-length'], 10),
            };
            response.pipe(file);
        });
        file.on('finish', () => resolve(fileInfo));
        request.on('error', err => {
            fs.unlink(filePath, () => reject(err));
        });
        file.on('error', err => {
            fs.unlink(filePath, () => reject(err));
        });
        request.end();
    });
}

/**
 * HTTP Handler from URL
 * @param event
 * @param context
 * @param callback
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 */
exports.httpHandlerFromURL = function (event, context, callback) {
    // Validate API Auth
    if( undefined === event.headers[API_KEY] || event.headers[API_KEY] !== process.env.API_KEY) {
        return callback(null, {
            statusCode: 401,
            body: JSON.stringify({error:'Authentication credentials were missing or incorrect'})
        });
    }

    // parse http payload
    let data = JSON.parse(event.body);
    const url = data.url,
        file = url.split('/').pop(),
        bucket = process.env.BUCKET,
        workdir = os.tmpdir(),
        inputFile = path.join(workdir, file),
        outputFile = inputFile.replace(/\.[^.]+$/, '.pdf'),
        outputKey = 'conversions/' + Math.round(new Date().getTime()).toString() + "/" + file.replace(/\.[^.]+$/, '.pdf');

    // Validate http payload
    if (!url || !file) {
        return callback(null, { statusCode: 422, body: JSON.stringify({error:'Validation error'}) });
    }

    // 1. download file from URL
    downloadFile(url, inputFile)
        // 2. convert to PDF
        .then(() => convertTo(file, 'pdf'))
        // 3. upload converted file to S3
        .then(() => {
            return s3.upload({
                Bucket: bucket,
                Key: outputKey,
                Body: fs.createReadStream(outputFile),
                ACL: 'public-read',
                CacheControl: "max-age=314496000,immutable",
                ContentType: 'application/pdf'
            }).promise();
        })
        // 4. create a http response
        .then(function (data) {
            context.succeed({
                statusCode: 200,
                body: JSON.stringify({
                    output_url: data.Location
                }),
                headers: {'Content-Type': 'application/json'}
            });
        })
        .catch(function(error) {
            console.error(error);
            context.fail({
                statusCode: 500,
                body: JSON.stringify({ error: error}),
                headers: {'Content-Type': 'application/json'}
            });
        });
};