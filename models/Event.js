// User Login Schema
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const moment = require('moment');

// Create Schema

const UserSchema = new Schema({
    title: {
        type: String,
        default: "Untitled Event",
        required: true
    },
    creator: {
        type: mongoose.SchemaTypes.ObjectId,
        ref: 'User',
        required: true
    },
    dateStart: {
        type: Date,
        default: Date.now(),
        required: true
    },
    dateEnd: {
        type: Date,
        default: moment(Date.now).add(30,'m').toDate(),
        required: true
    },
    tags: {
        type: [String]
    },
    location: {
        type: String,
        required: true
    },
    cover_url: {
        type: String,
        default: 'https://res.cloudinary.com/idea-hackers/image/upload/v1567470849/events/default_pb7uqb.png',
        required: true
    },
    body: {
        type: String,
        default: "Say some stuff about your event.",
        required: true
    }
});

mongoose.model('Event', UserSchema);