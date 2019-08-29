// Load in dev process.env vars if in dev
if (process.env.NODE_ENV !== 'production') require('dotenv').config();
console.log(process.env.MAILGUN_API_KEY);
const fs = require('fs');
const Mailgun = require('mailgun-js');
const Sentry = require('@sentry/node');

// Mapper dictionary's to make code prettier
const templateMapper = {"reset": "../EmailTemplates/ResetPassword.html",
    "verify": "../EmailTemplates/VerifyUser.html"
};
const findMapper = {"reset": /TOKEN/gi, "verify": /TOKEN/gi};

let emailTokenReplace = function (token, file) {
    const template = fs.readFileSync(templateMapper[file], 'utf8');
    const email = template.replace(findMapper[file], token);
    return email;
};
const mailgun = new Mailgun({apiKey: process.env.MAILGUN_API_KEY,  domain: "mail.ideahack.club"});
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
    sendData: function(sendTo, emailType, token) {
        let subject = null;
        console.log(emailType === "reset");
        if (emailType === "reset") {let subject = "💡 IdeaHackers Reset Password ❕";}
        else if (emailType === "verify") {let subject = "💡 Verify IdeaHackers Account ❕"}
        else {console.log("dasd"); return "Error: Invalid template type"}
        const email = {
            from: 'IdeaHackers no-reply <no-reply@ideahack.club>',
            to: sendTo,
            subject: subject,
            html: emailTokenReplace(token, emailType)
        };
        return email;
    },
    sendEmail: function (data) {
        mailgun.messages().send(data, function(err, body) {
            console.log(err);
            // Sentry.captureException(err);
            console.log(body);
            });
    }
};