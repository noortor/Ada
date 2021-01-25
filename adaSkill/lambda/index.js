const Alexa = require('ask-sdk-core');
const axios = require('axios');
const moment = require("moment");
const Util = require('./util');

const serviceAccount = require("firebase.json");
const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://ada-engage.firebaseio.com"
})
const DB = admin.firestore();

const LECTURE = "lecture";
const STUDY = "study";
const BREAK = "break";

const timerItem = {
    "duration": "",
    "timerLabel": "",
    "creationBehavior": {
        "displayExperience": {
            "visibility": "VISIBLE"
        }
    },
    "triggeringBehavior": {
        "operation": {
            "type": "ANNOUNCE",
            "textToAnnounce": [
                {
                    "locale": "en-US",
                    "text": ""
                }
            ]
        },
        "notificationConfig": {
            "playAudible": false
        }
    }
};

const STREAMS = [
    {
        token: '1',
        url: 'https://streamingv2.shoutcast.com/100-CHILL?lang=en-US%2cen%3bq%3d0.9',
        metadata: {
            title: 'Music',
            subtitle: 'Chill music to study to',
            art: {
                sources: [
                    {
                        contentDescription: 'example image',
                        url: 'https://s3.amazonaws.com/cdn.dabblelab.com/img/audiostream-starter-512x512.png',
                        widthPixels: 512,
                        heightPixels: 512,
                    },
                ],
            },
            backgroundImage: {
                sources: [
                    {
                        contentDescription: 'example image',
                        url: 'https://s3.amazonaws.com/cdn.dabblelab.com/img/wayfarer-on-beach-1200x800.png',
                        widthPixels: 1200,
                        heightPixels: 800,
                    },
                ],
            },
        },
    },
];

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {

        const { permissions } = handlerInput.requestEnvelope.context.System.user;

        if (!permissions) {

            handlerInput.responseBuilder
                .speak("This skill needs permission to access your timers.")
                .addDirective({
                    type: "Connections.SendRequest",
                    name: "AskFor",
                    payload: {
                        "@type": "AskForPermissionsConsentRequest",
                        "@version": "1",
                        "permissionScope": "alexa::alerts:timers:skill:readwrite"
                    },
                    token: ""
                });

        } else {
            let speakerOutput = "Welcome to Ada! Would you like to start a lecture, study session, or discussion?";
            handlerInput.responseBuilder
                .speak(speakerOutput)
                .reprompt(speakerOutput)
        }

        return handlerInput.responseBuilder
            .getResponse();

    }
};

const LectureTimeHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'LectureTimeIntent';
    },
    handle(handlerInput) {
        const time = handlerInput.requestEnvelope.request.intent.slots.lectureTime.value;
        return TimerHandler.handle(handlerInput, time, LECTURE);
    }
};

const StudyTimeHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'StudyTimeIntent';
    },
    handle(handlerInput) {
        const time = handlerInput.requestEnvelope.request.intent.slots.studyTime.value;
        const stream = STREAMS[0];

        handlerInput.responseBuilder
            .speak(`Setting the mood`)
            .addAudioPlayerPlayDirective('REPLACE_ALL', stream.url, stream.token, 0, null, stream.metadata);

        TimerHandler.handle(handlerInput, time, STUDY);

        return handlerInput.responseBuilder.getResponse();

    }
};

const PlaybackStoppedIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'PlaybackController.PauseCommandIssued'
            || handlerInput.requestEnvelope.request.type === 'AudioPlayer.PlaybackStopped';
    },
    handle(handlerInput) {
        handlerInput.responseBuilder
            .addAudioPlayerClearQueueDirective('CLEAR_ALL')
            .addAudioPlayerStopDirective();

        return handlerInput.responseBuilder
            .getResponse();
    },
};


const TimerHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'TimerStartIntent';
    },
    async handle(handlerInput, time, sessionType) {
        const readableTime = Util.convertISO8601ToReadableText(time);
        timerItem.duration = time;
        timerItem.timerLabel = sessionType;
        timerItem.triggeringBehavior.operation.textToAnnounce[0].text = `${sessionType} 
            time is over. Would you like to start a discussion break?`;
        const speakOutput = `Starting ${sessionType} time for ${readableTime}`;
        const options = {
            headers: {
                "Authorization": `Bearer ${Alexa.getApiAccessToken(handlerInput.requestEnvelope)}`,
                "Content-Type": "application/json"
            }
        };
        await axios.post('https://api.amazonalexa.com/v1/alerts/timers', timerItem, options)
            .then(response => {
                handlerInput.responseBuilder
                    .speak(speakOutput);
            })
            .catch(error => {
                console.log(error);
            });
        return handlerInput.responseBuilder
            .getResponse();
    }
};

const StartDiscussionIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'StartDiscussionIntent';
    },
    async handle(handlerInput) {
        const question = 'Did you know that?'
        const snapshot = await DB.collection('diversity').where('test', "==", true).get()
        console.log(snapshot)
        //const snapshot =  await DB.collection('diversity').doc(1).get();
        var speakOutput = '';
        // if(!snapshot.exists){
        //      speakOutput = 'Error';
        // }
        //else{
        const data = snapshot.data();
        console.log(data);
        speakOutput = data;
        //}
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
const ConnectionsResponseHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'Connections.Response';
    },
    handle(handlerInput) {
        const { permissions } = handlerInput.requestEnvelope.context.System.user;

        const status = handlerInput.requestEnvelope.request.payload.status;

        if (!permissions) {
            return handlerInput.responseBuilder
                .speak("I didn't hear your answer. This skill requires your permission.")
                .addDirective({
                    type: "Connections.SendRequest",
                    name: "AskFor",
                    payload: {
                        "@type": "AskForPermissionsConsentRequest",
                        "@version": "1",
                        "permissionScope": "alexa::alerts:timers:skill:readwrite"
                    },
                    token: "user-id-could-go-here"
                })
                .getResponse();
        }
        switch (status) {
            case "ACCEPTED":
                handlerInput.responseBuilder
                    .speak("Welcome to Ada! Would you like to start a lecture, study session, or discussion break?")
                    .reprompt("Would you like to start a lecture, study session, or discussion break?")
                break;
            case "DENIED":
                handlerInput.responseBuilder
                    .speak("Without permissions, I can't set a timer. So I guess that's goodbye.");
                break;
            case "NOT_ANSWERED":
                break;
            default:
                handlerInput.responseBuilder
                    .speak("Now that we have permission to set a timer. Would you like to start?")
                    .reprompt('would you like to start?');
        }
        return handlerInput.responseBuilder
            .getResponse();
    }
};

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Goodbye!';
        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};

const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;
        console.log(Alexa.getIntentName(handlerInput.requestEnvelope))
        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.stack}`);
        const speakOutput = `Sorry, I had trouble doing what you asked. Please try again.`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        LectureTimeHandler,
        StudyTimeHandler,
        PlaybackStoppedIntentHandler,
        TimerHandler,
        StartDiscussionIntentHandler,
        ConnectionsResponseHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler, // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    )
    .addErrorHandlers(
        ErrorHandler,
    )
    .lambda();
