const AWS = require('aws-sdk');

const s3SigV4Client = new AWS.S3({
    signatureVersion: 'v4',
    region: process.env.S3_PERSISTENCE_REGION
});

module.exports.getS3PreSignedUrl = function getS3PreSignedUrl(s3ObjectKey) {

    const bucketName = process.env.S3_PERSISTENCE_BUCKET;
    const s3PreSignedUrl = s3SigV4Client.getSignedUrl('getObject', {
        Bucket: bucketName,
        Key: s3ObjectKey,
        Expires: 60 * 1 // the Expires is capped for 1 minute
    });
    console.log(`Util.s3PreSignedUrl: ${s3ObjectKey} URL ${s3PreSignedUrl}`);
    return s3PreSignedUrl;

}

module.exports.convertISO8601ToReadableText = function convertISO8601ToReadableText(iso8601Duration) {
    const rawTimeJSON = parseISO8601Duration(iso8601Duration);
    const timeJSON = filteredTimeJSON(rawTimeJSON)
    const timeUnitArray = Object.keys(timeJSON);
    let output = "";
    for (let timeArrIndex = 0; timeArrIndex < timeUnitArray.length; timeArrIndex++) {
        let timeUnit = timeUnitArray[timeArrIndex];
        const timeNum = timeJSON[timeUnit];
        if (timeNum !== 0) {
            if (timeArrIndex === timeUnitArray.length - 1 && timeArrIndex !== 0) {
                output += "and ";
            }
            if (timeNum === '1') {
                timeUnit = timeUnit.substring(0, timeUnit.length - 1);
            }
            output += timeNum + " ";
            output += timeUnit + ", ";
        }
    }
    output = output.substring(0, output.length - 2);
    return output;
}


var iso8601DurationRegex = /(-)?P(?:([.,\d]+)Y)?(?:([.,\d]+)M)?(?:([.,\d]+)W)?(?:([.,\d]+)D)?T(?:([.,\d]+)H)?(?:([.,\d]+)M)?(?:([.,\d]+)S)?/;

function parseISO8601Duration(iso8601Duration) {
    var matches = iso8601Duration.match(iso8601DurationRegex);

    return {
        years: matches[2] === undefined ? 0 : matches[2],
        months: matches[3] === undefined ? 0 : matches[3],
        weeks: matches[4] === undefined ? 0 : matches[4],
        days: matches[5] === undefined ? 0 : matches[5],
        hours: matches[6] === undefined ? 0 : matches[6],
        minutes: matches[7] === undefined ? 0 : matches[7],
        seconds: matches[8] === undefined ? 0 : matches[8]
    };
}

function filteredTimeJSON(timeJSON) {
    for (let key in timeJSON) {
        if (timeJSON[key] === 0) {
            delete timeJSON[key];
        }
    }
    return timeJSON;
}