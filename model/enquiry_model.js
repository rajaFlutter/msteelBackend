const mongoose = require("mongoose");

const schemaType = mongoose.Schema.Types;

const enquirySchema = mongoose.Schema({
    user: {
        userId: {
            type: schemaType.ObjectId,
            ref: "user",
        },
        enquiry: {
            type: schemaType.String
        },
        images:
        {
            type: schemaType.String
        },
        enquiryDate: {
            type: schemaType.Date
        }
    },
    admin: {
        adminId: {
            type: schemaType.ObjectId,
            ref: "admin",
        },
        enquiry: {
            type: schemaType.String,
        },
        images:
        {
            type: schemaType.String,
        },
        enquiryDate: {
            type: schemaType.Date
        }

    }
});

const enquiryModel = mongoose.model("enquiry", enquirySchema);

module.exports = enquiryModel;