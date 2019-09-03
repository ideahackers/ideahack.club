// Load in dev process.env vars if in dev
if (process.env.NODE_ENV !== 'production') require('dotenv').config();
const fs = require('fs');
const Mailgun = require('mailgun-js');
const Sentry = require('@sentry/node');

emailTokenReplace = function (token, file) {
    const actualFilePath = __dirname + file;
    const template = fs.readFileSync(actualFilePath, 'utf8');
    const emailToSend = template.replace(/TOKEN/gi, token);
    return emailToSend;
};

const mailgun = new Mailgun({apiKey: process.env.MAILGUN_API_KEY, domain: "mail.ideahack.club"});
module.exports = {
    /*
    {optional param} sendFrom String The "Sent From" address The user sees
         defaults to IdeaHackers no-reply <no-reply@ideahack.club>
    {param} sendTo String The address to send email too
    {param} subject String Subject Line
    {param} emailType String [either "reset" or "verify"] which specifys the template
    {param} token String token to populate the template with which is a link

    EXAMPLE:
    const email = require('../helpers/email'); // require global function file
    const data = email.sendData("IdeaHackers no-reply <no-reply@ideahack.club>",
    "noah.trauben@gmail.com", "testing 123 :)", "reset", "test12dasd"); // Create Email
    email.sendEmail(data); // Send Email!
    */

    sendData: function (sendTo, file, token, subject, local) {
        if (local) {
            const fullLink = "http://" + process.env.HOST + "/user/" + token;
            let email = {
                from: 'IdeaHackers no-reply <no-reply@ideahack.club>',
                to: sendTo,
                subject: subject,
                html: emailTokenReplace(fullLink, file)
            };
            return email;
        }
        else {
            let email = {
                from: 'IdeaHackers no-reply <no-reply@ideahack.club>',
                to: sendTo,
                subject: subject,
                html: emailTokenReplace(token, file)
            };
            return email;

        }

    },

    sendEmail: function (data) {
        mailgun.messages().send(data, function (err, body) {
            if (err) Sentry.captureMessage(err, body);
        });
    }
};