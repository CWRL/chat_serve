const { Server } = require('socket.io')
const db = require('../db/index')
const jwt = require('jsonwebtoken')
const config = require('../config.json')
const fs=require('fs')
const path = require('path')
const init_io = (server) => {
    const io = new Server(server, {
        cors: {
            origin: '*',
            allowedHeaders: ["my-custom-header","token"],
            credentials: true,
        },
        serveClient: false,
        maxHttpBufferSize: 1e8,
        // connectionStateRecovery: {
        //     maxDisconnectionDuration: 2 * 60 * 1000,
        //     skipMiddlewares: true,
        // }
    })
    const shebeixinxi = (userAgent) => {
        let bIsIpad = userAgent.match(/ipad/i) == "ipad";
        let bIsIphoneOs = userAgent.match(/iphone os/i) == "iphone os";
        let bIsMidp = userAgent.match(/midp/i) == "midp";
        let bIsUc7 = userAgent.match(/rv:1.2.3.4/i) == "rv:1.2.3.4";
        let bIsUc = userAgent.match(/ucweb/i) == "ucweb";
        let bIsAndroid = userAgent.match(/android/i) == "android";
        let bIsCE = userAgent.match(/windows ce/i) == "windows ce";
        let bIsWM = userAgent.match(/windows mobile/i) == "windows mobile";
        if (bIsIpad || bIsIphoneOs || bIsMidp || bIsUc7 || bIsUc || bIsAndroid || bIsCE || bIsWM) {
            return "phone";
        } else {
            return "pc";
        }
    }
    const savemessage = (user, message, socket) => {
        const mysql = 'INSERT INTO message(fromuser,message,time) VALUES(?,?,?)'
        const time = new Date().getTime()
        db.run(mysql, [user.ip,JSON.stringify(message), time], (err, rows) => {
            if (err) {
                socket.to(socket.id).emit('savemessage', err.message)
                return
            }
        })
    }
    const getmessage = (socket,index) => {
        const mysql = 'SELECT * FROM message ORDER BY time DESC LIMIT 13 OFFSET ?'
        db.all(mysql,[index*13], (err, rows) => {
            if (err) {
                socket.emit('getmessage', err.message)
                return
            }
            let valuesmessage= rows.map((item)=>{
               item.message=JSON.parse(item.message)
               return item
            })
            valuesmessage.reverse()
            socket.emit('getmessage',valuesmessage)
        })
    }
    const loginsuccess = (user, socket) => {
        const data = {
            user: user,
            token: jwt.sign({ ip: user.ip, id: user.id }, config.secret)
        }
        socket.broadcast.emit('system', user, 'join')
        socket.on('message',(message) => {
            let ima_name=new Date().getTime()
            if(message.file.length>0){
                message.file.forEach((item,index)=>{
                    const type=item.split('@type:')[1]
                    const file_path=path.join(__dirname+'/..'+'/image_save/'+ima_name+index+`.${type}`)
                    if(type==='png' || type==='jpg'){
                        base64=item.replace(/^data:image\/\w+;base64,/, "").split('@name:')[0]
                    message.file[index]='http://192.168.10.2:5566/imageSave/'+ima_name+index+`.${type}`+'@name:'+item.split('@name:')[1].split('@type:')[0]+'@data:'+'http://192.168.10.2:5566/imageSave/'+ima_name+index+`.${type}`+'@type:'+type
                    }
                    else{
                        base64=item.split('@data:')[1].split('@type:')[0]
                        message.file[index]=item.split('@name:')[0]+'@name:'+item.split('@name:')[1].split('@data:')[0]+'@data:'+'http://192.168.10.2:5566/imageSave/'+ima_name+index+`.${type}`+'@type:'+type
                    }
                    const file_buffer=new Buffer(base64,'base64')
                    fs.writeFileSync(file_path,file_buffer)
                })
            }
            socket.broadcast.emit('sendmessage', message, user)
            savemessage(user, message, socket)
        })
        socket.on('getmanymessage',(index)=>{
            getmessage(socket,index)
        })
        let m = io.to(socket.id).emit('loginsuccess', data)
        getmessage(socket,0)
        socket.user = user
    }
    const getOnlineUsers = async () => {
        const users = [
            {
                id: "group_001",
                name: "群聊天室",
                type: "group"
            }
        ];
        const clients = await io.fetchSockets();
        clients.forEach((item) => {
            if (item.user) {
                users.push(item.user)
            }
        })
        return users;
    }
    const isHaveName = async (ip) => {
        const users = await getOnlineUsers();
        return users.some(item => item.ip === ip)
    }
    const saveuser = (user, socket) => {
        const mysql = 'SELECT * FROM user WHERE user.username=?'
        db.all(mysql, [user.ip], (err, rows) => {
            if (err) {
                socket.to(user.id).emit('saveuser', err.message)
                return
            }
            if (rows.length === 1) {
                const mysql = 'UPDATE user SET state=? WHERE user.username=?'
                db.run(mysql, [1, user.ip], (err, rows) => {
                    if (err) {
                        socket.to(user.id).emit('saveuser', err.message)
                        return
                    }
                    socket.emit('saveuser', `${user.ip}已经加入群聊`)
                })
                return
            }
            const mysql = 'INSERT INTO user(username,state) VALUES(?,?)'
            db.run(mysql, [user.ip, 1], (err, rows) => {
                if (err) {
                    socket.to(user.id).emit('saveuser', err.message)
                    return
                }
                socket.emit('saveuser', `${user.ip}已经加入群聊`)
            })
        })
    }
    const loginout = (user, socket) => {
        const mysql = 'SELECT * FROM user WHERE user.username=? AND user.state=1'
        db.all(mysql, [user.ip], (err, rows) => {
            if (err) {
                socket.to(user.id).emit('loginoutsibai', err.message)
                return
            }
            if (rows.length == 0) {
                socket.to(user.id).emit('loginoutsibai', '不要重复退出')
                return
            }
            const mysql = 'UPDATE user SET state=? WHERE user.username=?'
            db.run(mysql, [0, user.ip], (err, rows) => {
                if (err) {
                    socket.to(user.id).emit('loginoutsibai', err.message)
                    return
                }
                socket.broadcast.emit('loginoutchengon', `${user.ip}已经退出群聊`)
                delete socket.user
            })
        })
    }
    const updateuser=(user,ip)=>{
        const mysql='SELECT * FROM user WHERE user.username=?'
        db.all(mysql,[ip],(err,rows)=>{
            if(err){
                console.log(err.message)
            }
            if(rows.length!==0){
                ip=ip+'('+(Math.random()*10000+1).toString()+')'
            }
            const mysql='UPDATE user SET username=? WHERE user.username=?'
            db.run(mysql,[ip,user.ip])
        })
    }
    const login = async (user, socket, isreconnect) => {
        let ip = socket.handshake.address.replace(/::ffff:/, '')
        if(isreconnect){
            if(ip!==user.ip){
                updateuser(user,ip)
            }
        }
        const headers = socket.handshake.headers
        const realIP = headers['x-forwarded-for'];
        ip = realIP ? realIP : ip;
        const deverseType = shebeixinxi(headers['user-agent'].toLowerCase())
        user.ip =ip
        user.deverseType = deverseType
        user.type = 'user'
        if (isreconnect) {
            loginsuccess(user, socket)
            console.log(`用户${user.ip}重新登录了`)
        }
        else {
            const flag = await isHaveName(user.ip)
            if (!flag) {
                user.id = socket.id
                user.time = new Date().getTime()
                loginsuccess(user, socket)
                saveuser(user, socket)
            }
            else {
                socket.emit('loginFail', '登录失败,昵称已存在!')
            }
        }
    }
    io.on('connection', (socket) => {
        console.log('a user has connect')
        const token = socket.handshake.headers.token;
        let decode = null;
        if (token) {
            try {
                decode = jwt.verify(token, config.secret)
            } catch (error) {
                decode = null
            }
        }
        decode={
            ip:decode?.ip,
        }
        let user = decode? decode:{}
        socket.on('disconnect', (reason) => {
            if (socket.user && socket.user.ip) {
                socket.emit('loginout', socket.user)
                loginout(socket.user, socket)
            }
            console.log('a user has disconnect')
        })
        if (user && user.ip) {
            login(user, socket, true)
        }
        else {
            login(user, socket, false)
        }
    })
}
module.exports = init_io