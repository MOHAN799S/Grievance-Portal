const { Resend } = require("resend");
const api = process.env.RESEND_API_KEY
const resend = new Resend(api);

module.exports = { resend };