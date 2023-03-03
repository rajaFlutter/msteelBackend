const mongoose = require("mongoose");

const schemaType = mongoose.Schema.Types;

let notificationSchema = mongoose.Schema({
    userData: {
        type: schemaType.ObjectId,
        ref: "user"
    },
    msg: {
        type: schemaType.String
    }
});

const notificationModel = mongoose.model("notifications", notificationSchema);

module.exports = notificationModel;