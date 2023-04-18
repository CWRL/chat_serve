const config=require('../config.json')
const {expressjwt:expressJwt}=require('express-jwt')
const jwt=()=>{
    const secret=config.secret
    return expressJwt({
        secret,
        algorithms:['HS256'],
        allowCredentials:true,
        onExpired: async (req, err) => {
            if (new Date() - err.inner.expiredAt < 36000) { return;}
            throw err;
        },
    }).unless({
        path:[/^(\/users)/]
    })
}
module.exports=jwt