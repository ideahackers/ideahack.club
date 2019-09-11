// User schema
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Create Schema

const UserSchema = new Schema({
    nameFirst: {
        type: String,
        required: true
    },
    nameLast: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    academicYear: {
        type: String,
        required: true
    },
    major: {
        type: String,
        required: false
    },
    reasonForJoining: {
        type: String,
        required: false
    },
    portfilioURL: {
        type: String,
        required: false
    },
    resumeURL: { // resume will save file path as string to db
        type: String,
        required: false
    },
    date: {
        type: Date,
        default: Date.now
    }
});

mongoose.model('register', UserSchema);