const mongoose = require("mongoose");

const schemaType = mongoose.Schema.Types;

let paymentSchema = mongoose.Schema({
    paymentDate: {
        type: schemaType.String,
    },
    paymentTime: {
        type: schemaType.String,
    },
    fullName: {
        type: schemaType.String,
    },
    number: {
        type: schemaType.Number,
    },
    productName: {
        type: schemaType.String,
    },
    netPrice: {
        type: schemaType.Number,
    },
    orderQuantity: {
        type: schemaType.Number,
    },
    totalOutstandingPayment: {
        type: schemaType.Number,
    },
    totalPaidAmount: {
        type: schemaType.Number,
    },
    orderNumber: {
        type: schemaType.Number,
    }
});

const paymentModel = mongoose.model("payment", paymentSchema);

module.exports = paymentModel;