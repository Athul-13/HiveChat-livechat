const { RtcTokenBuilder, RtcRole } = require("agora-access-token");
require("dotenv").config();

const generateAgoraToken = (channelName, uid = 0, role = RtcRole.PUBLISHER, expireTime = 3600) => {
    const appID = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
    
    if (!appID || !appCertificate) {
        throw new Error("Agora credentials are missing!");
    }

    const expirationTimestamp = Math.floor(Date.now() / 1000) + expireTime;
    return RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, channelName, uid, role, expirationTimestamp);
};

module.exports = generateAgoraToken;